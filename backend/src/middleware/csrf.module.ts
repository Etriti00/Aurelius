import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CsrfMiddleware } from './csrf.middleware';

@Module({
  imports: [ConfigModule],
  providers: [CsrfMiddleware],
  exports: [CsrfMiddleware],
})
export class CsrfModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware).forRoutes('*'); // Apply to all routes
  }
}
