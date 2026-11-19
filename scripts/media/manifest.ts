import { readFile, writeFile } from "node:fs/promises";
import {
	type MediaManifest,
	parseMediaManifest,
} from "../../src/lib/media-manifest.ts";

export async function readManifest({
	filePath,
}: {
	filePath: string;
}): Promise<MediaManifest> {
	return parseMediaManifest({
		data: JSON.parse(await readFile(filePath, "utf8")),
	});
}

export async function writeManifest({
	filePath,
	manifest,
}: {
	filePath: string;
	manifest: MediaManifest;
}): Promise<void> {
	await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** manifest にあるものは、force でなければ加工もアップロードもしない */
export function planItems<T extends { logicalPath: string }>({
	force,
	items,
	manifest,
}: {
	force: boolean;
	items: T[];
	manifest: MediaManifest;
}): { process: T[]; skip: T[] } {
	const process: T[] = [];
	const skip: T[] = [];
	for (const item of items) {
		if (!force && Object.hasOwn(manifest, item.logicalPath)) skip.push(item);
		else process.push(item);
	}
	return { process, skip };
}

/** 項目を足した（同じ論理パスは上書きした）新しい manifest を返す。差分が安定するよう、論理パスの順に並べる */
export function addEntries({
	entries,
	manifest,
}: {
	entries: { entry: MediaManifest[string]; logicalPath: string }[];
	manifest: MediaManifest;
}): MediaManifest {
	const next = { ...manifest };
	for (const { entry, logicalPath } of entries) next[logicalPath] = entry;
	return Object.fromEntries(
		Object.entries(next).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	);
}
