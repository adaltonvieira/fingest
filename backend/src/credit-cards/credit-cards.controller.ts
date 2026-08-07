import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreditCardsService } from './credit-cards.service';
import {
  CreateCreditCardDto,
  CreatePurchaseDto,
  PayInvoiceDto,
  UpdateCreditCardDto,
} from './dto/credit-card.dto';

@ApiTags('credit-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly service: CreditCardsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCreditCardDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.userId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.userId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateCreditCardDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.archive(user.userId, id);
  }

  @Post(':id/purchases')
  addPurchase(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.service.addPurchase(user.userId, id, dto);
  }

  @Get(':id/invoices')
  listInvoices(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.listInvoices(user.userId, id);
  }

  @Get(':id/invoices/:invoiceId')
  getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.service.getInvoice(user.userId, id, invoiceId);
  }

  @Post(':id/invoices/:invoiceId/pay')
  payInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.service.payInvoice(user.userId, id, invoiceId, dto);
  }
}
