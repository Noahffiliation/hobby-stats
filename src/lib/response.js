export const EDGE_CACHE_CONTROL =
	"public, s-maxage=3600, stale-while-revalidate=86400";

export function jsonOk(data, headers = {}) {
	return Response.json(data, {
		status: 200,
		headers: {
			"Cache-Control": EDGE_CACHE_CONTROL,
			...headers,
		},
	});
}

export function jsonError(message, status = 502) {
	return Response.json(
		{ error: message },
		{
			status,
			headers: {
				"Cache-Control": "no-store",
			},
		},
	);
}
