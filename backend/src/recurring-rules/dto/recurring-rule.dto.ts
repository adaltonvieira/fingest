import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export enum TransactionTypeDto {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export class CreateRecurringRuleDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: TransactionTypeDto })
  @IsEnum(TransactionTypeDto)
  type: TransactionTypeDto;

  @ApiProperty({ description: 'Dia do mês em que o lançamento deve ser gerado (1-28)' })
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth: number;

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
  paymentMethod?: string;
}

export class UpdateRecurringRuleDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
