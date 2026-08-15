export const revalidate = 3600;

export function getMalUsername(): string {
	return process.env.NEXT_PUBLIC_MAL_USERNAME || 'Noahffiliation';
}

const COMPLETED_REGEX = /href="[^"]*status=2"[^>]*>[^<]*<\/a>\s*<span[^>]*>([0-9,]+)<\/span>/i;
const PTW_REGEX = /href="[^"]*status=6"[^>]*>[^<]*<\/a>\s*<span[^>]*>([0-9,]+)<\/span>/i;

export async function GET() {
	const username = getMalUsername();
	try {
		const response = await fetch(`https://myanimelist.net/profile/${username}`, {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			},
		});

		if (response.ok) {
			const html = await response.text();
			const completedMatch = COMPLETED_REGEX.exec(html);
			const ptwMatch = PTW_REGEX.exec(html);

			if (completedMatch && ptwMatch) {
				return Response.json({
					completed: Number.parseInt(completedMatch[1].replaceAll(',', ''), 10),
					planToWatch: Number.parseInt(ptwMatch[1].replaceAll(',', ''), 10),
				});
			}
		}
	} catch {
		// Handled by returning fallback below
	}

	return Response.json({ error: 'Failed to fetch MyAnimeList stats' }, { status: 502 });
}
