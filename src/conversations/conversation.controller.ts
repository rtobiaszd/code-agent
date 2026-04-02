import { Controller, Get, Param } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { MessageEntity } from './conversation.entity';

@Controller('conversations')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get(':id/messages')
  async getMessageHistory(@Param('id') id: string): Promise<MessageEntity[]> {
    return this.conversationService.getMessageHistory(id);
  }
}
