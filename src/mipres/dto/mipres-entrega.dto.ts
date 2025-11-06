import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class MipresEntregaDto {
  @IsString()
  @IsNotEmpty()
  mipresToken!: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  ambito?: boolean;

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

  @IsString()
  @IsNotEmpty()
  CodSerTecEntregado!: string;

  @IsString()
  @IsNotEmpty()
  CantTotEntregada!: string;

  @Type(() => Number)
  @IsInt()
  EntTotal!: number;

  @Type(() => Number)
  @IsInt()
  CausaNoEntrega!: number;

  @IsString()
  @IsNotEmpty()
  FecEntrega!: string;

  @IsString()
  NoLote!: string;
}
