export const revalidate = 3600;

export function getTraktUsername(): string {
	return process.env.NEXT_PUBLIC_TRAKT_USERNAME || 'noahffiliation';
}

export function getTraktHeaders(): HeadersInit {
	const apiKey = process.env.TRAKT_API_KEY || process.env.NEXT_PUBLIC_TRAKT_API_KEY || '';
	return {
		'Content-Type': 'application/json',
		'trakt-api-version': '2',
		'trakt-api-key': apiKey,
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
	};
}

async function fetchTrakt(endpointPath: string): Promise<Response> {
	const username = getTraktUsername();
	const response = await fetch(`https://api.trakt.tv/users/${username}/${endpointPath}`, {
		method: 'GET',
		headers: getTraktHeaders(),
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch Trakt endpoint: ${endpointPath}`);
	}

	return response;
}

async function fetchTraktPaginated<T>(endpointPath: string): Promise<T[]> {
	const username = getTraktUsername();
	const limit = 250;
	const baseUrl = `https://api.trakt.tv/users/${username}/${endpointPath}`;
	const response = await fetch(`${baseUrl}?limit=${limit}&page=1`, {
		method: 'GET',
		headers: getTraktHeaders(),
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch Trakt paginated: ${endpointPath}`);
	}

	const pageCountHeader = response.headers?.get?.('X-Pagination-Page-Count');
	const pageCount = pageCountHeader ? Number.parseInt(pageCountHeader, 10) : 1;
	let allItems: T[] = await response.json();

	if (pageCount > 1) {
		const promises = [];
		for (let p = 2; p <= pageCount; p++) {
			promises.push(
				fetch(`${baseUrl}?limit=${limit}&page=${p}`, {
					method: 'GET',
					headers: getTraktHeaders(),
				}).then(async res => {
					if (!res.ok) throw new Error(`Failed to fetch page ${p}`);
					return res.json() as Promise<T[]>;
				})
			);
		}
		const remainingPages = await Promise.all(promises);
		for (const pageData of remainingPages) {
			allItems = allItems.concat(pageData);
		}
	}

	return allItems;
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const endpoint = searchParams.get('endpoint');

	try {
		switch (endpoint) {
			case 'stats': {
				const res = await fetchTrakt('stats');
				const data = await res.json();
				return Response.json(data);
			}
			case 'watched-shows': {
				const res = await fetchTrakt('watched/shows?limit=1&page=1');
				const itemCountHeader = res.headers?.get?.('X-Pagination-Item-Count');
				let count: number;
				if (itemCountHeader) {
					count = Number.parseInt(itemCountHeader, 10);
				} else {
					const data = await res.json();
					count = data.length;
				}
				return Response.json({ count });
			}
			case 'watchlist-movies': {
				const data = await fetchTraktPaginated('watchlist/movies/released');
				return Response.json(data);
			}
			case 'watchlist-shows': {
				const data = await fetchTraktPaginated('watchlist/shows/released');
				return Response.json(data);
			}
			case 'recent-movies': {
				const res = await fetchTrakt('history/movies?limit=25');
				const data = await res.json();
				return Response.json(data);
			}
			case 'recent-episodes': {
				const res = await fetchTrakt('history/shows?limit=25');
				const data = await res.json();
				return Response.json(data);
			}
			default:
				return Response.json({ error: 'Invalid or missing endpoint parameter' }, { status: 400 });
		}
	} catch {
		return Response.json({ error: 'Failed to fetch Trakt data' }, { status: 502 });
	}
}
