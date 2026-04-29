import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  getConversations(@CurrentUser() user: any) {
    return this.chat.getConversations(user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.chat.getMessages(id, user.id, cursor);
  }
}
