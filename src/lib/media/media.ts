import { MEDIA_ORIGIN } from "../../consts.ts";
import type {
	MediaEntry,
	MediaManifest,
	VideoEntry,
} from "./media-manifest.ts";

/*
  md の `media:` の参照から、配信 URL と HTML の属性を組み立てる。
  astro.config.mjs からも読むので、astro:* は import しない。設計は docs/design/media.md
*/

export const MEDIA_SCHEME = "media:";

/**
 * `media:2026/a.jpg` から論理パス `2026/a.jpg` を取り出す。`media:` の参照でなければ undefined。
 * manifest のキーの形（NFC）にそろえる。media:push は NFC でキーを書くが、
 * macOS の Finder からコピーしたパスは濁点が分かれた NFD のことがあり、見た目が同じでも引けない
 */
export function parseMediaRef({ url }: { url: string }): string | undefined {
	return url.startsWith(MEDIA_SCHEME)
		? url.slice(MEDIA_SCHEME.length).normalize("NFC")
		: undefined;
}

/** manifest から論理パスの項目を引く。なければ ref（どの参照か）を添えて投げる */
export function getMediaEntry({
	manifest,
	path,
	ref,
}: {
	manifest: MediaManifest;
	path: string;
	ref: string;
}): MediaEntry {
	const entry = manifest[path];
	if (!entry) throw new Error(`${ref} が media-manifest.json にない`);
	return entry;
}

/**
 * キーをパスの区切りごとにエンコードする。media:push は空白などを含む inbox のパスをそのままキーにするので、
 * そのまま繋ぐと srcset の区切り（空白・カンマ）や URL の # と ? と誤って読まれる
 */
function encodeKey({ key }: { key: string }): string {
	return key.split("/").map(encodeURIComponent).join("/");
}

/** 変換配信（Image Transformations）の URL。高さを渡すと切り抜く */
export function imageUrl({
	key,
	width,
	height,
}: {
	key: string;
	width: number;
	height?: number;
}): string {
	const options =
		height === undefined
			? `width=${width},format=auto`
			: `width=${width},height=${height},fit=cover,format=auto`;
	return `${MEDIA_ORIGIN}/cdn-cgi/image/${options}/${encodeKey({ key })}`;
}

export function videoUrl({ key }: { key: string }): string {
	return `${MEDIA_ORIGIN}/${encodeKey({ key })}`;
}

/** 本文の表示幅（--layout-content-width）。CSS ピクセル */
const CONTENT_WIDTH = 760;

/**
 * 本文の画像の srcset の幅。760 は 1x、1520 は 2x の本文の表示幅、1136 は 3x のスマホ用。
 * 1x のスマホ用の小さな候補は、ほとんど使われないので持たない（変換の数を抑える）
 */
const BODY_WIDTHS = [760, 1136, 1520] as const;

/**
 * 候補の幅を上限で頭打ちにして重複を除く。
 * 超える候補を捨てるだけだと、幅 1000px のマスターが 760px までしか配信されないため
 */
function capWidths({
	widths,
	max,
}: {
	widths: readonly number[];
	max: number;
}): number[] {
	return [...new Set(widths.map((w) => Math.min(w, max)))];
}

/** 切り抜きの縦横比 */
interface Aspect {
	width: number;
	height: number;
}

export function cropHeight({
	aspect,
	width,
}: {
	aspect: Aspect;
	width: number;
}): number {
	return Math.round((width * aspect.height) / aspect.width);
}

interface CropCandidate {
	url: string;
	width: number;
	height: number;
}

/**
 * 縦横比で切り抜いた候補。fit=cover はマスターより大きい切り抜きを求めると拡大するので、
 * マスターから切り出せるいちばん大きな切り抜きで頭打ちにする
 */
function cropCandidates({
	image: { key, width, height },
	aspect,
	widths,
}: {
	image: StillImage;
	aspect: Aspect;
	widths: readonly number[];
}): CropCandidate[] {
	const max = Math.floor(
		Math.min(width, (height * aspect.width) / aspect.height),
	);
	return capWidths({ max, widths }).map((w) => {
		const h = cropHeight({ aspect, width: w });
		return { height: h, url: imageUrl({ height: h, key, width: w }), width: w };
	});
}

function toSrcset({
	candidates,
}: {
	candidates: readonly { url: string; width: number }[];
}): string {
	return candidates.map(({ url, width }) => `${url} ${width}w`).join(", ");
}

/** 静止画として出すもの。動画ならポスター画像に動画の寸法を付ける */
export interface StillImage {
	key: string;
	width: number;
	height: number;
}

export function toStillImage({ entry }: { entry: MediaEntry }): StillImage {
	const { width, height } = entry;
	return {
		height,
		key: entry.type === "image" ? entry.key : entry.poster,
		width,
	};
}

/** 本文の画像と動画の幅 / 高さ。prose.css が高さを画面の 80% に抑えるのに使う */
function mediaRatio({
	width,
	height,
}: {
	width: number;
	height: number;
}): number {
	return Math.round((width / height) * 10000) / 10000;
}

/** 本文の `<img>` の alt を除いた属性。alt は Markdown の変換で付ける */
export function toImageAttributes({
	image: { key, width, height },
}: {
	image: StillImage;
}): Record<string, string | number> {
	return {
		decoding: "async",
		height,
		loading: "lazy",
		sizes: `(width >= ${CONTENT_WIDTH}px) ${CONTENT_WIDTH}px, 100vw`,
		src: imageUrl({ key, width: Math.min(CONTENT_WIDTH, width) }),
		srcset: toSrcset({
			candidates: capWidths({ max: width, widths: BODY_WIDTHS }).map((w) => ({
				url: imageUrl({ key, width: w }),
				width: w,
			})),
		}),
		style: `--media-ratio: ${mediaRatio({ height, width })}`,
		width,
	};
}

/** ポスター画像の幅。本文の表示幅の 2 倍 */
const POSTER_WIDTH = CONTENT_WIDTH * 2;

export function toVideoAttributes({
	video: { key, poster, width, height },
	alt,
}: {
	video: VideoEntry;
	alt: string;
}): Record<string, string | number | boolean> {
	return {
		...(alt && { "aria-label": alt }),
		controls: true,
		height,
		playsinline: true,
		poster: imageUrl({ key: poster, width: Math.min(POSTER_WIDTH, width) }),
		preload: "metadata",
		src: videoUrl({ key }),
		style: `--media-ratio: ${mediaRatio({ height, width })}`,
		width,
	};
}

/** 切り抜きの縦横比と幅の候補。表示幅（sizes）は、表示する側の CSS の隣に書く */
export interface CropRule {
	aspect: Aspect;
	widths: readonly number[];
}

/**
 * 縦横比で切り抜いた画像。src はいちばん大きな候補で、srcset を読まない環境でもぼけない。
 * width / height もいちばん大きな候補の寸法。CSS で幅を決めるので、縦横比を伝えるためだけに使う
 */
export interface CroppedImage {
	src: string;
	srcset: string;
	width: number;
	height: number;
}

export function toCroppedImage({
	image,
	rule: { aspect, widths },
}: {
	image: StillImage;
	rule: CropRule;
}): CroppedImage {
	const candidates = cropCandidates({ aspect, image, widths });
	const largest = candidates.at(-1);
	if (largest === undefined) throw new Error("切り抜きの候補がない");
	return {
		height: largest.height,
		src: largest.url,
		srcset: toSrcset({ candidates }),
		width: largest.width,
	};
}

/**
 * 記事冒頭の画像（アイキャッチ）の切り抜き。768px 以上は wide（5:2）、未満は narrow（16:9）。
 * 表示幅は 768px で 598、1024px で 824、1280px 以上で 1056、スマホで 319〜677。変換の数を抑えるため、候補は枠ごとに 3 つにする。
 * wide は 1x の最大（1056）と 2x（1196〜2112）を 1680 / 2112 で覆う。narrow は 2x / 3x のスマホ用で、1x のスマホ用の小さな候補は持たない。
 * 表示幅は src/pages/posts/[slug].astro の CSS
 */
const EYECATCH_CROPS = {
	narrow: { aspect: { height: 9, width: 16 }, widths: [720, 1080, 1440] },
	wide: {
		aspect: { height: 2, width: 5 },
		widths: [1056, 1680, 2112],
	},
} as const satisfies Record<string, CropRule>;

export type EyecatchImage = Record<keyof typeof EYECATCH_CROPS, CroppedImage>;

export function toEyecatchImage({
	image,
}: {
	image: StillImage;
}): EyecatchImage {
	return {
		narrow: toCroppedImage({ image, rule: EYECATCH_CROPS.narrow }),
		wide: toCroppedImage({ image, rule: EYECATCH_CROPS.wide }),
	};
}
