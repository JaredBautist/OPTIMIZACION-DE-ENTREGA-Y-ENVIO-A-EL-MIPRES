import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class MipresReporteDto {
  @IsString()
  @IsNotEmpty()
  mipresToken!: string;

  @Type(() => Number)
  @IsInt()
  ID!: number;

  @Type(() => Number)
  @IsInt()
  EstadoEntrega!: number;

  @Type(() => Number)
  @IsInt()
  CausaNoEntrega!: number;

  @IsString()
  @IsNotEmpty()
  ValorEntregado!: string;
}
