import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Loader, LoaderContext } from "astro/loaders";
import { resolvePostedAt } from "../utils/memo-schema.ts";
import { MemoParseError, parseMemo } from "../utils/parse-memo.ts";

/*
  メモのコンテンツローダー。1 ファイル = 1 メモで、id はファイル名（拡張子なし）。
  標準の glob ローダーは 1 ファイルに本文を 1 つしか持てないので、書き込みごとに分けるために作っている。
  検証はここで行い、誤りはファイル名と行番号つきで投げる
*/

const MEMO_DIR = "src/content/memos";

// Markdown の変換は見出しに必ず id を付ける。一覧では複数のメモが並び、同じ文言の見出しで id が重なるので外す。
// コードの中の `<h2 id="">` はエスケープ済み（&lt;）なので当たらない
const HEADING_ID_PATTERN = /(<h[1-6]\b[^>]*?)\s+id="[^"]*"/g;

function removeHeadingIds({ html }: { html: string }): string {
	return html.replace(HEADING_ID_PATTERN, "$1");
}

/** 1 ファイルを読み、store に入れる。書き込みがない（見出しだけの）ファイルは store から外す */
async function syncMemo({
	context: { generateDigest, renderMarkdown, store },
	path,
	root,
}: {
	context: LoaderContext;
	path: string;
	root: string;
}): Promise<void> {
	const id = basename(path, ".md");
	const source = await readFile(path, "utf-8");
	const digest = generateDigest(source);
	if (store.get(id)?.digest === digest) return;

	const filePath = relative(root, path);
	let notes: ReturnType<typeof resolvePostedAt>;
	try {
		notes = resolvePostedAt({ notes: parseMemo({ source }) });
	} catch (error) {
		if (error instanceof MemoParseError) {
			throw new Error(`${filePath}:${error.line} ${error.message}`, {
				cause: error,
			});
		}
		throw error;
	}

	if (notes.length === 0) {
		store.delete(id);
		return;
	}

	const fileURL = pathToFileURL(path);
	const renderedNotes = await Promise.all(
		notes.map(async ({ markdown, postedAt }) => {
			const { html } = await renderMarkdown(markdown, { fileURL });
			return { html: removeHeadingIds({ html }), postedAt };
		}),
	);
	store.set({ data: { notes: renderedNotes }, digest, filePath, id });
}

export function memoLoader(): Loader {
	return {
		load: async (context) => {
			const { config, logger, store, watcher } = context;
			const root = fileURLToPath(config.root);
			const dir = join(root, MEMO_DIR);
			const isMemoPath = (path: string): boolean =>
				dirname(path) === dir && extname(path) === ".md";

			// 最初の読み込みが書式の誤りで落ちても、直したファイルを拾えるよう先に見張る
			if (watcher) {
				watcher.add(dir);
				const onChange = async (path: string): Promise<void> => {
					if (!isMemoPath(path)) return;
					try {
						await syncMemo({ context, path, root });
					} catch (error) {
						// 開発サーバーは落とさず、直すまで前の内容のまま出す
						logger.error(
							error instanceof Error ? error.message : String(error),
						);
					}
				};
				watcher.on("add", onChange);
				watcher.on("change", onChange);
				watcher.on("unlink", (path) => {
					if (isMemoPath(path)) store.delete(basename(path, ".md"));
				});
			}

			const files = existsSync(dir)
				? (await readdir(dir)).map((file) => join(dir, file)).filter(isMemoPath)
				: [];
			const staleIds = new Set(store.keys());
			for (const path of files) {
				staleIds.delete(basename(path, ".md"));
				await syncMemo({ context, path, root });
			}
			for (const id of staleIds) {
				store.delete(id);
			}
		},
		name: "memo-loader",
	};
}
