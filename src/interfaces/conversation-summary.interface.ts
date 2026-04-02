// conversation-summary.interface.ts
export interface ConversationSummary {
  id: string;
  senderId: string;
  receiverId: string;
  lastMessageContent: string;
  lastMessageTimestamp: Date;
  unreadCount: number;
}