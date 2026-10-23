import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';

@Module({
  imports: [PostsModule],
  controllers: [ReelsController],
  providers: [ReelsService],
  exports: [ReelsService],
})
export class ReelsModule {}
