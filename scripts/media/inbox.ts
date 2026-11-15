import type { Hash } from "node:crypto";
import { glob, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaManifest } from "../../src/utils/media-manifest.ts";

export type ImageFormat = "jpeg" | "png";

interface ImageKind {
	/** sharp のプリビルド版は HEIC を読めないので、先に sips で変換する */
	convertHeic: boolean;
	format: ImageFormat;
	kind: "image";
}

interface VideoKind {
	kind: "video";
}

type MediaKind = ImageKind | VideoKind;

interface Source {
	/** inbox からの相対パス。区切りは `/`、NFC。md にはこれを書く */
	logicalPath: string;
	sourcePath: string;
}

export type ImageItem = ImageKind & Source;
export type VideoItem = VideoKind & Source;
export type InboxItem = ImageItem | VideoItem;

const KIND_BY_EXTENSION: Record<string, MediaKind> = {
	".heic": { convertHeic: true, format: "jpeg", kind: "image" },
	".jpeg": { convertHeic: false, format: "jpeg", kind: "image" },
	".jpg": { convertHeic: false, format: "jpeg", kind: "image" },
	".m4v": { kind: "video" },
	".mov": { kind: "video" },
	".mp4": { kind: "video" },
	".png": { convertHeic: false, format: "png", kind: "image" },
};

export interface UploadFile {
	contentType: string;
	key: string;
	path: string;
}

export interface ProcessedItem {
	entry: MediaManifest[string];
	files: UploadFile[];
	logicalPath: string;
}

/** inbox を走査し、扱える項目と扱えないファイル（論理パス）に分ける。ドットファイルは無視する */
export async function scanInbox({
	inboxDir,
}: {
	inboxDir: string;
}): Promise<{ items: InboxItem[]; unsupported: string[] }> {
	const items: InboxItem[] = [];
	const unsupported: string[] = [];
	for await (const dirent of glob("**/*", {
		cwd: inboxDir,
		withFileTypes: true,
	})) {
		if (!dirent.isFile()) continue;
		const sourcePath = path.join(dirent.parentPath, dirent.name);
		const segments = path.relative(inboxDir, sourcePath).split(path.sep);
		if (segments.some((segment) => segment.startsWith("."))) continue;

		// macOS はファイル名を NFD で返すので、md に書く形（NFC）にそろえる
		const logicalPath = segments.join("/").normalize("NFC");
		const kind = KIND_BY_EXTENSION[path.extname(logicalPath).toLowerCase()];
		if (kind === undefined) {
			unsupported.push(logicalPath);
			continue;
		}
		items.push({ ...kind, logicalPath, sourcePath });
	}
	items.sort((a, b) => a.logicalPath.localeCompare(b.logicalPath));
	unsupported.sort();
	return { items, unsupported };
}

/** 例: images/2026/kyoto/cat.a1b2c3.jpg、images/2026/kyoto/walk.d4e5f6.poster.jpg */
export function buildKey({
	extension,
	hash,
	logicalPath,
	prefix,
	suffix,
}: {
	extension: string;
	hash: string;
	logicalPath: string;
	prefix: "images" | "videos";
	suffix?: string;
}): string {
	const { dir, name } = path.posix.parse(logicalPath);
	const fileName = [name, hash, suffix, extension]
		.filter((part) => part !== undefined)
		.join(".");
	return path.posix.join(prefix, dir, fileName);
}

/** md に貼る記法。空白や括弧を含むパスは、CommonMark で画像として読まれるよう `<>` で囲む */
export function markdownSnippet({
	logicalPath,
}: {
	logicalPath: string;
}): string {
	const destination = /[\s()<>]/.test(logicalPath)
		? `<media:${logicalPath}>`
		: `media:${logicalPath}`;
	return `![](${destination})`;
}

/** 加工後の中身から作る短いハッシュ。中身が変われば URL が変わるので、長期間キャッシュできる */
export function shortHash({ hash }: { hash: Hash }): string {
	return hash.digest("hex").slice(0, 6);
}

/** 加工したファイルを作業ディレクトリのキーと同じ位置に書き、そのパスを返す */
export async function writeOutput({
	data,
	key,
	workDir,
}: {
	data: Uint8Array;
	key: string;
	workDir: string;
}): Promise<string> {
	const outputPath = path.join(workDir, key);
	await mkdir(path.dirname(outputPath), { recursive: true });
	await writeFile(outputPath, data);
	return outputPath;
}
