import { ClientEntity } from '../../../../clients/infrastructure/persistence/relational/entities/client.entity';
import { ConversationEntity } from '../../../../conversations/infrastructure/persistence/relational/entities/conversation.entity';
import { MessageEntity } from '../../../../messages/infrastructure/persistence/relational/entities/message.entity';
import { MessageSenderEnum } from '../../../../messages/message-sender.enum';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';

type SeedConversation = {
  clientEmail: string;
  channel: string;
  status: string;
  messages: [MessageSenderEnum, string][];
};

// Messages are inserted directly, so MESSAGE_CREATED_EVENT is not emitted and
// seeding never triggers intent recognition. They only provide history: post
// a new client message to one of these conversations to run the graph.
const SHOP_CONVERSATIONS: SeedConversation[] = [
  {
    // Fresh conversation for clean single-turn tests.
    clientEmail: 'anna.kowalska@example.com',
    channel: 'web_chat',
    status: 'open',
    messages: [],
  },
  {
    // Order number is only in the history: "When will it arrive?" should
    // reuse ORD-100234 for track_shipment.
    clientEmail: 'mark.schmidt@example.com',
    channel: 'web_chat',
    status: 'open',
    messages: [
      [MessageSenderEnum.client, 'Hi, I ordered a rain jacket last week.'],
      [
        MessageSenderEnum.bot,
        'Hi Mark! Happy to help. What is your order number?',
      ],
      [MessageSenderEnum.client, 'It is ORD-100234.'],
      [
        MessageSenderEnum.bot,
        'Thanks! Order ORD-100234 has been shipped. Is there anything else I can help with?',
      ],
    ],
  },
  {
    // Return case: reply e.g. "The zipper on the jacket is broken, I want
    // to return it" to get request_return with confirmation.
    clientEmail: 'julia.novak@example.com',
    channel: 'email',
    status: 'open',
    messages: [
      [
        MessageSenderEnum.client,
        'Hello, my order ORD-100377 arrived yesterday but something is wrong with it.',
      ],
      [
        MessageSenderEnum.bot,
        'I am sorry to hear that, Julia. Could you tell me what is wrong with the item?',
      ],
    ],
  },
  {
    // Closed and handed to a human: history with an agent reply.
    clientEmail: 'guest.buyer@example.com',
    channel: 'email',
    status: 'closed',
    messages: [
      [
        MessageSenderEnum.client,
        'I paid twice for order ORD-100512, please help!',
      ],
      [
        MessageSenderEnum.bot,
        'I am passing your request to our support team. A colleague will reply shortly.',
      ],
      [
        MessageSenderEnum.agent,
        'Hi! I can see the double charge. The duplicate payment has been refunded and should reach your account within 3-5 business days.',
      ],
      [MessageSenderEnum.client, 'Thank you!'],
    ],
  },
];

export class ConversationSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(ConversationEntity);
    const clientRepository = dataSource.getRepository(ClientEntity);
    const messageRepository = dataSource.getRepository(MessageEntity);

    const count = await repository.count();

    if (count === 0) {
      // Explicit timestamps keep the history order deterministic.
      let timestamp = Date.now() - 24 * 60 * 60 * 1000;

      for (const seed of SHOP_CONVERSATIONS) {
        const client = await clientRepository.findOne({
          where: { email: seed.clientEmail },
        });

        const conversation = await repository.save(
          repository.create({
            client,
            channel: seed.channel,
            status: seed.status,
          }),
        );

        for (const [sender, content] of seed.messages) {
          timestamp += 60 * 1000;
          await messageRepository.save(
            messageRepository.create({
              conversation,
              sender,
              content,
              createdAt: new Date(timestamp),
            }),
          );
        }

        if (seed.messages.length) {
          await repository.update(conversation.id, {
            lastMessageAt: new Date(timestamp),
          });
        }
      }
    }
  }
}
