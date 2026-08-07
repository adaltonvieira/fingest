import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class ConfirmImportDto {
  @ApiProperty()
  @IsString()
  accountId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  rows: Array<{ date: string; description: string; amount: number; type: 'RECEITA' | 'DESPESA' }>;
}
