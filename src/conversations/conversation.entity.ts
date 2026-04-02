// src/conversations/conversation.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Message } from './message.interface';

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  content: string;

  @Column('timestamp')
  timestamp: Date;

  @Column('integer')
  senderId: number;

  @Column('integer')
  receiverId: number;
}
