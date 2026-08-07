import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCreditCardDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  limit: number;

  @ApiProperty({ description: 'Dia do mês em que a fatura fecha (1-28)' })
  @IsInt()
  @Min(1)
  @Max(28)
  closingDay: number;

  @ApiProperty({ description: 'Dia do mês em que a fatura vence (1-28)' })
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;
}

export class UpdateCreditCardDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  closingDay?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ description: 'Data da compra (YYYY-MM-DD)' })
  @IsString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false, description: 'Número de parcelas (1 = à vista)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;
}

export class PayInvoiceDto {
  @ApiProperty({ description: 'Conta de onde o valor da fatura será debitado' })
  @IsString()
  accountId: string;
}
