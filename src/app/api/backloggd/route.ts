import {
  BACKLOG_REGEX,
  fetchBackloggdHtml,
  getBackloggdUsername,
  PLAYED_REGEX,
} from "./utils";

export const revalidate = 3600;

export { getBackloggdCookie, getBackloggdUsername } from "./utils";

export function getBackloggdFallbackStats(): {
  played: number;
  backlog: number;
} | null {
  const playedStr =
    process.env.BACKLOGGD_PLAYED || process.env.NEXT_PUBLIC_BACKLOGGD_PLAYED;
  const backlogStr =
    process.env.BACKLOGGD_BACKLOG || process.env.NEXT_PUBLIC_BACKLOGGD_BACKLOG;

  if (playedStr !== undefined && backlogStr !== undefined) {
    const played = Number.parseInt(playedStr, 10);
    const backlog = Number.parseInt(backlogStr, 10);
    if (!Number.isNaN(played) && !Number.isNaN(backlog)) {
      return { played, backlog };
    }
  }
  return null;
}

export async function GET() {
  const username = getBackloggdUsername();
  const html = await fetchBackloggdHtml(`https://backloggd.com/u/${username}/`);

  if (html) {
    const playedMatch = PLAYED_REGEX.exec(html);
    const backlogMatch = BACKLOG_REGEX.exec(html);

    if (playedMatch && backlogMatch) {
      return Response.json({
        played: Number.parseInt(playedMatch[1].replaceAll(",", ""), 10),
        backlog: Number.parseInt(backlogMatch[1].replaceAll(",", ""), 10),
      });
    }
  }

  const fallback = getBackloggdFallbackStats();
  if (fallback) {
    return Response.json(fallback);
  }

  return Response.json(
    { error: "Failed to fetch Backloggd stats" },
    { status: 502 },
  );
}
