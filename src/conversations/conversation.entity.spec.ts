import { describe, it, expect } from '@jest/globals';
import { ConversationEntity } from './conversation.entity';

describe('ConversationEntity', () => {
  it('should have the required properties', () => {
    const conversation: ConversationEntity = {
      id: '12345',
      contactId: '67890',
      messages: [],
      createdAt: new Date()
    };

    expect(conversation).toHaveProperty('id');
    expect(conversation).toHaveProperty('contactId');
    expect(conversation).toHaveProperty('messages');
    expect(conversation).toHaveProperty('createdAt');
  });
});