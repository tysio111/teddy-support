import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerRequest } from '@nestjs/throttler';
import { ConversationsService } from '../conversations/conversations.service';
import { Conversation } from '../conversations/domain/conversation';
import { ThrottlerNameEnum } from './rate-limit.constants';
import {
  ConversationIdResolver,
  THROTTLE_BY_CONVERSATION,
} from './throttle-by-conversation.decorator';

const CONVERSATION_KEY = Symbol('throttledConversation');

// Global guard: the per-IP limit applies everywhere, the per-conversation and
// per-client limits only to routes marked with @ThrottleByConversation.
// Global guards run before the route's AuthGuard, so there is no user yet.
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  @Inject(ConversationsService)
  private readonly conversationsService: ConversationsService;

  protected async handleRequest(props: ThrottlerRequest): Promise<boolean> {
    if (props.throttler.name === ThrottlerNameEnum.ip) {
      return super.handleRequest(props);
    }

    const tracker = await this.resolveTracker(
      props.context,
      props.throttler.name,
    );
    if (!tracker) {
      return true;
    }

    return super.handleRequest({ ...props, getTracker: () => tracker });
  }

  private async resolveTracker(
    context: ExecutionContext,
    throttlerName: string | undefined,
  ): Promise<string | undefined> {
    const resolve = this.reflector.getAllAndOverride<
      ConversationIdResolver | undefined
    >(THROTTLE_BY_CONVERSATION, [context.getHandler(), context.getClass()]);
    if (!resolve) {
      return undefined;
    }

    const { req } = this.getRequestResponse(context);
    const conversationId = resolve(req);
    if (!conversationId) {
      // Validation rejects the request later.
      return undefined;
    }

    if (throttlerName === ThrottlerNameEnum.conversation) {
      return conversationId;
    }

    // Conversations without a client are only limited per conversation.
    const conversation = await this.findConversation(req, conversationId);
    return conversation?.client?.id
      ? String(conversation.client.id)
      : undefined;
  }

  // Looked up once per request (and only for the client limit).
  private async findConversation(
    req: Record<string | symbol, any>,
    conversationId: string,
  ): Promise<Conversation | null> {
    if (!(CONVERSATION_KEY in req)) {
      req[CONVERSATION_KEY] = await this.conversationsService
        .findById(conversationId)
        // Not a uuid, for example: validation rejects the request later.
        .catch(() => null);
    }

    return req[CONVERSATION_KEY] as Conversation | null;
  }
}
