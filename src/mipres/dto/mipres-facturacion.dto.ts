import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class MipresFacturacionDto {
  @IsString()
  @IsNotEmpty()
  mipresToken!: string;

  @IsString()
  @IsNotEmpty()
  NoPrescripcion!: string;

  @IsString()
  @IsNotEmpty()
  TipoTec!: string;

  @Type(() => Number)
  @IsInt()
  ConTec!: number;

  @IsString()
  @IsNotEmpty()
  TipoIDPaciente!: string;

  @IsString()
  @IsNotEmpty()
  NoIDPaciente!: string;

  @Type(() => Number)
  @IsInt()
  NoEntrega!: number;

  @Type(() => Number)
  @IsInt()
  NoSubEntrega!: number;

  @IsString()
  @IsNotEmpty()
  NoFactura!: string;

  @IsString()
  @IsNotEmpty()
  NoIDEPS!: string;

  @IsString()
  @IsNotEmpty()
  CodEPS!: string;

  @IsString()
  @IsNotEmpty()
  CodSerTecAEntregado!: string;

  @IsString()
  @IsNotEmpty()
  CantUnMinDis!: string;

  @IsString()
  @IsNotEmpty()
  ValorUnitFacturado!: string;

  @IsString()
  @IsNotEmpty()
  ValorTotFacturado!: string;

  @IsString()
  @IsNotEmpty()
  CuotaModer!: string;

  @IsString()
  @IsNotEmpty()
  Copago!: string;
}
