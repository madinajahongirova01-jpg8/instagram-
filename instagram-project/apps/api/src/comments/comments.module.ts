import { Module } from '@nestjs/common';
import { PostsModule } from '../posts/posts.module';
import { ReelsModule } from '../reels/reels.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [PostsModule, ReelsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
