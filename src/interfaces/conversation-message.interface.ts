// conversation-message.interface.ts
export interface ConversationMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  channel: string;
}