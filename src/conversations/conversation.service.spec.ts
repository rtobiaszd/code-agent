import { describe, it, expect } from '@jest/globals';
import { ConversationService } from './conversation.service';

const mockConversationRepository = {
  findOne: jest.fn()
};

const conversationService = new ConversationService(mockConversationRepository as any);

describe('ConversationService', () => {
  it('should find a conversation by id', async () => {
    const conversationId = '12345';
    mockConversationRepository.findOne.mockResolvedValue({ id: conversationId } as any);

    const result = await conversationService.findById(conversationId);

    expect(mockConversationRepository.findOne).toHaveBeenCalledWith({ where: { id: conversationId } });
    expect(result).toEqual({ id: conversationId });
  });
});