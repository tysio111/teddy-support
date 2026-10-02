import { ConfigService } from '@nestjs/config';
import { Action } from '../../actions/domain/action';
import { ActionExecutorService } from './action-executor.service';

function createAction(overrides: Partial<Action> = {}): Action {
  return {
    id: 'action-1',
    name: 'check_order_status',
    description: '',
    endpointUrl: 'https://example.com/orders',
    httpMethod: 'GET',
    authType: 'none',
    authCredential: null,
    ...overrides,
  } as Action;
}

describe('ActionExecutorService', () => {
  let fetchMock: jest.SpyInstance;
  const service = new ActionExecutorService({
    getOrThrow: () => 1000,
  } as unknown as ConfigService);

  beforeEach(() => {
    fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
  });

  afterEach(() => fetchMock.mockRestore());

  function lastRequest() {
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    return { url: url.toString(), init };
  }

  it('should send GET parameters as query string and skip nulls', async () => {
    const result = await service.execute(createAction(), {
      orderId: '123',
      note: null,
    });

    const { url, init } = lastRequest();
    expect(url).toBe('https://example.com/orders?orderId=123');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(result).toMatchObject({
      success: true,
      responseStatusCode: 200,
      responsePayload: '{"ok":true}',
      errorMessage: null,
    });
  });

  it('should send POST parameters as JSON body', async () => {
    await service.execute(createAction({ httpMethod: 'post' }), {
      amount: 10,
    });

    const { init } = lastRequest();
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"amount":10}');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });

  it.each([
    ['bearer', 'token', { Authorization: 'Bearer token' }],
    ['api_key', 'key', { 'X-API-Key': 'key' }],
    [
      'basic',
      'user:pass',
      { Authorization: `Basic ${Buffer.from('user:pass').toString('base64')}` },
    ],
  ])(
    'should add %s auth headers',
    async (authType, authCredential, expected) => {
      await service.execute(createAction({ authType, authCredential }), {});

      expect(lastRequest().init.headers).toMatchObject(expected);
    },
  );

  it('should not persist credentials in the request payload', async () => {
    const result = await service.execute(
      createAction({ authType: 'bearer', authCredential: 'secret' }),
      {},
    );

    expect(result.requestPayload).not.toContain('secret');
  });

  it('should record non-2xx responses as failures', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));

    const result = await service.execute(createAction(), {});

    expect(result).toMatchObject({
      success: false,
      responseStatusCode: 404,
      responsePayload: 'nope',
      errorMessage: 'Endpoint responded with status 404',
    });
  });

  it('should record network errors and timeouts', async () => {
    fetchMock.mockRejectedValue(new Error('The operation was aborted'));

    const result = await service.execute(createAction(), {});

    expect(result).toMatchObject({
      success: false,
      responseStatusCode: null,
      errorMessage: 'The operation was aborted',
    });
  });

  it('should reject unsupported protocols and auth types without calling fetch', async () => {
    const badProtocol = await service.execute(
      createAction({ endpointUrl: 'file:///etc/passwd' }),
      {},
    );
    const badAuth = await service.execute(
      createAction({ authType: 'oauth' }),
      {},
    );

    expect(badProtocol.errorMessage).toContain('Unsupported endpoint protocol');
    expect(badAuth.errorMessage).toContain('Unsupported auth type');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
