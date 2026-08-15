import { GET, getCurlBin, getMdlUsername, parseMdlRows, parseSingleDramaRow } from '../route';
import { execFile } from 'node:child_process';

globalThis.fetch = jest.fn();
jest.mock('node:child_process', () => ({
	execFile: jest.fn(),
}));

describe('Dramas API Route', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
		(fetch as jest.Mock).mockClear();
		(execFile as unknown as jest.Mock).mockReset();
		(execFile as unknown as jest.Mock).mockImplementation((_cmd, _args, _opts, cb) => cb(new Error('curl disabled in test'), ''));
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	it('resolves username from env or default', () => {
		process.env.NEXT_PUBLIC_MDL_USERNAME = 'custom_mdl';
		expect(getMdlUsername()).toBe('custom_mdl');
		delete process.env.NEXT_PUBLIC_MDL_USERNAME;
		expect(getMdlUsername()).toBe('Noahffiliation');
	});

	it('returns appropriate curl binary for platform', () => {
		const originalPlatform = process.platform;
		Object.defineProperty(process, 'platform', { value: 'win32' });
		expect(getCurlBin()).toBe(String.raw`C:\Windows\System32\curl.exe`);

		Object.defineProperty(process, 'platform', { value: 'linux' });
		expect(getCurlBin()).toBe('/usr/bin/curl');

		Object.defineProperty(process, 'platform', { value: originalPlatform });
	});

	it('tests parseMdlRows and parseSingleDramaRow edge cases directly', () => {
		expect(parseMdlRows(null)).toEqual([]);
		expect(parseMdlRows('')).toEqual([]);
		expect(parseSingleDramaRow('<td>No title here</td>')).toBeNull();
		const item = parseSingleDramaRow(`
			<div class="msv2-item--title"><a title="Sample&#39;s &amp; &quot;Movie&quot;"></a></div>
			<td class="msv2-i-year">2022</td>
			<td class="msv2-i-type">Drama</td>
			<td class="msv2-i-country">Japan</td>
			<td class="msv2-i-score"><span class="score">8.5</span></td>
			<td class="msv2-i-progress"><div><span class="num-seen">10</span>/<span class="num-total">10</span></div></td>
		`);
		expect(item).toEqual({
			title: 'Sample\'s & "Movie"',
			year: '2022',
			type: 'Drama',
			country: 'Japan',
			score: 8.5,
			episodes: '10/10',
		});
	});

	it('returns planToWatch and completed drama lists with parsed counts across multiple pages when fetch succeeds', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<a class="nav-link" href="/dramalist/Noahffiliation/completed">Completed (205)</a>
					<a class="nav-link" href="/dramalist/Noahffiliation/plan_to_watch">Plan to Watch (237)</a>
				`,
			})
			// completed page 1 (100 rows)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => Array.from({ length: 100 }, (_, i) => `
					<tr id="ml${i + 1}">
						<td class="msv2-i-title"><div class="msv2-item--title"><a title="Drama ${i + 1}"><span>Drama ${i + 1}</span></a></div></td>
						<td class="msv2-i-year">2010</td>
						<td class="msv2-i-type">Movie</td>
						<td class="msv2-i-country">Japan</td>
						<td class="msv2-i-score"><span class="score">9.0</span></td>
						<td class="msv2-i-progress"><div><span class="num-seen">1</span>/<span class="num-total">1</span></div></td>
					</tr>
				`).join(''),
			})
			// plan to watch page 1 (1 row)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<tr id="ml200">
						<td class="msv2-i-title"><a class="title"><span>Moving Season 2</span></a></td>
						<td class="msv2-i-year">2026</td>
						<td class="msv2-i-type">Drama</td>
						<td class="msv2-i-country">South Korea</td>
						<td class="msv2-i-score"><span class="score">0.0</span></td>
						<td class="msv2-i-progress"><div><span class="num-seen">0</span>/<span class="num-total">16</span></div></td>
					</tr>
				`,
			})
			// completed page 2 (1 row)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<tr id="ml101">
						<td class="msv2-i-title"><div class="msv2-item--title"><a title="Drama 101"><span>Drama 101</span></a></div></td>
					</tr>
				`,
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalCompleted).toBe(205);
		expect(data.totalPlanToWatch).toBe(237);
		expect(data.completed).toHaveLength(101);
		expect(data.planToWatch).toHaveLength(1);
		expect(data.completed[0].title).toBe('Drama 1');
		expect(data.completed[100].title).toBe('Drama 101');
		expect(data.planToWatch[0].title).toBe('Moving Season 2');
	});

	it('handles when page 2 fetch fails or returns null during pagination', async () => {
		(fetch as jest.Mock)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => '<html><body>No stats</body></html>',
			})
			// completed page 1 (100 rows)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => Array.from({ length: 100 }, (_, i) => `
					<tr id="ml${i + 1}">
						<td class="msv2-i-title"><div class="msv2-item--title"><a title="Drama ${i + 1}"><span>Drama ${i + 1}</span></a></div></td>
					</tr>
				`).join(''),
			})
			// plan to watch page 1 (1 row)
			.mockResolvedValueOnce({
				ok: true,
				text: async () => `
					<tr id="ml1">
						<td class="msv2-i-title"><a class="title"><span>PTW 1</span></a></td>
					</tr>
				`,
			})
			// completed page 2 fails
			.mockResolvedValueOnce({
				ok: false,
			});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalCompleted).toBe(100);
		expect(data.totalPlanToWatch).toBe(1);
		expect(data.completed).toHaveLength(100);
		expect(data.planToWatch).toHaveLength(1);
	});

	it('computes totals from row lengths and uses curl fallback with pagination', async () => {
		(fetch as jest.Mock).mockResolvedValue({
			ok: true,
			text: async () => 'Just a moment...',
		});

		(execFile as unknown as jest.Mock)
			// main
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, '<html><body>No stats header</body></html>'))
			// comp page 1 (100 rows)
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, Array.from({ length: 100 }, (_, i) => `
				<tr id="ml${i + 1}">
					<td class="msv2-i-title"><div class="msv2-item--title"><a title="Comp Drama ${i + 1}"></a></div></td>
				</tr>
			`).join('')))
			// ptw page 1 (1 row)
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, `
				<tr id="ml200">
					<td class="msv2-i-title"><div class="msv2-item--title"><a title="PTW Drama 1"></a></div></td>
				</tr>
			`))
			// comp page 2 (1 row)
			.mockImplementationOnce((_cmd, _args, _opts, cb) => cb(null, `
				<tr id="ml101">
					<td class="msv2-i-title"><div class="msv2-item--title"><a title="Comp Drama 101"></a></div></td>
				</tr>
			`));

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalCompleted).toBe(101);
		expect(data.totalPlanToWatch).toBe(1);
		expect(data.completed).toHaveLength(101);
		expect(data.planToWatch).toHaveLength(1);
	});

	it('handles curl returning error or challenge text cleanly', async () => {
		(fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
		(execFile as unknown as jest.Mock).mockImplementation((_cmd, _args, _opts, cb) => cb(null, 'Just a moment...'));

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalCompleted).toBeUndefined();
		expect(data.totalPlanToWatch).toBeUndefined();
		expect(data.completed).toEqual([]);
		expect(data.planToWatch).toEqual([]);
	});

	it('returns empty lists when both fetch and curl throw errors', async () => {
		(fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
		(execFile as unknown as jest.Mock).mockImplementation(() => {
			throw new Error('Sync throw in child_process');
		});

		const response = await GET();
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.totalCompleted).toBeUndefined();
		expect(data.totalPlanToWatch).toBeUndefined();
		expect(data.completed).toEqual([]);
		expect(data.planToWatch).toEqual([]);
	});
});
