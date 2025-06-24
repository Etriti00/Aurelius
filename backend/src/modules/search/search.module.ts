import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { VectorService } from './services/vector.service';
import { EmbeddingService } from './services/embedding.service';
import { SemanticSearchService } from './services/semantic-search.service';
import { AppConfigModule } from '../config/config.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CacheModule } from '../cache/cache.module';
import { AIGatewayModule } from '../ai-gateway/ai-gateway.module';

@Module({
  imports: [AppConfigModule, PrismaModule, CacheModule, AIGatewayModule],
  controllers: [SearchController],
  providers: [SearchService, VectorService, EmbeddingService, SemanticSearchService],
  exports: [SearchService, VectorService, EmbeddingService, SemanticSearchService],
})
export class SearchModule {}
