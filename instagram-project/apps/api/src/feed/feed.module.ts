import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { ReelsModule } from '../reels/reels.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [PostsModule, ReelsModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
