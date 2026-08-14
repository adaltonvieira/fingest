import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export enum PaymentMethodDto {
  PIX = 'PIX',
  CARD = 'CARD',
}

export class CreateChargeDto {
  @ApiProperty({ description: 'ID do lançamento (receita pendente) a ser cobrado' })
  @IsString()
  transactionId: string;

  @ApiProperty({ enum: PaymentMethodDto, description: 'PIX usa a conta PF, CARD usa a conta PJ' })
  @IsEnum(PaymentMethodDto)
  method: PaymentMethodDto;
}
