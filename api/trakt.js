import { DEFAULT_BROWSER_UA } from "../src/lib/mal-utils.js";
import { jsonError, jsonOk } from "../src/lib/response.js";

const DIRECT_ENDPOINTS = new Map([
	["stats", "stats"],
	["recent-movies", "history/movies?limit=25"],
	["recent-episodes", "history/shows?limit=25"],
]);

const PAGINATED_ENDPOINTS = new Map([
	["watchlist-movies", "watchlist/movies/released"],
	["watchlist-shows", "watchlist/shows/released"],
]);

export function getTraktUsername() {
	return (
		process.env.TRAKT_USERNAME ||
		process.env.NEXT_PUBLIC_TRAKT_USERNAME ||
		"noahffiliation"
	);
}

export function getTraktHeaders() {
	const apiKey =
		process.env.TRAKT_API_KEY || process.env.NEXT_PUBLIC_TRAKT_API_KEY || "";
	return {
		"Content-Type": "application/json",
		"trakt-api-version": "2",
		"trakt-api-key": apiKey,
		"User-Agent": DEFAULT_BROWSER_UA,
	};
}

async function fetchTrakt(endpointPath) {
	const username = encodeURIComponent(getTraktUsername());
	const response = await fetch(
		`https://api.trakt.tv/users/${username}/${endpointPath}`,
		{
			method: "GET",
			headers: getTraktHeaders(),
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch Trakt endpoint: ${endpointPath}`);
	}

	return response;
}

async function fetchTraktPaginated(endpointPath) {
	const username = encodeURIComponent(getTraktUsername());
	const limit = 250;
	const baseUrl = `https://api.trakt.tv/users/${username}/${endpointPath}`;
	const response = await fetch(`${baseUrl}?limit=${limit}&page=1`, {
		method: "GET",
		headers: getTraktHeaders(),
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch Trakt paginated: ${endpointPath}`);
	}

	const pageCountHeader = response.headers.get("X-Pagination-Page-Count");
	const pageCount = pageCountHeader ? Number.parseInt(pageCountHeader, 10) : 1;
	let allItems = await response.json();

	if (pageCount > 1) {
		const promises = [];
		for (let p = 2; p <= pageCount; p++) {
			promises.push(
				fetch(`${baseUrl}?limit=${limit}&page=${p}`, {
					method: "GET",
					headers: getTraktHeaders(),
				}).then(async (res) => {
					if (!res.ok) throw new Error(`Failed to fetch page ${p}`);
					return res.json();
				}),
			);
		}
		const remainingPages = await Promise.all(promises);
		for (const pageData of remainingPages) {
			allItems = allItems.concat(pageData);
		}
	}

	return allItems;
}

export async function GET(request) {
	const { searchParams } = new URL(request.url, "http://localhost");
	const endpoint = searchParams.get("endpoint") ?? "";

	try {
		const directPath = DIRECT_ENDPOINTS.get(endpoint);
		if (directPath) {
			const res = await fetchTrakt(directPath);
			return jsonOk(await res.json());
		}

		const paginatedPath = PAGINATED_ENDPOINTS.get(endpoint);
		if (paginatedPath) {
			return jsonOk(await fetchTraktPaginated(paginatedPath));
		}

		if (endpoint === "watched-shows") {
			const res = await fetchTrakt("watched/shows?limit=1&page=1");
			const itemCountHeader = res.headers.get("X-Pagination-Item-Count");
			const count = itemCountHeader
				? Number.parseInt(itemCountHeader, 10)
				: (await res.json()).length;
			return jsonOk({ count });
		}

		return jsonError("Invalid or missing endpoint parameter", 400);
	} catch {
		return jsonError("Failed to fetch Trakt data", 502);
	}
}
