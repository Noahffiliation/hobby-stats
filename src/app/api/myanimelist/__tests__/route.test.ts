import { GET, getMalUsername } from '../route';

globalThis.fetch = jest.fn();

describe('MyAnimeList API Route', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_MAL_USERNAME = 'custom_mal';
		expect(getMalUsername()).toBe('custom_mal');
		delete process.env.NEXT_PUBLIC_MAL_USERNAME;
		expect(getMalUsername()).toBe('Noahffiliation');
	});

	it('returns completed and planToWatch stats when HTML parsing succeeds', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => `
				<li class="clearfix mb12"><a href="https://myanimelist.net/animelist/Noahffiliation?status=2" class="di-ib fl-l lh10 circle anime completed">Completed</a><span class="di-ib fl-r lh10">352</span></li>
				<li class="clearfix mb12"><a href="https://myanimelist.net/animelist/Noahffiliation?status=6" class="di-ib fl-l lh10 circle anime plan_to_watch">Plan to Watch</a><span class="di-ib fl-r lh10">325</span></li>
			`,
		});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data).toEqual({ completed: 352, planToWatch: 325 });
	});

	it('returns 502 error when fetch response is not ok', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
		});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyAnimeList stats');
	});

	it('returns 502 error when HTML cannot be parsed', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			text: async () => '<html><body>No stats</body></html>',
		});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyAnimeList stats');
	});

	it('returns 502 error when fetch throws an error', async () => {
		(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data.error).toBe('Failed to fetch MyAnimeList stats');
	});
});
