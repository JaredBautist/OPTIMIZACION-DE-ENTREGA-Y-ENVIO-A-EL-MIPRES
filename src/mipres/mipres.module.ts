import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MipresController } from './mipres.controller';
import { MipresService } from './mipres.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('MIPRES_HTTP_TIMEOUT_MS', 45000),
        maxRedirects: 3,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }),
    }),
  ],
  controllers: [MipresController],
  providers: [MipresService],
})
export class MipresModule {}
