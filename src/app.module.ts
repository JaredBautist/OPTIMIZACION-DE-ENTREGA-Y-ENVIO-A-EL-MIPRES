import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MipresModule } from './mipres/mipres.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 15 * 60,
        limit: 100,
      },
    ]),
    AuthModule,
    MipresModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
