import {
	aggregatePlayedGames,
	extractFulfilledText,
	GET,
	getBackloggdUsername,
	parseBacklogHtml,
	parseProfileStats,
	parseReviewCard,
	parseReviewsHtml,
} from '../route';

globalThis.fetch = jest.fn();

describe('Games API Route', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME = 'custom_backloggd';
		expect(getBackloggdUsername()).toBe('custom_backloggd');
		delete process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME;
		expect(getBackloggdUsername()).toBe('Noahffiliation');
	});

	it('tests parsing helpers edge cases directly', async () => {
		expect(parseProfileStats('<html><body>No stats</body></html>')).toEqual({
			totalPlayed: undefined,
			totalBacklog: undefined,
		});

		expect(parseBacklogHtml('Making sure you&#39;re not a bot!')).toEqual([]);
		expect(parseBacklogHtml('<div><img alt="" /></div>')).toEqual([]);

		expect(parseReviewCard('<div>no image</div>')).toBeNull();
		expect(parseReviewsHtml('Making sure you&#39;re not a bot!')).toEqual([]);

		expect(aggregatePlayedGames([])).toEqual([]);

		const fulfilledOk: PromiseSettledResult<Response> = {
			status: 'fulfilled',
			value: { ok: true, text: async () => 'sample text' } as unknown as Response,
		};
		const fulfilledNotOk: PromiseSettledResult<Response> = {
			status: 'fulfilled',
			value: { ok: false, text: async () => '' } as unknown as Response,
		};
		const rejectedRes: PromiseSettledResult<Response> = {
			status: 'rejected',
			reason: new Error('Rejected'),
		};

		expect(await extractFulfilledText(fulfilledOk)).toBe('sample text');
		expect(await extractFulfilledText(fulfilledNotOk)).toBeNull();
		expect(await extractFulfilledText(rejectedRes)).toBeNull();
	});

	it('parses live stats from profile, backlog games, and multi-page reviews', async () => {
		(fetch as jest.Mock)
			// Profile
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<a href="/u/Noahffiliation/played/release:desc/categories:games/">
						<h1>281</h1>
					</a>
					<a href="/u/Noahffiliation/backlog/release:desc/categories:games/">
						<h1>240</h1>
					</a>
				`,
			})
			// Backlog
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<div class="card mx-auto game-cover overlay-hide">
						<img alt="Scott Pilgrim EX" />
					</div>
					<div class="card mx-auto game-cover overlay-hide">
						<img alt="Guntouchables" />
					</div>
				`,
			})
			// Reviews Page 1
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<div>review-card
						<img alt="Big Walk" />
						<p class="mb-0 play-type completed">Completed</p>
						<a class="review-platform"><p class="mb-0">Windows PC</p></a>
						<time>Aug 10, 2026</time>
					</div>
				`,
			})
			// Reviews Page 2
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<div>review-card
						<img alt="Balatro" />
						<p class="mb-0 play-type mastered">Mastered</p>
						<a class="review-platform"><p class="mb-0">Windows PC</p></a>
						<time>Jan 15, 2026</time>
					</div>
				`,
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalPlayed).toBe(281);
		expect(data.totalBacklog).toBe(240);
		expect(data.backlog).toEqual([
			{ title: 'Scott Pilgrim EX' },
			{ title: 'Guntouchables' },
		]);
		expect(data.played).toEqual([
			{ title: 'Big Walk', status: 'Completed', platform: 'Windows PC', date: 'Aug 10, 2026' },
			{ title: 'Balatro', status: 'Mastered', platform: 'Windows PC', date: 'Jan 15, 2026' },
		]);
	});

	it('handles bot challenge or non-ok responses cleanly', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => 'Making sure you&#39;re not a bot!',
			})
			.mockResolvedValueOnce({
				ok: true,
				text: async () => 'Making sure you&#39;re not a bot!',
			})
			.mockResolvedValueOnce({
				ok: false,
			})
			.mockResolvedValueOnce({
				ok: false,
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalBacklog).toBeUndefined();
		expect(data.totalPlayed).toBeUndefined();
		expect(data.backlog).toEqual([]);
		expect(data.played).toEqual([]);
	});

	it('handles rejected fetches without throwing', async () => {
		(fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.backlog).toEqual([]);
		expect(data.played).toEqual([]);
	});

	it('returns 502 when unexpected exception occurs', async () => {
		const originalAllSettled = Promise.allSettled;
		Promise.allSettled = jest.fn().mockRejectedValueOnce(new Error('Unexpected Promise failure'));

		const response = await GET();
		expect(response.status).toBe(502);
		const data = await response.json();
		expect(data).toEqual({ error: 'Failed to fetch games data' });

		Promise.allSettled = originalAllSettled;
	});
});
