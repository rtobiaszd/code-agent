import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from './conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async getMessageHistory(conversationId: string): Promise<MessageEntity[]> {
    try {
      const messages = await this.messageRepository.find({
        where: { conversationId },
        order: { createdAt: 'ASC' }
      });

      if (!messages) {
        throw new NotFoundException('Message history not found');
      }

      return messages;
    } catch (error) {
      throw new NotFoundException(`Failed to retrieve message history for conversationId ${conversationId}: ${error.message}`);
    }
  }
}