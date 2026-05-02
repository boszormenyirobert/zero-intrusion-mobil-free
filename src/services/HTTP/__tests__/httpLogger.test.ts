import { logHttpRequest, logHttpResponse } from '../httpLogger';

describe('httpLogger', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  beforeEach(() => {
    consoleSpy.mockClear();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('logs normalized request metadata', () => {
    logHttpRequest('sample', 'https://example.com', {
      method: 'POST',
      headers: [['X-Test', '1']],
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HTTP] sample request'),
      expect.objectContaining({
        url: 'https://example.com',
        method: 'POST',
        headers: { 'X-Test': '1' },
      }),
    );
  });

  it('logs default request values when no headers are provided', () => {
    logHttpRequest('default', 'https://example.com/default', {});

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HTTP] default request'),
      expect.objectContaining({
        url: 'https://example.com/default',
        method: 'GET',
        headers: {},
      }),
    );
  });

  it('preserves plain object headers', () => {
    logHttpRequest('object-headers', 'https://example.com/object', {
      headers: { 'X-Test': '1' },
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HTTP] object-headers request'),
      expect.objectContaining({
        headers: { 'X-Test': '1' },
      }),
    );
  });

  it('preserves plain-object headers', () => {
    logHttpRequest('object', 'https://example.com/object', {
      method: 'PUT',
      headers: { Authorization: 'Bearer token' },
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[HTTP] object request'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    );
  });

  it('normalizes Headers instances and empty response bodies', async () => {
    const headers = new Headers();
    headers.set('X-Trace', 'abc');

    logHttpRequest('headers', 'https://example.com/headers', {
      headers,
    });

    await logHttpResponse('empty', {
      url: 'https://example.com/empty',
      status: 204,
      statusText: 'No Content',
      ok: true,
      clone: () => ({
        text: async () => '',
      }),
    } as Response);

    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('[HTTP] headers request'),
      expect.objectContaining({ headers: { 'x-trace': 'abc' } }),
    );
    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('[HTTP] empty response'),
      expect.objectContaining({ body: null }),
    );
  });

  it('logs parsed json and raw text responses', async () => {
    await logHttpResponse('json', {
      url: 'https://example.com/json',
      status: 200,
      statusText: 'OK',
      ok: true,
      clone: () => ({
        text: async () => '{"ok":true}',
      }),
    } as Response);

    await logHttpResponse('text', {
      url: 'https://example.com/text',
      status: 202,
      statusText: 'Accepted',
      ok: true,
      clone: () => ({
        text: async () => 'plain-text',
      }),
    } as Response);

    expect(consoleSpy).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('[HTTP] json response'),
      expect.objectContaining({ body: { ok: true } }),
    );
    expect(consoleSpy).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('[HTTP] text response'),
      expect.objectContaining({ body: 'plain-text' }),
    );
  });
});
