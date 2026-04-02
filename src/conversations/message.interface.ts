export interface Message {
  id?: number;
  conversationId: string;
  sender: string;
  content: string;
  createdAt: Date;
}

import { registerDecorator, ValidationOptions } from 'class-validator';

function IsRequired(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isRequired',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return value !== null && value !== undefined && value !== '';
        },
        defaultMessage() {
          return `${propertyName} is required.`;
        }
      }
    });
  };
}

export class MessageDto {
  @IsRequired()
  conversationId: string;

  @IsRequired()
  sender: string;

  @IsRequired()
  content: string;
}