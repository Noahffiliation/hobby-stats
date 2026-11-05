export const MAL_COMPLETED_REGEX =
	/href="[^"]*status=2"[^>]*>[^<]*<\/a>\s*<span[^>]*>([0-9,]+)<\/span>/i;
export const MAL_PTW_REGEX =
	/href="[^"]*status=6"[^>]*>[^<]*<\/a>\s*<span[^>]*>([0-9,]+)<\/span>/i;

export const DEFAULT_BROWSER_UA =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function getMalUsername() {
	return (
		process.env.MAL_USERNAME ||
		process.env.NEXT_PUBLIC_MAL_USERNAME ||
		"Noahffiliation"
	);
}

export function parseCountMatch(regex, html) {
	const match = regex.exec(html);
	return match ? Number.parseInt(match[1].replaceAll(",", ""), 10) : undefined;
}

export function parseMalProfileCounts(html) {
	return {
		completed: parseCountMatch(MAL_COMPLETED_REGEX, html),
		planToWatch: parseCountMatch(MAL_PTW_REGEX, html),
	};
}
