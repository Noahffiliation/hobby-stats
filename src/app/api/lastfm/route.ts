export const revalidate = 3600;

export function getLastfmUsername(): string {
	return process.env.NEXT_PUBLIC_LASTFM_USERNAME || 'noahffiliation';
}

export async function GET() {
	const username = getLastfmUsername();
	const apiKey = process.env.LASTFM_API_KEY || process.env.NEXT_PUBLIC_LASTFM_API_KEY || '';

	try {
		const response = await fetch(
			`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json`,
			{
				method: 'GET',
				headers: {
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
					Accept: 'application/json',
				},
			}
		);

		if (!response.ok) {
			return Response.json({ error: 'Failed to fetch Last.fm stats' }, { status: response.status });
		}

		const data = await response.json();
		return Response.json(data);
	} catch {
		return Response.json({ error: 'Failed to fetch Last.fm stats' }, { status: 502 });
	}
}
