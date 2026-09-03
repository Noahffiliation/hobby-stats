import { GET, getTraktHeaders, getTraktUsername } from '../route';

globalThis.fetch = jest.fn();

describe('Trakt API Route', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		process.env.TRAKT_API_KEY = 'test-server-trakt-key';
		delete process.env.NEXT_PUBLIC_TRAKT_API_KEY;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_TRAKT_USERNAME = 'custom_trakt';
		expect(getTraktUsername()).toBe('custom_trakt');
		delete process.env.NEXT_PUBLIC_TRAKT_USERNAME;
		expect(getTraktUsername()).toBe('noahffiliation');
	});

	it('resolves correct headers with TRAKT_API_KEY and fallback', () => {
		expect(getTraktHeaders()).toEqual({
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': 'test-server-trakt-key',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		});

		delete process.env.TRAKT_API_KEY;
		process.env.NEXT_PUBLIC_TRAKT_API_KEY = 'fallback-public-key';
		expect(getTraktHeaders()).toEqual({
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': 'fallback-public-key',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		});

		delete process.env.NEXT_PUBLIC_TRAKT_API_KEY;
		expect(getTraktHeaders()).toEqual({
			'Content-Type': 'application/json',
			'trakt-api-version': '2',
			'trakt-api-key': '',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
		});
	});

	it('returns 400 for missing or invalid endpoint', async () => {
		const req = new Request('http://localhost/api/trakt');
		const res = await GET(req);
		expect(res.status).toBe(400);
		const data = await res.json();
		expect(data).toEqual({ error: 'Invalid or missing endpoint parameter' });

		const reqInvalid = new Request('http://localhost/api/trakt?endpoint=invalid-ep');
		const resInvalid = await GET(reqInvalid);
		expect(resInvalid.status).toBe(400);
	});

	it('fetches stats endpoint successfully', async () => {
		const mockStats = { movies: { watched: 120 } };
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => mockStats,
		});

		const req = new Request('http://localhost/api/trakt?endpoint=stats');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual(mockStats);
		expect(fetch).toHaveBeenCalledWith('https://api.trakt.tv/users/noahffiliation/stats', expect.any(Object));
	});

	it('fetches watched-shows endpoint with header count', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			headers: { get: (header: string) => (header === 'X-Pagination-Item-Count' ? '45' : null) },
			json: async () => [{ title: 'Show 1' }],
		});

		const req = new Request('http://localhost/api/trakt?endpoint=watched-shows');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ count: 45 });
	});

	it('fetches watched-shows endpoint falling back to array length when header is missing', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			headers: { get: () => null },
			json: async () => [{ title: 'Show 1' }, { title: 'Show 2' }],
		});

		const req = new Request('http://localhost/api/trakt?endpoint=watched-shows');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ count: 2 });
	});

	it('fetches watchlist-movies with pagination support', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				headers: { get: (header: string) => (header === 'X-Pagination-Page-Count' ? '2' : null) },
				json: async () => [{ movie: { title: 'Movie 1' } }],
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [{ movie: { title: 'Movie 2' } }],
			});

		const req = new Request('http://localhost/api/trakt?endpoint=watchlist-movies');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual([{ movie: { title: 'Movie 1' } }, { movie: { title: 'Movie 2' } }]);
	});

	it('fetches watchlist-shows single page', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			headers: { get: () => null },
			json: async () => [{ show: { title: 'Show 1' } }],
		});

		const req = new Request('http://localhost/api/trakt?endpoint=watchlist-shows');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual([{ show: { title: 'Show 1' } }]);
	});

	it('fetches recent-movies successfully', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => [{ id: 1, movie: { title: 'Recent 1' } }],
		});

		const req = new Request('http://localhost/api/trakt?endpoint=recent-movies');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual([{ id: 1, movie: { title: 'Recent 1' } }]);
	});

	it('fetches recent-episodes successfully', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			json: async () => [{ id: 1, episode: { season: 1, number: 1 } }],
		});

		const req = new Request('http://localhost/api/trakt?endpoint=recent-episodes');
		const res = await GET(req);
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual([{ id: 1, episode: { season: 1, number: 1 } }]);
	});

	it('handles upstream fetch failure with status 502', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
		});

		const req = new Request('http://localhost/api/trakt?endpoint=stats');
		const res = await GET(req);
		expect(res.status).toBe(502);
		const data = await res.json();
		expect(data).toEqual({ error: 'Failed to fetch Trakt data' });
	});

	it('handles paginated fetch failure on page 1 with status 502', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
		});

		const req = new Request('http://localhost/api/trakt?endpoint=watchlist-movies');
		const res = await GET(req);
		expect(res.status).toBe(502);
		const data = await res.json();
		expect(data).toEqual({ error: 'Failed to fetch Trakt data' });
	});

	it('handles pagination failure on subsequent page with status 502', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				headers: { get: (header: string) => (header === 'X-Pagination-Page-Count' ? '2' : null) },
				json: async () => [{ movie: { title: 'Movie 1' } }],
			})
			.mockResolvedValueOnce({
				ok: false,
			});

		const req = new Request('http://localhost/api/trakt?endpoint=watchlist-movies');
		const res = await GET(req);
		expect(res.status).toBe(502);
		const data = await res.json();
		expect(data).toEqual({ error: 'Failed to fetch Trakt data' });
	});
});
