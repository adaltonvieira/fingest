import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateChargeDto, PaymentMethodDto } from './dto/payment.dto';

// Endpoints oficiais da InfinitePay (Checkout Integrado).
// Referência: https://ajuda.infinitepay.io/pt-BR/articles/10766888
const INFINITEPAY_LINKS_URL = 'https://api.checkout.infinitepay.io/links';
const INFINITEPAY_PAYMENT_CHECK_URL = 'https://api.checkout.infinitepay.io/payment_check';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createCharge(userId: string, dto: CreateChargeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const handle =
      dto.method === PaymentMethodDto.PIX ? user.infinitePayHandlePF : user.infinitePayHandlePJ;

    if (!handle) {
      throw new BadRequestException(
        dto.method === PaymentMethodDto.PIX
          ? 'Configure o handle InfinitePay (Pessoa Física) em Segurança antes de gerar cobranças Pix.'
          : 'Configure o handle InfinitePay (Pessoa Jurídica) em Segurança antes de gerar cobranças de cartão.',
      );
    }

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });
    if (!transaction || transaction.userId !== userId) {
      throw new ForbiddenException('Lançamento inválido');
    }
    if (transaction.type !== 'RECEITA') {
      throw new BadRequestException('Só é possível gerar cobrança para uma receita');
    }
    if (transaction.status !== 'PENDENTE') {
      throw new BadRequestException('Este lançamento já não está mais pendente');
    }

    // A InfinitePay trabalha com valores em centavos.
    const amountInCents = Math.round(Number(transaction.amount) * 100);

    const charge = await this.prisma.paymentCharge.create({
      data: {
        userId,
        transactionId: transaction.id,
        method: dto.method as any,
        amount: transaction.amount,
        handle,
      },
    });

    const webhookUrl = `${process.env.BACKEND_PUBLIC_URL ?? ''}/payments/webhook`;

    try {
      const response = await fetch(INFINITEPAY_LINKS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle,
          webhook_url: webhookUrl,
          order_nsu: charge.id,
          items: [
            {
              quantity: 1,
              price: amountInCents,
              description: transaction.description,
            },
          ],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Falha ao criar cobrança na InfinitePay: ${JSON.stringify(data)}`);
        throw new BadRequestException('Não foi possível gerar a cobrança. Tente novamente.');
      }

      // O nome exato dos campos de resposta (url do checkout, slug) deve ser
      // confirmado contra a resposta real da API ao testar com credenciais
      // válidas — aqui tratamos algumas variações prováveis defensivamente.
      const paymentUrl = data.url ?? data.payment_url ?? data.checkout_url ?? null;
      const slug = data.slug ?? data.id ?? null;

      const updated = await this.prisma.paymentCharge.update({
        where: { id: charge.id },
        data: {
          paymentUrl,
          externalId: slug,
        },
      });

      return updated;
    } catch (err) {
      this.logger.error('Erro ao chamar API da InfinitePay', err as Error);
      // Mantém o registro da cobrança como PENDENTE sem link — permite
      // reprocessar depois, em vez de perder o registro.
      throw new BadRequestException(
        'Não foi possível conectar à InfinitePay no momento. Tente novamente em instantes.',
      );
    }
  }

  /**
   * Recebe o webhook da InfinitePay. Por segurança, não confiamos cegamente
   * no corpo recebido — usamos os identificadores nele contidos para
   * consultar o endpoint oficial /payment_check e confirmar o status real
   * antes de marcar qualquer coisa como paga.
   */
  async handleWebhook(payload: any) {
    const orderNsu: string | undefined = payload?.order_nsu ?? payload?.orderNsu;
    if (!orderNsu) {
      this.logger.warn(`Webhook recebido sem order_nsu: ${JSON.stringify(payload)}`);
      return { received: true };
    }

    const charge = await this.prisma.paymentCharge.findUnique({ where: { id: orderNsu } });
    if (!charge) {
      this.logger.warn(`Webhook referencia cobrança desconhecida: ${orderNsu}`);
      return { received: true };
    }
    if (charge.status === 'PAGO') {
      return { received: true, alreadyProcessed: true };
    }

    try {
      const checkResponse = await fetch(INFINITEPAY_PAYMENT_CHECK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: charge.handle,
          order_nsu: charge.id,
          transaction_nsu: payload?.transaction_nsu ?? payload?.transactionNsu,
          slug: charge.externalId,
        }),
      });
      const checkData = await checkResponse.json();

      if (!checkData?.paid) {
        this.logger.log(`Pagamento ainda não confirmado para cobrança ${charge.id}`);
        return { received: true, paid: false };
      }

      await this.markChargeAsPaid(charge.id);
      return { received: true, paid: true };
    } catch (err) {
      this.logger.error('Erro ao validar pagamento via payment_check', err as Error);
      return { received: true, error: true };
    }
  }

  private async markChargeAsPaid(chargeId: string) {
    const charge = await this.prisma.paymentCharge.findUnique({ where: { id: chargeId } });
    if (!charge || charge.status === 'PAGO') return;

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentCharge.update({
        where: { id: chargeId },
        data: { status: 'PAGO', paidAt: new Date() },
      });

      const transaction = await tx.transaction.findUnique({
        where: { id: charge.transactionId },
      });
      if (!transaction || transaction.status !== 'PENDENTE') return;

      await tx.transaction.update({
        where: { id: transaction.id },
        data: { status: 'RECEBIDO', paidAt: new Date() },
      });

      await tx.account.update({
        where: { id: transaction.accountId },
        data: { currentBalance: { increment: Number(transaction.amount) } },
      });
    });

    this.logger.log(`Cobrança ${chargeId} confirmada como paga`);
  }

  async findByTransaction(userId: string, transactionId: string) {
    return this.prisma.paymentCharge.findFirst({
      where: { userId, transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
