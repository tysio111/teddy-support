import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { ActionParameterEntity } from '../../../../action-parameters/infrastructure/persistence/relational/entities/action-parameter.entity';
import { ActionAuthTypeEnum } from '../../../../actions/action-auth-type.enum';
import { ActionStatusEnum } from '../../../../actions/action-status.enum';
import { ActionEntity } from '../../../../actions/infrastructure/persistence/relational/entities/action.entity';

type SeedParameter = {
  name: string;
  type: string;
  description: string;
  isRequired?: boolean;
  enumValues?: string;
};

type SeedAction = {
  name: string;
  description: string;
  httpMethod: string;
  path: string;
  requiresConfirmation?: boolean;
  confidenceThreshold?: number;
  status?: ActionStatusEnum;
  parameters: SeedParameter[];
};

const ORDER_NUMBER: SeedParameter = {
  name: 'orderNumber',
  type: 'string',
  description: 'Order number, e.g. ORD-100234',
};

// Demo catalog of an online shop. Endpoints point to an echo service by
// default (httpbin returns 200 with the request it received), so the whole
// graph runs end to end without a real shop backend. Set SEED_SHOP_API_URL
// to your own mock to control responses (errors, latency, Retry-After).
const SHOP_ACTIONS: SeedAction[] = [
  {
    name: 'check_order_status',
    description:
      'Check the current status of an order (placed, paid, packed, shipped, delivered, cancelled).',
    httpMethod: 'GET',
    path: '/orders/status',
    parameters: [ORDER_NUMBER],
  },
  {
    name: 'track_shipment',
    description:
      'Get the carrier, tracking number and estimated delivery date of a shipped order.',
    httpMethod: 'GET',
    path: '/shipments/track',
    parameters: [ORDER_NUMBER],
  },
  {
    name: 'cancel_order',
    description:
      'Cancel an order that has not been shipped yet. Shipped orders must be returned instead.',
    httpMethod: 'POST',
    path: '/orders/cancel',
    requiresConfirmation: true,
    confidenceThreshold: 0.85,
    parameters: [
      ORDER_NUMBER,
      {
        name: 'reason',
        type: 'string',
        description: 'Why the client wants to cancel',
        isRequired: false,
        enumValues:
          'changed_mind,found_cheaper,ordered_by_mistake,delivery_too_slow,other',
      },
    ],
  },
  {
    name: 'request_return',
    description:
      'Start a return for one or more items of a delivered order and get a return label.',
    httpMethod: 'POST',
    path: '/returns',
    requiresConfirmation: true,
    parameters: [
      ORDER_NUMBER,
      {
        name: 'productName',
        type: 'string',
        description: 'Name or SKU of the item to return',
      },
      {
        name: 'reason',
        type: 'string',
        description: 'Why the item is being returned',
        enumValues:
          'damaged,wrong_item,not_as_described,wrong_size,changed_mind',
      },
      {
        name: 'comment',
        type: 'string',
        description: 'Extra details from the client about the problem',
        isRequired: false,
      },
    ],
  },
  {
    name: 'check_refund_status',
    description:
      'Check whether the refund for a returned or cancelled order has been issued.',
    httpMethod: 'GET',
    path: '/refunds/status',
    parameters: [ORDER_NUMBER],
  },
  {
    name: 'change_shipping_address',
    description:
      'Change the delivery address of an order that has not been shipped yet.',
    httpMethod: 'PATCH',
    path: '/orders/shipping-address',
    requiresConfirmation: true,
    parameters: [
      ORDER_NUMBER,
      {
        name: 'street',
        type: 'string',
        description: 'Street and house/apartment number',
      },
      { name: 'city', type: 'string', description: 'City' },
      { name: 'postalCode', type: 'string', description: 'Postal code' },
      {
        name: 'country',
        type: 'string',
        description: 'Country, ISO 3166-1 alpha-2 code',
        enumValues: 'PL,DE,CZ,SK,LT,FR,NL',
      },
    ],
  },
  {
    name: 'check_product_availability',
    description:
      'Check if a product (optionally in a given size or color) is in stock and when it will be restocked.',
    httpMethod: 'GET',
    path: '/products/availability',
    parameters: [
      {
        name: 'productName',
        type: 'string',
        description: 'Product name or SKU',
      },
      {
        name: 'size',
        type: 'string',
        description: 'Size, e.g. M, 42, 30x32',
        isRequired: false,
      },
      {
        name: 'color',
        type: 'string',
        description: 'Color variant',
        isRequired: false,
      },
    ],
  },
  {
    name: 'subscribe_back_in_stock',
    description:
      'Notify the client by email when an out-of-stock product is available again.',
    httpMethod: 'POST',
    path: '/products/back-in-stock-subscriptions',
    parameters: [
      {
        name: 'productName',
        type: 'string',
        description: 'Product name or SKU',
      },
      {
        name: 'email',
        type: 'email',
        description: 'Email address to notify',
      },
    ],
  },
  {
    name: 'validate_discount_code',
    description:
      'Check whether a discount code is valid, what it gives and when it expires.',
    httpMethod: 'GET',
    path: '/discount-codes/validate',
    parameters: [
      {
        name: 'code',
        type: 'string',
        description: 'Discount code as typed by the client',
      },
    ],
  },
  {
    name: 'update_account_email',
    description: 'Change the email address of the client account.',
    httpMethod: 'PATCH',
    path: '/account/email',
    requiresConfirmation: true,
    confidenceThreshold: 0.85,
    parameters: [
      {
        name: 'currentEmail',
        type: 'email',
        description: 'Email address currently on the account',
      },
      {
        name: 'newEmail',
        type: 'email',
        description: 'New email address',
      },
    ],
  },
  {
    name: 'unsubscribe_newsletter',
    description: 'Unsubscribe an email address from marketing newsletters.',
    httpMethod: 'POST',
    path: '/newsletter/unsubscribe',
    parameters: [
      {
        name: 'email',
        type: 'email',
        description: 'Email address to unsubscribe',
      },
    ],
  },
  {
    // Inactive on purpose: must never be classified (findActive filter).
    name: 'redeem_gift_card',
    description: 'Redeem a gift card on the client account.',
    httpMethod: 'POST',
    path: '/gift-cards/redeem',
    status: ActionStatusEnum.inactive,
    parameters: [
      {
        name: 'giftCardCode',
        type: 'string',
        description: 'Gift card code',
      },
    ],
  },
];

export class ActionSeeder implements Seeder {
  async run(dataSource: DataSource) {
    const repository = dataSource.getRepository(ActionEntity);
    const parameterRepository = dataSource.getRepository(ActionParameterEntity);

    const count = await repository.count();

    if (count === 0) {
      const baseUrl = (
        process.env.SEED_SHOP_API_URL ?? 'https://httpbin.org/anything/shop'
      ).replace(/\/$/, '');

      for (const seed of SHOP_ACTIONS) {
        const action = await repository.save(
          repository.create({
            name: seed.name,
            description: seed.description,
            httpMethod: seed.httpMethod,
            endpointUrl: `${baseUrl}${seed.path}`,
            authType: ActionAuthTypeEnum.bearer,
            authCredential: 'demo-shop-api-token',
            status: seed.status ?? ActionStatusEnum.active,
            requiresConfirmation: seed.requiresConfirmation ?? false,
            confidenceThreshold: seed.confidenceThreshold ?? null,
          }),
        );

        await parameterRepository.save(
          seed.parameters.map((parameter, index) =>
            parameterRepository.create({
              name: parameter.name,
              type: parameter.type,
              description: parameter.description,
              isRequired: parameter.isRequired ?? true,
              enumValues: parameter.enumValues ?? null,
              order: index + 1,
              action,
            }),
          ),
        );
      }
    }
  }
}
