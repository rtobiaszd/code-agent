import { describe, it, expect } from '@jest/globals';
import { MessageInterface } from './message.interface';

describe('MessageInterface', () => {
  it('should have the required properties', () => {
    const message: MessageInterface = {
      id: '12345',
      content: 'Hello, world!',
      timestamp: new Date(),
      channel: 'email'
    };

    expect(message).toHaveProperty('id');
    expect(message).toHaveProperty('content');
    expect(message).toHaveProperty('timestamp');
    expect(message).toHaveProperty('channel');
  });
});