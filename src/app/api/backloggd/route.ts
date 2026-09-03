export const revalidate = 3600;

export function getBackloggdUsername(): string {
	return process.env.NEXT_PUBLIC_BACKLOGGD_USERNAME || 'Noahffiliation';
}

const PLAYED_REGEX = /href="\/u\/[^/]+\/played\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;
const BACKLOG_REGEX = /href="\/u\/[^/]+\/backlog\/[^"]*"[^>]*>\s*<h\d+>\s*([0-9,]+)\s*<\/h\d+>/i;

export async function GET() {
	const username = getBackloggdUsername();
	try {
		const response = await fetch(`https://backloggd.com/u/${username}/`, {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			},
		});

		if (response.ok) {
			const html = await response.text();
			const playedMatch = PLAYED_REGEX.exec(html);
			const backlogMatch = BACKLOG_REGEX.exec(html);

			if (playedMatch && backlogMatch) {
				return Response.json({
					played: Number.parseInt(playedMatch[1].replaceAll(',', ''), 10),
					backlog: Number.parseInt(backlogMatch[1].replaceAll(',', ''), 10),
				});
			}
		}
	} catch {
		// Handled by returning fallback below
	}

	return Response.json({ error: 'Failed to fetch Backloggd stats' }, { status: 502 });
}
