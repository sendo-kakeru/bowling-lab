import { markdownToHtml } from "satteri";
import { describe, expect, test } from "vitest";
import type { MediaManifest } from "./media-manifest.ts";
import { createMediaPlugin } from "./media-plugin.ts";

const ORIGIN = "https://bowling-media.sendo.page";

const MANIFEST: MediaManifest = {
	"2026/kyoto/cat.jpg": {
		height: 1600,
		key: "images/2026/kyoto/cat.a1b2c3.jpg",
		type: "image",
		width: 2400,
	},
	"2026/kyoto/walk.mov": {
		duration: 12.4,
		height: 1080,
		key: "videos/2026/kyoto/walk.d4e5f6.mp4",
		poster: "images/2026/kyoto/walk.d4e5f6.poster.jpg",
		type: "video",
		width: 1920,
	},
};

const FILE_URL = new URL(`file://${process.cwd()}/src/content/posts/sample.md`);

async function render({ markdown }: { markdown: string }): Promise<string> {
	const { html } = await markdownToHtml(markdown, {
		fileURL: FILE_URL,
		mdastPlugins: [createMediaPlugin({ manifest: MANIFEST })],
	});
	return html;
}

describe("createMediaPlugin", () => {
	test("画像の参照を srcset つきの <img> にする", async () => {
		const html = await render({
			markdown: "![レーンの猫](media:2026/kyoto/cat.jpg)",
		});

		const url = (width: number): string =>
			`${ORIGIN}/cdn-cgi/image/width=${width},format=auto/images/2026/kyoto/cat.a1b2c3.jpg`;
		const srcset = [192, 480, 760, 1136, 1520, 2272]
			.map((width) => `${url(width)} ${width}w`)
			.join(", ");
		expect(html).toContain(
			`<img alt="レーンの猫" decoding="async" height="1600" loading="lazy" sizes="(width >= 760px) 760px, 100vw" src="${url(760)}" srcset="${srcset}" width="2400">`,
		);
	});

	test("動画の参照を poster つきの <video> にする", async () => {
		const html = await render({
			markdown: "![散歩](media:2026/kyoto/walk.mov)",
		});

		expect(html).toContain(
			`<video aria-label="散歩" controls height="1080" playsinline poster="${ORIGIN}/cdn-cgi/image/width=1520,format=auto/images/2026/kyoto/walk.d4e5f6.poster.jpg" preload="metadata" src="${ORIGIN}/videos/2026/kyoto/walk.d4e5f6.mp4" width="1920"></video>`,
		);
	});

	test("media: でない画像には手を付けない", async () => {
		expect(
			await render({ markdown: "![外部](https://example.com/a.png)" }),
		).toContain('<img src="https://example.com/a.png" alt="外部">');
	});

	test("画像のタイトルを残す", async () => {
		expect(
			await render({ markdown: '![猫](media:2026/kyoto/cat.jpg "京都の猫")' }),
		).toContain('<img alt="猫" title="京都の猫"');
	});

	test("参照形式の media: は、ファイルと参照を添えて投げる", async () => {
		await expect(
			render({ markdown: "![猫][cat]\n\n[cat]: media:2026/kyoto/cat.jpg" }),
		).rejects.toThrow(
			"src/content/posts/sample.md: media:2026/kyoto/cat.jpg は参照形式では書けない",
		);
	});

	test("manifest にない参照は、ファイルと参照を添えて投げる", async () => {
		await expect(render({ markdown: "![](media:nope/x.jpg)" })).rejects.toThrow(
			"src/content/posts/sample.md: media:nope/x.jpg が media-manifest.json にない",
		);
	});
});
