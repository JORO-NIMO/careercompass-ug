/**
 * Unit tests for API client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, apiClient, resolveApiUrl } from '../api-client';

describe('resolveApiUrl', () => {
    it('should return path as-is if it starts with http', () => {
        expect(resolveApiUrl('https://example.com/api')).toBe('https://example.com/api');
    });

    it('should add leading slash if missing', () => {
        const result = resolveApiUrl('api/endpoint');
        expect(result).toContain('/api/endpoint');
    });
});

describe('ApiError', () => {
    it('should create error with message and status', () => {
        const error = new ApiError('Not found', 404);
        expect(error.message).toBe('Not found');
        expect(error.status).toBe(404);
        expect(error.name).toBe('ApiError');
    });

    it('should include optional data', () => {
        const error = new ApiError('Validation failed', 400, { field: 'email' });
        expect(error.data).toEqual({ field: 'email' });
    });
});

describe('apiClient', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('should make GET request', async () => {
        const mockResponse = { data: 'test' };
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve(mockResponse),
        });

        const result = await apiClient.get('/api/test');

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({ method: 'GET' })
        );
        expect(result).toEqual(mockResponse);
    });

    it('should make POST request with body', async () => {
        const mockResponse = { id: 1 };
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            status: 201,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve(mockResponse),
        });

        const result = await apiClient.post('/api/test', { name: 'test' });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/test'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ name: 'test' }),
            })
        );
        expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError on non-ok response', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
            status: 404,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve({ message: 'Not found' }),
        });

        await expect(apiClient.get('/api/not-found')).rejects.toThrow(ApiError);
    });

    it('should handle 204 No Content response', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            status: 204,
            headers: new Headers(),
        });

        const result = await apiClient.delete('/api/test/1');
        expect(result).toEqual({});
    });

    it('should include query params in URL', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: () => Promise.resolve([]),
        });

        await apiClient.get('/api/search', { params: { q: 'test', limit: 10 } });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('q=test'),
            expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('limit=10'),
            expect.any(Object)
        );
    });
});
