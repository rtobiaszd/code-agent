import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Message } from './message.interface';

@Entity()
export class MessageEntity implements Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  conversationId: string;

  @Column({ type: 'varchar', length: 255 })
  sender: string;

  @Column('text')
  content: string;

  @Column('timestamp')
  createdAt: Date;
}
