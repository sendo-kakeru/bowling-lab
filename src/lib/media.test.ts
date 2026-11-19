import { describe, expect, test } from "vitest";
import {
	decideThumbnail,
	imageUrl,
	parseMediaRef,
	toEyecatchImage,
	toImageAttributes,
	toThumbnailImage,
	toVideoAttributes,
	videoUrl,
} from "./media.ts";
import type { MediaManifest } from "./media-manifest.ts";

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

describe("配信 URL", () => {
	test("画像は幅を指定した変換配信の URL", () => {
		expect(imageUrl({ key: "images/2026/a.jpg", width: 760 })).toBe(
			`${ORIGIN}/cdn-cgi/image/width=760,format=auto/images/2026/a.jpg`,
		);
	});

	test("高さを渡すと切り抜く", () => {
		expect(
			imageUrl({ height: 630, key: "images/2026/a.jpg", width: 1200 }),
		).toBe(
			`${ORIGIN}/cdn-cgi/image/width=1200,height=630,fit=cover,format=auto/images/2026/a.jpg`,
		);
	});

	test("動画は R2 から直接配信する URL", () => {
		expect(videoUrl({ key: "videos/2026/w.mp4" })).toBe(
			`${ORIGIN}/videos/2026/w.mp4`,
		);
	});

	test("キーの空白やカンマはエンコードする", () => {
		expect(
			imageUrl({ key: "images/2026/a b,c#1.abc123.png", width: 192 }),
		).toBe(
			`${ORIGIN}/cdn-cgi/image/width=192,format=auto/images/2026/a%20b%2Cc%231.abc123.png`,
		);
		expect(videoUrl({ key: "videos/2026/a b.abc123.mp4" })).toBe(
			`${ORIGIN}/videos/2026/a%20b.abc123.mp4`,
		);
	});
});

describe("parseMediaRef", () => {
	test("論理パスを NFC にそろえる（Finder からコピーした NFD のパスでも manifest を引ける）", () => {
		const nfd = "media:2026/京都/がっこう.jpg".normalize("NFD");
		expect(parseMediaRef({ url: nfd })).toBe(
			"2026/京都/がっこう.jpg".normalize("NFC"),
		);
	});

	test("media: の参照でなければ undefined", () => {
		expect(parseMediaRef({ url: "https://example.com/a.jpg" })).toBe(undefined);
	});
});

const url = (options: string): string =>
	`${ORIGIN}/cdn-cgi/image/${options},format=auto/images/a.jpg`;

/** srcset の候補を「変換のオプション 幅の記述子」の形にする */
function candidates({ srcset }: { srcset: string }): string[] {
	return srcset.split(", ").map((candidate) => {
		const [, options] = /\/cdn-cgi\/image\/([^/]+),format=auto\//.exec(
			candidate,
		) ?? [undefined, ""];
		return `${options} ${candidate.split(" ").at(-1)}`;
	});
}

describe("toImageAttributes", () => {
	test("本文の幅の候補は 480 / 760 / 1136 / 1520", () => {
		const { srcset } = toImageAttributes({
			image: { height: 1600, key: "images/a.jpg", width: 2400 },
		});

		expect(candidates({ srcset: String(srcset) })).toEqual([
			"width=480 480w",
			"width=760 760w",
			"width=1136 1136w",
			"width=1520 1520w",
		]);
	});

	test("マスターを超える候補は、マスターの幅にまとめる", () => {
		const attributes = toImageAttributes({
			image: { height: 427, key: "images/a.jpg", width: 640 },
		});

		expect(attributes).toEqual({
			decoding: "async",
			height: 427,
			loading: "lazy",
			sizes: "(width >= 760px) 760px, 100vw",
			src: url("width=640"),
			srcset: `${url("width=480")} 480w, ${url("width=640")} 640w`,
			style: "--media-ratio: 1.4988",
			width: 640,
		});
	});

	test("どの候補より小さいマスターは、その幅だけ", () => {
		const { srcset } = toImageAttributes({
			image: { height: 100, key: "images/a.jpg", width: 150 },
		});

		expect(candidates({ srcset: String(srcset) })).toEqual(["width=150 150w"]);
	});
});

describe("toEyecatchImage", () => {
	test("768px 以上は 5:2、未満は 16:9 に切り抜き、それぞれの表示幅の sizes を付ける", () => {
		const { img, sources } = toEyecatchImage({
			image: { height: 1600, key: "images/a.jpg", width: 2400 },
		});

		expect(sources).toHaveLength(1);
		const [wide] = sources;
		expect(wide).toMatchObject({
			height: 845,
			media: "(width >= 768px)",
			sizes:
				"(width >= 1280px) 1056px, (width >= 1024px) calc(100vw - 200px), calc(100vw - 170px)",
			width: 2112,
		});
		expect(candidates({ srcset: wide?.srcset ?? "" })).toEqual([
			"width=640,height=256,fit=cover 640w",
			"width=840,height=336,fit=cover 840w",
			"width=1056,height=422,fit=cover 1056w",
			"width=1280,height=512,fit=cover 1280w",
			"width=1680,height=672,fit=cover 1680w",
			"width=2112,height=845,fit=cover 2112w",
		]);

		expect(img).toMatchObject({
			height: 810,
			sizes: "calc(91.41vw - 24px)",
			src: url("width=360,height=203,fit=cover"),
			width: 1440,
		});
		expect(candidates({ srcset: img.srcset })).toEqual([
			"width=360,height=203,fit=cover 360w",
			"width=720,height=405,fit=cover 720w",
			"width=1080,height=608,fit=cover 1080w",
			"width=1440,height=810,fit=cover 1440w",
		]);
	});

	test("マスターから切り出せるいちばん大きな切り抜きで頭打ちにする", () => {
		// 横長すぎて、高さ 400px からは 5:2 で幅 1000px までしか切り出せない
		const { sources } = toEyecatchImage({
			image: { height: 400, key: "images/a.jpg", width: 2400 },
		});

		expect(candidates({ srcset: sources[0]?.srcset ?? "" })).toEqual([
			"width=640,height=256,fit=cover 640w",
			"width=840,height=336,fit=cover 840w",
			"width=1000,height=400,fit=cover 1000w",
		]);
		expect(sources[0]).toMatchObject({ height: 400, width: 1000 });
	});
});

describe("toThumbnailImage", () => {
	test("2.2:1 の切り抜きを 224 / 352 / 528 / 768 で出し、src はいちばん大きな候補", () => {
		const { src, srcset } = toThumbnailImage({
			image: { height: 1600, key: "images/a.jpg", width: 2400 },
		});

		expect(src).toBe(url("width=768,height=349,fit=cover"));
		expect(candidates({ srcset })).toEqual([
			"width=224,height=102,fit=cover 224w",
			"width=352,height=160,fit=cover 352w",
			"width=528,height=240,fit=cover 528w",
			"width=768,height=349,fit=cover 768w",
		]);
	});
});

describe("toVideoAttributes", () => {
	const video = MANIFEST["2026/kyoto/walk.mov"];
	if (video?.type !== "video") throw new Error("動画の項目がない");

	test("代替テキストがなければ aria-label を付けない", () => {
		expect(toVideoAttributes({ alt: "", video })).toEqual({
			controls: true,
			height: 1080,
			playsinline: true,
			poster: `${ORIGIN}/cdn-cgi/image/width=1520,format=auto/images/2026/kyoto/walk.d4e5f6.poster.jpg`,
			preload: "metadata",
			src: `${ORIGIN}/videos/2026/kyoto/walk.d4e5f6.mp4`,
			style: "--media-ratio: 1.7778",
			width: 1920,
		});
	});

	test("代替テキストは aria-label にする", () => {
		expect(toVideoAttributes({ alt: "散歩", video })).toMatchObject({
			"aria-label": "散歩",
		});
	});
});

describe("decideThumbnail", () => {
	const CAT = {
		height: 1600,
		key: "images/2026/kyoto/cat.a1b2c3.jpg",
		width: 2400,
	};

	test("フロントマターの thumbnail を本文の画像より優先する", () => {
		expect(
			decideThumbnail({
				manifest: MANIFEST,
				markdown: "![](media:2026/kyoto/walk.mov)",
				thumbnail: "2026/kyoto/cat.jpg",
			}),
		).toEqual({ image: CAT, source: "frontmatter" });
	});

	test("thumbnail がなければ、本文で最初の media: の画像", () => {
		expect(
			decideThumbnail({
				manifest: MANIFEST,
				markdown:
					"本文\n\n![外部](https://example.com/a.png)\n\n![猫](media:2026/kyoto/cat.jpg)",
			}),
		).toEqual({ image: CAT, source: "body" });
	});

	test("本文の最初が動画なら、ポスター画像に動画の寸法を付ける", () => {
		expect(
			decideThumbnail({
				manifest: MANIFEST,
				markdown:
					"![](media:2026/kyoto/walk.mov)\n\n![](media:2026/kyoto/cat.jpg)",
			}),
		).toEqual({
			image: {
				height: 1080,
				key: "images/2026/kyoto/walk.d4e5f6.poster.jpg",
				width: 1920,
			},
			source: "body",
		});
	});

	test("どちらもなければ既定の画像", () => {
		expect(
			decideThumbnail({ manifest: MANIFEST, markdown: "画像のない本文" }),
		).toEqual({ source: "default" });
	});

	test("manifest にない thumbnail は、参照を添えて投げる", () => {
		expect(() =>
			decideThumbnail({
				manifest: MANIFEST,
				markdown: "",
				thumbnail: "2026/nope/x.jpg",
			}),
		).toThrow("media:2026/nope/x.jpg");
	});

	test("manifest にない本文の最初の参照も、既定の画像にせず投げる", () => {
		expect(() =>
			decideThumbnail({
				manifest: MANIFEST,
				markdown: "![](media:2026/nope/x.jpg)",
			}),
		).toThrow("media:2026/nope/x.jpg");
	});
});
