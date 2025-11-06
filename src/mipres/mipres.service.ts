import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GenerateTokenDto } from './dto/generate-token.dto';
import { MipresEntregaDto } from './dto/mipres-entrega.dto';
import { MipresFacturacionDto } from './dto/mipres-facturacion.dto';
import { MipresReporteDto } from './dto/mipres-reporte.dto';

export interface MipresApiResponse {
  success: boolean;
  status: number;
  data: unknown;
  headers: Record<string, string>;
}

@Injectable()
export class MipresService {
  private readonly logger = new Logger(MipresService.name);
  private readonly mipresBaseUrl: string;
  private readonly mipresFacBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.mipresBaseUrl = this.configService.get<string>(
      'MIPRES_BASE_URL',
      'https://wsmipres.sispro.gov.co/WSSUMMIPRESNOPBS',
    );
    this.mipresFacBaseUrl = this.configService.get<string>(
      'MIPRES_FAC_BASE_URL',
      'https://wsmipres.sispro.gov.co/WSFACMIPRESNOPBS',
    );
  }

  async generateToken(dto: GenerateTokenDto): Promise<MipresApiResponse> {
    const url = `${this.mipresBaseUrl}/api/GenerarToken/${dto.nit}/${dto.token}`;
    return this.makeApiRequest(url, 'GET');
  }

  async registrarEntrega(
    username: string,
    dto: MipresEntregaDto,
  ): Promise<MipresApiResponse> {
    const { mipresToken, ambito, ...entregaData } = dto;

    if (entregaData.NoLote === undefined || entregaData.NoLote === null) {
      entregaData.NoLote = '';
    }

    const endpoint = ambito ? 'EntregaAmbito' : 'Entrega';
    const url = `${this.mipresBaseUrl}/api/${endpoint}/${username}/${mipresToken}`;
    return this.makeApiRequest(url, 'PUT', entregaData);
  }

  async registrarReporte(
    username: string,
    dto: MipresReporteDto,
  ): Promise<MipresApiResponse> {
    const { mipresToken, ...reporteData } = dto;
    const url = `${this.mipresBaseUrl}/api/ReporteEntrega/${username}/${mipresToken}`;
    return this.makeApiRequest(url, 'PUT', reporteData, {
      Authorization: `Bearer ${mipresToken}`,
    });
  }

  async registrarFacturacion(
    username: string,
    dto: MipresFacturacionDto,
  ): Promise<MipresApiResponse> {
    const { mipresToken, ...facturacionData } = dto;
    const url = `${this.mipresFacBaseUrl}/api/Facturacion/${username}/${mipresToken}`;
    return this.makeApiRequest(url, 'PUT', facturacionData, {
      Authorization: `Bearer ${mipresToken}`,
    });
  }

  private async makeApiRequest(
    url: string,
    method: Method,
    data?: unknown,
    headers: Record<string, string> = {},
  ): Promise<MipresApiResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url,
          method,
          data,
          headers,
        }),
      );

      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: this.normalizeHeaders(response.headers),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status ?? 500;
      const responseData =
        axiosError.response?.data ?? { error: axiosError.message };

      this.logger.error('API Request Error', axiosError.stack);

      return {
        success: false,
        status,
        data: responseData,
        headers: this.normalizeHeaders(axiosError.response?.headers),
      };
    }
  }

  private normalizeHeaders(
    headers: unknown,
  ): Record<string, string> {
    if (!headers || typeof headers !== 'object') {
      return {};
    }

    const plain: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        plain[key] = value.map((item) => String(item)).join(', ');
      } else {
        plain[key] = String(value);
      }
    }

    return plain;
  }
}
