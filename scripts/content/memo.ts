import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
	MEMO_DIR,
	type MemoChange,
	type MemoFile,
	planAddNote,
	planNewMemo,
} from "./memo-plan.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");

const memoPath = ({ id }: { id: string }): string => `${MEMO_DIR}/${id}.md`;

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}

async function main(): Promise<void> {
	const { positionals } = parseArgs({ allowPositionals: true });
	const [command, id, ...rest] = positionals;
	const memos = await readMemos();
	const now = new Date();
	let change: MemoChange;
	if (command === "new" && id === undefined) {
		change = planNewMemo({ memos, now });
	} else if (command === "add" && rest.length === 0) {
		change = planAddNote({ id, memos, now });
	} else {
		throw new Error("使い方: memo.ts new | memo.ts add [id]");
	}
	await applyChange({ change });
}

/** ローダーと同じく、ドットで始まるファイルは読まない */
async function readMemos(): Promise<MemoFile[]> {
	// 仮データを消すとディレクトリごとなくなる（git は空のディレクトリを持たない）
	await mkdir(path.join(ROOT, MEMO_DIR), { recursive: true });
	const files = (await readdir(path.join(ROOT, MEMO_DIR))).filter(
		(file) => file.endsWith(".md") && !file.startsWith("."),
	);
	return Promise.all(
		files.map(async (file) => ({
			id: path.basename(file, ".md"),
			source: await readFile(path.join(ROOT, MEMO_DIR, file), "utf-8"),
		})),
	);
}

async function applyChange({ change }: { change: MemoChange }): Promise<void> {
	const target = memoPath({ id: change.id });
	// 読んでから書くまでの間に同じ名前のファイルができていたら、上書きせずに落とす
	const flag = change.kind === "update" ? "w" : "wx";
	await writeFile(path.join(ROOT, target), change.source, { flag });
	if (change.kind === "rename") {
		const from = memoPath({ id: change.fromId });
		await rm(path.join(ROOT, from));
		console.log(`${from} → ${target}`);
		return;
	}
	console.log(target);
}
