import {
  COMPLETED_REGEX,
  fetchMdlHtml,
  getMdlUsername,
  PTW_REGEX,
} from "./utils";

export const revalidate = 3600;

export { getCurlBin, getMdlProxyUrl, getMdlUsername } from "./utils";

function countRows(html: string): number {
  return [...html.matchAll(/<tr id="ml\d+">/gi)].length;
}

async function countTotalRows(statusPath: string): Promise<number> {
  const username = getMdlUsername();
  let total = 0;
  let page = 1;

  while (page <= 10) {
    const url = `https://mydramalist.com/dramalist/${username}/${statusPath}`;
    const html =
      page === 1
        ? await fetchMdlHtml(url)
        : await fetchMdlHtml(url, { page, username });
    if (!html) break;
    const rows = countRows(html);
    if (rows === 0) break;
    total += rows;
    if (rows < 100) break;
    page++;
  }

  return total;
}

export function getMdlFallbackStats(): {
  completed: number;
  planToWatch: number;
} | null {
  const completedStr =
    process.env.MDL_COMPLETED || process.env.NEXT_PUBLIC_MDL_COMPLETED;
  const ptwStr =
    process.env.MDL_PLAN_TO_WATCH || process.env.NEXT_PUBLIC_MDL_PLAN_TO_WATCH;

  if (completedStr !== undefined && ptwStr !== undefined) {
    const completed = Number.parseInt(completedStr, 0);
    const planToWatch = Number.parseInt(ptwStr, 0);
    if (!Number.isNaN(completed) && !Number.isNaN(planToWatch)) {
      return { completed, planToWatch };
    }
  }
  return null;
}

export function parseMdlProfileStats(html: string | null): {
  completed?: number;
  planToWatch?: number;
} {
  if (!html) return {};
  const completedMatch = COMPLETED_REGEX.exec(html);
  const ptwMatch = PTW_REGEX.exec(html);

  return {
    completed: completedMatch
      ? Number.parseInt(completedMatch[1].replaceAll(",", ""), 10)
      : undefined,
    planToWatch: ptwMatch
      ? Number.parseInt(ptwMatch[1].replaceAll(",", ""), 10)
      : undefined,
  };
}

async function resolveStatsCount(
  current: number | undefined,
  statusPath: "completed" | "plan_to_watch",
): Promise<number | undefined> {
  if (current !== undefined) return current;
  const total = await countTotalRows(statusPath);
  return total > 0 ? total : undefined;
}

export async function GET() {
  const username = getMdlUsername();
  const mainHtml = await fetchMdlHtml(
    `https://mydramalist.com/dramalist/${username}`,
  );

  let { completed, planToWatch } = parseMdlProfileStats(mainHtml);

  completed = await resolveStatsCount(completed, "completed");
  planToWatch = await resolveStatsCount(planToWatch, "plan_to_watch");

  if (completed === undefined || planToWatch === undefined) {
    const fallback = getMdlFallbackStats();
    if (fallback) {
      completed ??= fallback.completed;
      planToWatch ??= fallback.planToWatch;
    }
  }

  if (completed !== undefined && planToWatch !== undefined) {
    return Response.json({
      completed,
      planToWatch,
    });
  }

  return Response.json(
    { error: "Failed to fetch MyDramaList stats" },
    { status: 502 },
  );
}
