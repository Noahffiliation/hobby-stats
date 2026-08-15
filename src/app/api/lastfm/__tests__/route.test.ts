import { GET, getLastfmUsername } from '../route';

globalThis.fetch = jest.fn();

describe('Last.fm API Route', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		process.env.LASTFM_API_KEY = 'test-server-key';
		delete process.env.NEXT_PUBLIC_LASTFM_API_KEY;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_LASTFM_USERNAME = 'custom_lastfm';
		expect(getLastfmUsername()).toBe('custom_lastfm');
		delete process.env.NEXT_PUBLIC_LASTFM_USERNAME;
		expect(getLastfmUsername()).toBe('noahffiliation');
	});

	it('returns recent tracks data successfully using LASTFM_API_KEY', async () => {
		const mockData = { recenttracks: { track: [{ name: 'Song 1', artist: { '#text': 'Artist 1' } }] } };
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockData,
		});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual(mockData);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('api_key=test-server-key'),
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('falls back to NEXT_PUBLIC_LASTFM_API_KEY when LASTFM_API_KEY is not set', async () => {
		delete process.env.LASTFM_API_KEY;
		process.env.NEXT_PUBLIC_LASTFM_API_KEY = 'test-public-key';

		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ recenttracks: { track: [] } }),
		});

		const response = await GET();
		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('api_key=test-public-key'),
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('handles both LASTFM_API_KEY and NEXT_PUBLIC_LASTFM_API_KEY being unset', async () => {
		delete process.env.LASTFM_API_KEY;
		delete process.env.NEXT_PUBLIC_LASTFM_API_KEY;

		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => ({ recenttracks: { track: [] } }),
		});

		const response = await GET();
		expect(response.status).toBe(200);
		expect(fetch).toHaveBeenCalledWith(
			expect.stringContaining('api_key=&'),
			expect.objectContaining({ method: 'GET' })
		);
	});

	it('handles upstream error response', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			status: 403,
		});

		const response = await GET();
		expect(response.status).toBe(403);
		const data = await response.json();
		expect(data).toEqual({ error: 'Failed to fetch Last.fm stats' });
	});

	it('handles network or fetch exception with status 502', async () => {
		(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data).toEqual({ error: 'Failed to fetch Last.fm stats' });
	});
});
