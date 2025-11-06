import {
  Body,
  Controller,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { MipresEntregaDto } from './dto/mipres-entrega.dto';
import { MipresFacturacionDto } from './dto/mipres-facturacion.dto';
import { MipresReporteDto } from './dto/mipres-reporte.dto';
import { MipresApiResponse, MipresService } from './mipres.service';

type AuthenticatedRequest = Request & {
  user?: {
    username: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('mipres')
export class MipresController {
  constructor(private readonly mipresService: MipresService) {}

  @Post('token')
  generateToken(@Body() dto: GenerateTokenDto): Promise<MipresApiResponse> {
    return this.mipresService.generateToken(dto);
  }

  @Put('entrega')
  registrarEntrega(
    @Req() request: AuthenticatedRequest,
    @Body() dto: MipresEntregaDto,
  ): Promise<MipresApiResponse> {
    const username = request.user?.username;
    if (!username) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.mipresService.registrarEntrega(username, dto);
  }

  @Put('reporte')
  registrarReporte(
    @Req() request: AuthenticatedRequest,
    @Body() dto: MipresReporteDto,
  ): Promise<MipresApiResponse> {
    const username = request.user?.username;
    if (!username) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.mipresService.registrarReporte(username, dto);
  }

  @Put('facturacion')
  registrarFacturacion(
    @Req() request: AuthenticatedRequest,
    @Body() dto: MipresFacturacionDto,
  ): Promise<MipresApiResponse> {
    const username = request.user?.username;
    if (!username) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.mipresService.registrarFacturacion(username, dto);
  }
}
