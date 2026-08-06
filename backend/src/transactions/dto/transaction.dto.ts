import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export enum TransactionTypeDto {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export enum TransactionStatusDto {
  PAGO = 'PAGO',
  RECEBIDO = 'RECEBIDO',
  PENDENTE = 'PENDENTE',
  CANCELADO = 'CANCELADO',
}

export class CreateTransactionDto {
  @ApiProperty({ enum: TransactionTypeDto })
  @IsEnum(TransactionTypeDto)
  type: TransactionTypeDto;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: TransactionStatusDto, required: false })
  @IsOptional()
  @IsEnum(TransactionStatusDto)
  status?: TransactionStatusDto;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  competencia?: string;

  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientOrSupplier?: string;

  @ApiProperty({ required: false, description: 'Número total de parcelas (1 = à vista)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  installments?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({ enum: TransactionStatusDto, required: false })
  @IsOptional()
  @IsEnum(TransactionStatusDto)
  status?: TransactionStatusDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  costCenterId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientOrSupplier?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueryTransactionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({ enum: TransactionTypeDto, required: false })
  @IsOptional()
  @IsEnum(TransactionTypeDto)
  type?: TransactionTypeDto;

  @ApiProperty({ enum: TransactionStatusDto, required: false })
  @IsOptional()
  @IsEnum(TransactionStatusDto)
  status?: TransactionStatusDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;
}
