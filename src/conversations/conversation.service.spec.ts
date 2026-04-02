// conversation.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from './conversation.service';
import { MessageEntity } from '../entities/message.entity';
import * as faker from 'faker';

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationService, MessageEntity],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  it('should perform well for getMessageById', async () => {
    const messageId = faker.datatype.number().toString();
    const mockMessage: MessageEntity = { id: messageId, content: 'test message' } as MessageEntity;

    jest.spyOn(service, 'getMessageById').mockResolvedValue(mockMessage);

    const result = await service.getMessageById(messageId);

    expect(result).toEqual(mockMessage);
  });
});