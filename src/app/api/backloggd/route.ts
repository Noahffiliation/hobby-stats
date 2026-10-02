import {
  BACKLOG_REGEX,
  fetchBackloggdHtml,
  getBackloggdUsername,
  PLAYED_REGEX,
} from "./utils";

export const revalidate = 3600;

export { getBackloggdCookie, getBackloggdUsername } from "./utils";

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

  return Response.json(
    { error: "Failed to fetch Backloggd stats" },
    { status: 502 },
  );
}
