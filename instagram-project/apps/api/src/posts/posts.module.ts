import { Module } from '@nestjs/common';
import { PostPresenter } from './post.presenter';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { TaggingService } from './tagging.service';

@Module({
  controllers: [PostsController],
  providers: [PostsService, PostPresenter, TaggingService],
  exports: [PostsService, PostPresenter, TaggingService],
})
export class PostsModule {}
