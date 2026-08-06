import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export enum AccountTypeDto {
  CORRENTE = 'CORRENTE',
  POUPANCA = 'POUPANCA',
  CARTEIRA = 'CARTEIRA',
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  INVESTIMENTO = 'INVESTIMENTO',
  CRIPTO = 'CRIPTO',
  OUTRO = 'OUTRO',
}

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: AccountTypeDto })
  @IsEnum(AccountTypeDto)
  type: AccountTypeDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  initialBalance?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}

export class UpdateAccountDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  icon?: string;
}
