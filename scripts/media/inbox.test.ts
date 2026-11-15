import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { buildKey, scanInbox } from "./inbox.ts";

describe("buildKey", () => {
	test("論理パスのディレクトリを保ち、ハッシュと出力の拡張子を付ける", () => {
		expect(
			buildKey({
				extension: "jpg",
				hash: "a1b2c3",
				logicalPath: "2026/kyoto/cat.heic",
				prefix: "images",
			}),
		).toBe("images/2026/kyoto/cat.a1b2c3.jpg");
	});

	test("ポスター画像は動画と同じハッシュに接尾辞を付ける", () => {
		expect(
			buildKey({
				extension: "jpg",
				hash: "d4e5f6",
				logicalPath: "2026/kyoto/walk.mov",
				prefix: "images",
				suffix: "poster",
			}),
		).toBe("images/2026/kyoto/walk.d4e5f6.poster.jpg");
	});

	test("inbox の直下にあるもの", () => {
		expect(
			buildKey({
				extension: "mp4",
				hash: "d4e5f6",
				logicalPath: "walk.mov",
				prefix: "videos",
			}),
		).toBe("videos/walk.d4e5f6.mp4");
	});
});

describe("scanInbox", () => {
	let inboxDir: string;

	beforeEach(async () => {
		inboxDir = await mkdtemp(path.join(os.tmpdir(), "inbox-test-"));
	});

	afterEach(async () => {
		await rm(inboxDir, { force: true, recursive: true });
	});

	async function put(relativePath: string): Promise<void> {
		const filePath = path.join(inboxDir, relativePath);
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, "");
	}

	test("拡張子から種類を判定する。大文字の拡張子も扱う", async () => {
		await put("2026/kyoto/cat.JPG");
		await put("a.jpeg");
		await put("shot.png");
		await put("iphone.HEIC");
		await put("2026/walk.MOV");
		await put("b.mp4");
		await put("c.m4v");

		const { items, unsupported } = await scanInbox({ inboxDir });

		expect(items.map(({ sourcePath: _, ...item }) => item)).toEqual([
			{
				convertHeic: false,
				format: "jpeg",
				kind: "image",
				logicalPath: "2026/kyoto/cat.JPG",
			},
			{ kind: "video", logicalPath: "2026/walk.MOV" },
			{
				convertHeic: false,
				format: "jpeg",
				kind: "image",
				logicalPath: "a.jpeg",
			},
			{ kind: "video", logicalPath: "b.mp4" },
			{ kind: "video", logicalPath: "c.m4v" },
			{
				convertHeic: true,
				format: "jpeg",
				kind: "image",
				logicalPath: "iphone.HEIC",
			},
			{
				convertHeic: false,
				format: "png",
				kind: "image",
				logicalPath: "shot.png",
			},
		]);
		expect(unsupported).toEqual([]);
	});

	test("扱えない種類は unsupported に入れ、ドットファイルは無視する", async () => {
		await put("notes.txt");
		await put(".DS_Store");
		await put("2026/.DS_Store");
		await put("._cat.jpg");

		const { items, unsupported } = await scanInbox({ inboxDir });

		expect(items).toEqual([]);
		expect(unsupported).toEqual(["notes.txt"]);
	});

	test("NFD のファイル名を NFC の論理パスにする", async () => {
		const nfd = "京都/がっこう.jpg".normalize("NFD");
		await put(nfd);

		const { items } = await scanInbox({ inboxDir });

		expect(items.map(({ logicalPath }) => logicalPath)).toEqual([
			"京都/がっこう.jpg".normalize("NFC"),
		]);
		expect(items[0]?.sourcePath).toBe(path.join(inboxDir, nfd));
	});
});
