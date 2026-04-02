// src/conversations/conversation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './conversation.entity';

@Injectable()
export class ConversationService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async createMessage(message: Message): Promise<Message> {
    const newMessage = this.conversationRepository.create(message);
    return await this.conversationRepository.save(newMessage);
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return await this.conversationRepository.find({
      where: { conversationId },
    });
  }
}
