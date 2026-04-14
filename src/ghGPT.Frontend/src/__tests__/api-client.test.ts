import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../services/api-client';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOk(body: string, status = 200): Response {
  return {
    ok: true,
    status,
    statusText: 'OK',
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function mockError(status: number, body: string): Response {
  return {
    ok: false,
    status,
    statusText: 'Error',
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('ApiError', () => {
  it('has name ApiError', () => {
    const err = new ApiError('Not found', 404);
    expect(err.name).toBe('ApiError');
  });

  it('stores status code', () => {
    const err = new ApiError('Unauthorized', 401);
    expect(err.status).toBe(401);
  });

  it('stores message', () => {
    const err = new ApiError('Server error', 500);
    expect(err.message).toBe('Server error');
  });

  it('is an instance of Error', () => {
    expect(new ApiError('x', 400)).toBeInstanceOf(Error);
  });
});

describe('api.get', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls fetch with correct URL and Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(mockOk('{}'));
    await api.get('/repos');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/repos',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(mockOk('{"id":"1","name":"repo"}'));
    const result = await api.get<{ id: string; name: string }>('/repos/1');
    expect(result).toEqual({ id: '1', name: 'repo' });
  });

  it('returns undefined for empty response body', async () => {
    mockFetch.mockResolvedValueOnce(mockOk('', 204));
    const result = await api.get<void>('/repos/1/fetch');
    expect(result).toBeUndefined();
  });

  it('throws ApiError with status 404 on not-found response', async () => {
    mockFetch.mockResolvedValueOnce(mockError(404, '{"error":"not found"}'));
    await expect(api.get('/repos/bad')).rejects.toMatchObject({
      status: 404,
      message: 'not found',
    });
  });

  it('throws ApiError using title field when error field absent', async () => {
    mockFetch.mockResolvedValueOnce(mockError(400, '{"title":"Bad Request"}'));
    await expect(api.get('/repos/bad')).rejects.toMatchObject({
      status: 400,
      message: 'Bad Request',
    });
  });

  it('throws ApiError with plain text when response is not JSON', async () => {
    mockFetch.mockResolvedValueOnce(mockError(500, 'Internal Server Error'));
    await expect(api.get('/repos')).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error',
    });
  });
});

describe('api.post', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls fetch with POST method', async () => {
    mockFetch.mockResolvedValueOnce(mockOk('{"id":"1"}'));
    await api.post('/repos', { name: 'my-repo' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/repos',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('serializes body as JSON', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(''));
    await api.post('/repos', { name: 'my-repo', localPath: '/tmp' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/repos',
      expect.objectContaining({ body: JSON.stringify({ name: 'my-repo', localPath: '/tmp' }) }),
    );
  });

  it('sends no body when body argument is undefined', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(''));
    await api.post('/repos/1/fetch');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/repos/1/fetch',
      expect.objectContaining({ body: undefined }),
    );
  });
});

describe('api.put', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls fetch with PUT method', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(''));
    await api.put('/repos/active/id-1');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/repos/active/id-1',
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('api.delete', () => {
  beforeEach(() => mockFetch.mockReset());

  it('calls fetch with DELETE method', async () => {
    mockFetch.mockResolvedValueOnce(mockOk(''));
    await api.delete('/repos/1');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/repos/1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
