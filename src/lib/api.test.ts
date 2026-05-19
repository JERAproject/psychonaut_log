import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getApiBase, apiFetch, apiGet, apiPost } from './api';

describe('api', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getApiBase', () => {
    it('should return content from meta tag when present', () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      expect(getApiBase()).toBe('http://localhost:3001');
    });

    it('should return empty string when meta tag not present', () => {
      expect(getApiBase()).toBe('');
    });

    it('should return empty string when meta tag has no content', () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      document.head.appendChild(meta);

      expect(getApiBase()).toBe('');
    });
  });

  describe('apiFetch', () => {
    it('should call fetch with correct URL when path starts with /', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ test: true })
      });
      global.fetch = mockFetch;

      await apiFetch('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({ headers: {} })
      );
    });

    it('should use full URL when path does not start with /', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ test: true })
      });
      global.fetch = mockFetch;

      await apiFetch('http://external.com/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://external.com/api/test',
        expect.any(Object)
      );
    });

    it('should include Authorization header when token exists', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      localStorage.setItem('psy_token', 'test-token-123');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });
      global.fetch = mockFetch;

      await apiFetch('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123'
          })
        })
      );
    });

    it('should not include Authorization header when no token', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });
      global.fetch = mockFetch;

      await apiFetch('/api/test');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Authorization');
    });

    it('should merge custom headers with auth headers', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      localStorage.setItem('psy_token', 'test-token');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({})
      });
      global.fetch = mockFetch;

      await apiFetch('/api/test', {
        headers: { 'X-Custom-Header': 'value' }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'X-Custom-Header': 'value'
          })
        })
      );
    });
  });

  describe('apiGet', () => {
    it('should return parsed JSON on success', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      const result = await apiGet('/api/test');

      expect(result).toEqual({ data: 'test' });
    });

    it('should throw error when response is not ok', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockResponse = {
        ok: false,
        status: 404
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      await expect(apiGet('/api/test')).rejects.toThrow('GET /api/test failed: 404');
    });
  });

  describe('apiPost', () => {
    it('should send JSON body with POST method', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ ok: true })
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      await apiPost('/api/test', { name: 'test', value: 123 });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({ name: 'test', value: 123 })
        })
      );
    });

    it('should throw error with message from response on failure', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Validation failed' })
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      await expect(apiPost('/api/test', {})).rejects.toThrow('Validation failed');
    });

    it('should throw generic error when no error message in response', async () => {
      const meta = document.createElement('meta');
      meta.name = 'api-base';
      meta.content = 'http://localhost:3001';
      document.head.appendChild(meta);

      const mockResponse = {
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON'))
      };
      const mockFetch = vi.fn().mockResolvedValue(mockResponse);
      global.fetch = mockFetch;

      await expect(apiPost('/api/test', {})).rejects.toThrow('POST /api/test failed: 500');
    });
  });
});