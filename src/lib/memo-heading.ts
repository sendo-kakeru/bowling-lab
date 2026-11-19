import { formatIsoDate, formatTime } from "./date.ts";

/*
  メモの書き込みの区切りになる見出し（`## 2026-11-06 21:14`）。
  ローダーの読み取りと、メモを作るコマンド（#20）の書き込みで同じ書式を使う
*/

/** 見出しの行。1 つ目のグループが日時（`2026-11-06 21:14`）。行末の空白はエディタが残しがちなので許す */
const MEMO_HEADING_PATTERN = /^## (\d{4}-\d{2}-\d{2} \d{2}:\d{2})[ \t]*$/;

/** 日本時間の日時から見出しの行を作る。例: `## 2026-11-06 21:14` */
export function formatMemoHeading({ date }: { date: Date }): string {
	return `## ${formatIsoDate({ date })} ${formatTime({ date })}`;
}

/** 見出しの行なら日時の文字列（`2026-11-06 21:14`）を返す。見出しでなければ undefined */
export function matchMemoHeading({
	line,
}: {
	line: string;
}): string | undefined {
	return MEMO_HEADING_PATTERN.exec(line)?.[1];
}
