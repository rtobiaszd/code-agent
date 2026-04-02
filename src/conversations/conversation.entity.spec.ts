
import { Test, TestingModule } from '@nestjs/testing';
import { ConversationEntity } from './conversation.entity';

describe('ConversationEntity', () => {
  let entity: ConversationEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationEntity]}).compile();

    entity = module.get<ConversationEntity>(ConversationEntity);
  });

  it('should be defined', () => {
    expect(entity).toBeDefined();
  });
});
