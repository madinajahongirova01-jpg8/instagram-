import { Module } from '@nestjs/common';
import { CommentsModule } from '../comments/comments.module';
import { PostsModule } from '../posts/posts.module';
import { ReelsModule } from '../reels/reels.module';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

@Module({
  imports: [PostsModule, ReelsModule, CommentsModule],
  controllers: [LikesController],
  providers: [LikesService],
})
export class LikesModule {}
