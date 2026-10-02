// Interactive playground for the intent graph: chat as the client of a seeded
// conversation and see the bot's replies plus a summary of each run. Calls the
// real model (needs ANTHROPIC_API_KEY and a seeded database):
//
//   npm run chat                                  # pick a conversation
//   npm run chat -- mark.schmidt@example.com      # latest conversation of a client
//   npm run chat -- <conversation id>
//   npm run chat -- mark.schmidt@example.com "When will it arrive?"  # one-shot
//
// The graph is run directly (not through MESSAGE_CREATED_EVENT), so messages
// never run twice, and recognition is force-enabled for this process only.
import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { awaitAllCallbacks } from '@langchain/core/callbacks/promises';
import { createInterface } from 'node:readline/promises';
import { DataSource } from 'typeorm';
import { ConversationEntity } from '../../conversations/infrastructure/persistence/relational/entities/conversation.entity';
import { Conversation } from '../../conversations/domain/conversation';
import { Message } from '../../messages/domain/message';
import { MessageSenderEnum } from '../../messages/message-sender.enum';
import { MessageRepository } from '../../messages/infrastructure/persistence/message.repository';
import { IntentGraphRunResult } from '../graph/intent-graph.service';
import { IntentRecognitionListener } from '../intent-recognition.listener';

const HISTORY_LIMIT = 50;

const SENDER_LABELS: Record<string, string> = {
  [MessageSenderEnum.client]: 'you  ',
  [MessageSenderEnum.bot]: 'bot  ',
  [MessageSenderEnum.agent]: 'agent',
};

const HELP = `Type a message as the client. Commands:
  /history   show the conversation so far
  /new       start a fresh conversation for the same client
  /quit      exit`;

type Context = {
  dataSource: DataSource;
  messages: MessageRepository;
  listener: IntentRecognitionListener;
};

async function main(): Promise<void> {
  const [target, ...oneShot] = process.argv.slice(2);

  // Config is read while AppModule is imported, so set it before loading it.
  process.env.INTENT_RECOGNITION_ENABLED = 'true';
  const { AppModule } = await import('../../app.module');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const dataSource = app.get(DataSource);
  // TypeORM logs every query outside production; keep the chat readable.
  dataSource.setOptions({ logging: ['error'] });

  const context: Context = {
    dataSource,
    messages: app.get(MessageRepository),
    listener: app.get(IntentRecognitionListener),
  };
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    let conversation = await resolveConversation(context, target, rl);
    console.log(
      `\nConversation ${conversation.id} (${conversation.client?.email ?? 'no client'}, ` +
        `${conversation.channel}, ${conversation.status})`,
    );
    await printHistory(context, conversation);

    if (oneShot.length) {
      for (const content of oneShot) {
        console.log(`you   > ${content}`);
        await send(context, conversation, content);
      }
      return;
    }

    console.log(`\n${HELP}\n`);
    for (;;) {
      const line = (await rl.question('you   > ')).trim();
      if (!line) {
        continue;
      }
      if (line === '/quit' || line === '/exit') {
        break;
      }
      if (line === '/help') {
        console.log(HELP);
      } else if (line === '/history') {
        await printHistory(context, conversation);
      } else if (line === '/new') {
        conversation = await createConversation(context, conversation);
        console.log(`Started conversation ${conversation.id}`);
      } else {
        await send(context, conversation, line);
      }
    }
  } finally {
    rl.close();
    // LangSmith uploads traces in the background; flush them before exiting.
    await awaitAllCallbacks();
    await app.close();
  }
}

async function send(
  context: Context,
  conversation: Conversation,
  content: string,
): Promise<void> {
  // Saved through the repository, so MESSAGE_CREATED_EVENT is not emitted.
  const message = await context.messages.create({
    content,
    sender: MessageSenderEnum.client,
    conversation,
  });

  const started = Date.now();
  let result: IntentGraphRunResult;
  try {
    result = await context.listener.recognize({
      messageId: message.id,
      conversationId: conversation.id,
    });
  } catch (error) {
    console.error('Graph run failed:', error);
    return;
  }

  const replies = (
    await context.messages.findRecentByConversationId(conversation.id, 10)
  ).filter(
    (reply) =>
      reply.sender !== MessageSenderEnum.client &&
      reply.createdAt >= message.createdAt,
  );
  for (const reply of replies) {
    printMessage(reply);
  }
  if (!replies.length) {
    console.log('      (no reply)');
  }

  printSummary(result, Date.now() - started);
}

function printSummary(result: IntentGraphRunResult, ms: number): void {
  const status = result.pendingInput
    ? `waiting for ${result.pendingInput.type}`
    : (result.outcome ?? 'done');
  const lines = [`status: ${status}${result.escalated ? ' (escalated)' : ''}`];

  if (result.topCatalogAction) {
    lines.push(
      `intent: ${result.topCatalogAction.action.name}` +
        ` (${result.topIntent?.confidenceScore ?? '-'})`,
    );
  }
  if (Object.keys(result.extractedParameters).length) {
    lines.push(`params: ${JSON.stringify(result.extractedParameters)}`);
  }
  if (result.missingParameters.length) {
    lines.push(`missing: ${result.missingParameters.join(', ')}`);
  }
  if (result.executionResult) {
    const { success, responseStatusCode, errorMessage } =
      result.executionResult;
    lines.push(
      `action: ${success ? 'ok' : 'failed'} (${responseStatusCode ?? '-'})` +
        (errorMessage ? ` ${errorMessage}` : ''),
    );
  }
  if (result.knowledge) {
    const { status, rewrittenQuery, candidates, chunks, citations } =
      result.knowledge;
    lines.push(
      `knowledge: ${status}, query "${rewrittenQuery}", ` +
        `${chunks}/${candidates} chunks used`,
    );
    for (const { resourceTitle, headingPath } of citations) {
      lines.push(`source: ${[resourceTitle, ...headingPath].join(' > ')}`);
    }
  }
  if (result.error) {
    lines.push(`error: ${result.error.node}: ${result.error.message}`);
  }
  lines.push(
    `path: ${result.metrics.map(({ node }) => node).join(' > ')}`,
    `${ms}ms, ${result.usage.llmCalls} LLM calls, ` +
      `${result.usage.inputTokens}/${result.usage.outputTokens} tokens in/out`,
  );

  console.log(lines.map((line) => `      · ${line}`).join('\n') + '\n');
}

async function resolveConversation(
  { dataSource }: Context,
  target: string | undefined,
  rl: ReturnType<typeof createInterface>,
): Promise<Conversation> {
  const repository = dataSource.getRepository(ConversationEntity);
  const relations = { client: true };

  if (target?.includes('@')) {
    const conversation = await repository.findOne({
      where: { client: { email: target } },
      relations,
      order: { createdAt: 'DESC' },
    });
    if (!conversation) {
      throw new Error(`No conversation for client ${target}`);
    }
    return conversation;
  }

  if (target) {
    const conversation = await repository.findOne({
      where: { id: target },
      relations,
    });
    if (!conversation) {
      throw new Error(`Conversation ${target} not found`);
    }
    return conversation;
  }

  const conversations = await repository.find({
    relations,
    order: { createdAt: 'ASC' },
  });
  if (!conversations.length) {
    throw new Error(
      'No conversations found: run `npm run seed:run:relational` first',
    );
  }

  conversations.forEach((conversation, index) =>
    console.log(
      `  ${index + 1}. ${conversation.client?.email ?? 'no client'}` +
        `  ${conversation.channel}  ${conversation.status}`,
    ),
  );
  const choice = Number(await rl.question('Conversation number: '));
  const conversation = conversations[choice - 1];
  if (!conversation) {
    throw new Error(`Invalid choice`);
  }
  return conversation;
}

async function createConversation(
  { dataSource }: Context,
  from: Conversation,
): Promise<Conversation> {
  const repository = dataSource.getRepository(ConversationEntity);
  const conversation = await repository.save(
    repository.create({
      client: from.client,
      channel: from.channel,
      status: 'open',
    }),
  );
  return { ...conversation, client: from.client };
}

async function printHistory(
  { messages }: Context,
  conversation: Conversation,
): Promise<void> {
  const history = await messages.findRecentByConversationId(
    conversation.id,
    HISTORY_LIMIT,
  );
  if (!history.length) {
    console.log('(no messages yet)');
  }
  history.forEach(printMessage);
}

function printMessage(message: Message): void {
  const label = SENDER_LABELS[message.sender] ?? message.sender;
  console.log(`${label} > ${message.content}`);
}

main().catch((error) => {
  Logger.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
