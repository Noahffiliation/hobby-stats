import { execFile } from 'node:child_process';

export const revalidate = 3600;

export function getMdlUsername(): string {
	return process.env.NEXT_PUBLIC_MDL_USERNAME || 'Noahffiliation';
}

export function getCurlBin(): string {
	return process.platform === 'win32' ? String.raw`C:\Windows\System32\curl.exe` : '/usr/bin/curl';
}

const COMPLETED_REGEX = /Completed[^(]*\(([\d,]+)\)/i;
const PTW_REGEX = /Plan to Watch[^(]*\(([\d,]+)\)/i;

async function fetchMdlHtml(url: string, postJson?: { page: number; username: string }): Promise<string | null> {
	try {
		const response = await fetch(url, {
			method: postJson ? 'POST' : 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				Accept: postJson ? 'text/html, */*; q=0.01' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				...(postJson ? { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' } : {}),
			},
			...(postJson ? { body: JSON.stringify(postJson) } : {}),
		});

		if (response.ok) {
			const text = await response.text();
			if (!text.includes('Just a moment...')) {
				return text;
			}
		}
	} catch {
		// Ignore and try fallback below
	}

	return new Promise<string | null>((resolve) => {
		try {
			const args = [
				'-s',
				'-A',
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				'-H',
				postJson ? 'Accept: text/html, */*; q=0.01' : 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'-H',
				'Accept-Language: en-US,en;q=0.9',
			];

			if (postJson) {
				args.push(
					'-H',
					'X-Requested-With: XMLHttpRequest',
					'-H',
					'Content-Type: application/json',
					'-X',
					'POST',
					'-d',
					JSON.stringify(postJson)
				);
			}

			args.push(url);

			execFile(
				getCurlBin(),
				args,
				{ maxBuffer: 20 * 1024 * 1024 },
				(error, stdout) => {
					if (error || !stdout || stdout.includes('Just a moment...')) {
						resolve(null);
					} else {
						resolve(stdout);
					}
				}
			);
		} catch {
			resolve(null);
		}
	});
}

function countRows(html: string): number {
	return [...html.matchAll(/<tr id="ml\d+">/gi)].length;
}

async function countTotalRows(statusPath: string): Promise<number> {
	const username = getMdlUsername();
	let total = 0;
	let page = 1;

	while (page <= 10) {
		const url = `https://mydramalist.com/dramalist/${username}/${statusPath}`;
		const html = page === 1 ? await fetchMdlHtml(url) : await fetchMdlHtml(url, { page, username });
		if (!html) break;
		const rows = countRows(html);
		if (rows === 0) break;
		total += rows;
		if (rows < 100) break;
		page++;
	}

	return total;
}

export async function GET() {
	const username = getMdlUsername();
	const mainHtml = await fetchMdlHtml(`https://mydramalist.com/dramalist/${username}`);

	let completed: number | undefined;
	let planToWatch: number | undefined;

	if (mainHtml) {
		const completedMatch = COMPLETED_REGEX.exec(mainHtml);
		const ptwMatch = PTW_REGEX.exec(mainHtml);

		if (completedMatch) {
			completed = Number.parseInt(completedMatch[1].replaceAll(',', ''), 10);
		}
		if (ptwMatch) {
			planToWatch = Number.parseInt(ptwMatch[1].replaceAll(',', ''), 10);
		}
	}

	if (completed === undefined) {
		const compTotal = await countTotalRows('completed');
		if (compTotal > 0) completed = compTotal;
	}

	if (planToWatch === undefined) {
		const ptwTotal = await countTotalRows('plan_to_watch');
		if (ptwTotal > 0) planToWatch = ptwTotal;
	}

	if (completed !== undefined && planToWatch !== undefined) {
		return Response.json({
			completed,
			planToWatch,
		});
	}

	return Response.json({ error: 'Failed to fetch MyDramaList stats' }, { status: 502 });
}
