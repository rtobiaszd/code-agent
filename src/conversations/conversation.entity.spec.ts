import { ConversationEntity } from '../conversation.entity';
import { IsNotEmpty, Length } from 'class-validator';

describe('ConversationEntity', () => {
  it('should be defined', () => {
    expect(new ConversationEntity()).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize properties correctly', () => {
      const conversation = new ConversationEntity({
        id: '123',
        channelId: 'abc',
        contactId: 'xyz',
        messages: []
      });
      expect(conversation.id).toBe('123');
      expect(conversation.channelId).toBe('abc');
      expect(conversation.contactId).toBe('xyz');
      expect(conversation.messages).toEqual([]);
    });
  });

  describe('addMessage', () => {
    it('should add a message to the conversation', () => {
      const conversation = new ConversationEntity();
      conversation.addMessage({ id: '1', text: 'Hello' });
      expect(conversation.messages.length).toBe(1);
      expect(conversation.messages[0].id).toBe('1');
      expect(conversation.messages[0].text).toBe('Hello');
    });
  });

  describe('validate', () => {
    it('should throw an error if id is empty', () => {
      const conversation = new ConversationEntity();
      conversation.id = '';
      try {
        conversation.validate();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('id');
      }
    });

    it('should throw an error if channelId is empty', () => {
      const conversation = new ConversationEntity();
      conversation.channelId = '';
      try {
        conversation.validate();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('channelId');
      }
    });

    it('should throw an error if contactId is empty', () => {
      const conversation = new ConversationEntity();
      conversation.contactId = '';
      try {
        conversation.validate();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('contactId');
      }
    });

    it('should pass validation with valid data', () => {
      const conversation = new ConversationEntity({
        id: '123',
        channelId: 'abc',
        contactId: 'xyz'
      });
      conversation.validate();
    });
  });
});