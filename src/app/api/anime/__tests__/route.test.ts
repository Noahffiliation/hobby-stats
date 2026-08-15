import { GET, getMalUsername } from '../route';

globalThis.fetch = jest.fn();

describe('Anime API Route', () => {
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

	it('returns parsed planToWatch, completed lists, and profile stats when MAL fetch succeeds', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{ anime_id: 101, anime_title: 'Anime PTW', anime_title_eng: 'Anime PTW Eng', anime_num_episodes: 12, anime_media_type_string: 'TV' },
					{ anime_id: 102, anime_title: 'Anime PTW Jap Only' },
				],
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [
					{ anime_id: 201, anime_title: 'Anime Comp', anime_num_episodes: 24, num_watched_episodes: 24, score: 8, anime_media_type_string: 'TV' },
				],
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<li class="clearfix mb12"><a href="https://myanimelist.net/animelist/Noahffiliation?status=2" class="di-ib fl-l lh10 circle anime completed">Completed</a><span class="di-ib fl-r lh10">352</span></li>
					<li class="clearfix mb12"><a href="https://myanimelist.net/animelist/Noahffiliation?status=6" class="di-ib fl-l lh10 circle anime plan_to_watch">Plan to Watch</a><span class="di-ib fl-r lh10">325</span></li>
				`,
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalPlanToWatch).toBe(325);
		expect(data.totalCompleted).toBe(352);
		expect(data.planToWatch).toEqual([
			{ id: 101, title: 'Anime PTW Eng', episodes: 12, mediaType: 'TV' },
			{ id: 102, title: 'Anime PTW Jap Only', episodes: undefined, mediaType: undefined },
		]);
		expect(data.completed).toEqual([
			{ id: 201, title: 'Anime Comp', episodes: 24, watchedEpisodes: 24, score: 8, mediaType: 'TV' },
		]);
	});

	it('falls back to array lengths when profile fetch is not ok', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [{ anime_id: 101, anime_title: 'Anime 1' }],
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => [{ anime_id: 201, anime_title: 'Anime 2' }],
			})
			.mockResolvedValueOnce({
				ok: false,
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalPlanToWatch).toBe(1);
		expect(data.totalCompleted).toBe(1);
	});

	it('returns 502 when fetch is not ok', async () => {
		(fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
		});

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data).toEqual({ error: 'Failed to fetch anime list' });
	});

	it('returns 502 when fetch throws', async () => {
		(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data).toEqual({ error: 'Failed to fetch anime list' });
	});
});
