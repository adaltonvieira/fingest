import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreateChargeDto } from './dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('charges')
  createCharge(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateChargeDto) {
    return this.service.createCharge(user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('charges/by-transaction/:transactionId')
  findByTransaction(
    @CurrentUser() user: AuthenticatedUser,
    @Param('transactionId') transactionId: string,
  ) {
    return this.service.findByTransaction(user.userId, transactionId);
  }

  /**
   * Endpoint público — chamado pela própria InfinitePay, não pelo frontend.
   * Não tem (nem pode ter) proteção por JWT, já que quem chama é o servidor
   * deles. A validação real acontece consultando o /payment_check oficial
   * dentro do service, em vez de confiar apenas no corpo recebido aqui.
   */
  @Post('webhook')
  handleWebhook(@Body() payload: any) {
    return this.service.handleWebhook(payload);
  }
}
