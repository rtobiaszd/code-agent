export interface Message {
  id?: number;
  conversationId: string;
  sender: string;
  content: string;
  createdAt: Date;
}
