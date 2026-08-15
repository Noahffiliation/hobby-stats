import { COMPLETED_REGEX, fetchMdlHtml, getMdlUsername, PTW_REGEX } from './utils';

export const revalidate = 3600;

export { getCurlBin, getMdlUsername } from './utils';

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
