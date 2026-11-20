import satori, { type Font } from "satori";
import sharp from "sharp";
import { SITE_TAGLINE, SITE_TITLE } from "../../consts.ts";
import { formatDotDate } from "../date.ts";
import { type BallColorName, ballSvg } from "../svg/ball-svg.ts";
import { pinSvg } from "../svg/pin-svg.ts";
import { svgDocument } from "../svg/svg.ts";
import { TOKEN_COLORS } from "../token-colors.ts";
import { createMeasure, satoriFonts, type TextFont } from "./ogp-fonts.ts";
import { type FittedText, fitText, type TextStep } from "./ogp-text.ts";

/*
  OGP 画像（1200×630 の PNG）。satori で SVG に組み、sharp で PNG にする。
  行の分け方は fitText で決め、satori には 1 行ずつ折り返さずに渡す（satori の折り返しに任せると行数を判定できない）
*/

export const OGP_WIDTH = 1200;
export const OGP_HEIGHT = 630;

const COLORS = {
	/** 地は既定のサムネイルと同じ板目の明るい色。クリームの地では共通の画像の白いピンが溶けて見えにくい */
	background: TOKEN_COLORS["wood-100"],
	date: TOKEN_COLORS["ink-600"],
	text: TOKEN_COLORS["navy-900"],
} as const;

const FONTS = {
	meta: { families: ["Inter", "Noto Sans JP"], weight: 500 },
	siteName: { families: ["Barlow Condensed", "Noto Sans JP"], weight: 700 },
	tagline: {
		families: ["Inter", "Noto Sans JP"],
		letterSpacing: 6,
		weight: 500,
	},
	title: { families: ["Inter", "Noto Sans JP"], weight: 700 },
} as const satisfies Record<string, TextFont>;

const POST_BALL = { cx: 1090, cy: 560, r: 190 } as const;
const TITLE_LEFT = 80;
const TITLE_RIGHT = 1120;
const TITLE_TOP = 72;
/** 3 行までのタイトルは、TITLE_TOP からボールの上端までの範囲の縦の中央に置く。下だけが空かないように */
const TITLE_AREA_BOTTOM = POST_BALL.cy - POST_BALL.r;
/** 字とボールの間に空ける幅 */
const TITLE_BALL_GAP = 32;

/**
 * タイトルを TITLE_TOP から組んだときの index 行目の最大幅。行の高さがボールにかかる行は、ボールの左端の手前までにする。
 * 縦の中央に置くのはボールの上端より上に収まるときだけなので、その行はどれも全幅になる
 */
function titleLineWidth({
	index,
	lineHeight,
}: {
	index: number;
	lineHeight: number;
}): number {
	const top = TITLE_TOP + index * lineHeight;
	const nearestY = Math.min(Math.max(POST_BALL.cy, top), top + lineHeight);
	const dy = Math.abs(POST_BALL.cy - nearestY);
	const right =
		dy >= POST_BALL.r
			? TITLE_RIGHT
			: Math.min(
					TITLE_RIGHT,
					Math.floor(
						POST_BALL.cx -
							Math.sqrt(POST_BALL.r ** 2 - dy ** 2) -
							TITLE_BALL_GAP,
					),
				);
	return right - TITLE_LEFT;
}

function titleStep({
	fontSize,
	lineHeight,
	maxLines,
}: {
	fontSize: number;
	lineHeight: number;
	maxLines: number;
}): TextStep {
	const [first = 0, ...rest] = Array.from({ length: maxLines }, (_, index) =>
		titleLineWidth({ index, lineHeight }),
	);
	return { fontSize, lineHeight, lineWidths: [first, ...rest] };
}

export const TITLE_STEPS = [
	titleStep({ fontSize: 96, lineHeight: 124, maxLines: 1 }),
	titleStep({ fontSize: 76, lineHeight: 104, maxLines: 2 }),
	titleStep({ fontSize: 60, lineHeight: 86, maxLines: 4 }),
] as const satisfies readonly [TextStep, ...TextStep[]];

/** 共通の画像の絵。奥から順に描く */
const SITE_PINS = [
	{ cx: 1085, height: 330, id: "back", top: 150 },
	{ cx: 995, height: 310, id: "front", top: 175 },
] as const;
const SITE_BALL = { cx: 850, cy: 410, r: 165 } as const;
const SITE_LEFT = 90;
/** タグラインはボールの左端より左に収める */
const TAGLINE_WIDTH = SITE_BALL.cx - SITE_BALL.r - SITE_LEFT;
const TAGLINE_STEPS = [
	{ fontSize: 44, lineHeight: 60, lineWidths: [TAGLINE_WIDTH] },
	{ fontSize: 36, lineHeight: 50, lineWidths: [TAGLINE_WIDTH] },
	{ fontSize: 36, lineHeight: 50, lineWidths: [TAGLINE_WIDTH, TAGLINE_WIDTH] },
] as const satisfies readonly [TextStep, ...TextStep[]];

interface Node {
	type: string;
	props: {
		style?: Record<string, number | string>;
		src?: string;
		children?: Node[] | string;
	};
}

function div({
	style,
	children,
}: {
	style: Record<string, number | string>;
	children?: Node[] | string;
}): Node {
	return {
		props: { children, style: { display: "flex", ...style } },
		type: "div",
	};
}

interface TextBlock {
	node: Node;
	fonts: Font[];
}

/** 文字のかたまり。行は折り返さずに 1 行ずつ置き、描く字の書体のファイルを添える */
function textBlock({
	textFont,
	fitted,
	style = {},
}: {
	textFont: TextFont;
	fitted: FittedText;
	style?: Record<string, number | string>;
}): TextBlock {
	const { fontFamily, fonts } = satoriFonts({ textFont, texts: fitted.lines });
	const lines = fitted.lines.map((line) =>
		div({
			children: line,
			style: {
				height: fitted.lineHeight,
				lineHeight: `${fitted.lineHeight}px`,
				whiteSpace: "pre",
			},
		}),
	);
	return {
		fonts,
		node: div({
			children: lines,
			style: {
				flexDirection: "column",
				fontFamily,
				fontSize: fitted.fontSize,
				fontWeight: textFont.weight,
				letterSpacing: textFont.letterSpacing ?? 0,
				...style,
			},
		}),
	};
}

/** 1 行で収まる短い文字（サイト名、日付） */
function singleLine({
	text,
	fontSize,
}: {
	text: string;
	fontSize: number;
}): FittedText {
	return { fontSize, lineHeight: Math.round(fontSize * 1.25), lines: [text] };
}

/**
 * SVG の断片を data URI の画像にして、(left, top) から width×height の範囲に置く。断片はその範囲の左上を原点に書く。
 * 画面の外にはみ出した分は切れる
 */
function picture({
	content,
	left = 0,
	top = 0,
	width = OGP_WIDTH,
	height = OGP_HEIGHT,
}: {
	content: string;
	left?: number;
	top?: number;
	width?: number;
	height?: number;
}): Node {
	const svg = svgDocument({ content, height, width });
	return {
		props: {
			src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
			style: { height, left, position: "absolute", top, width },
		},
		type: "img",
	};
}

async function renderPng({
	root,
	blocks,
}: {
	root: Node;
	blocks: TextBlock[];
}): Promise<Uint8Array<ArrayBuffer>> {
	const svg = await satori(root, {
		fonts: blocks.flatMap(({ fonts }) => fonts),
		height: OGP_HEIGHT,
		width: OGP_WIDTH,
	});
	return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

function canvas({ children }: { children: Node[] }): Node {
	return div({
		children,
		style: {
			backgroundColor: COLORS.background,
			color: COLORS.text,
			height: OGP_HEIGHT,
			position: "relative",
			width: OGP_WIDTH,
		},
	});
}

const siteName = SITE_TITLE.toUpperCase();

export async function renderPostOgp({
	title,
	publishedAt,
	color,
}: {
	title: string;
	publishedAt: Date;
	color: BallColorName;
}): Promise<Uint8Array<ArrayBuffer>> {
	const fitted = fitText({
		measure: createMeasure({ textFont: FONTS.title }),
		steps: TITLE_STEPS,
		text: title,
	});
	const titleHeight = fitted.lines.length * fitted.lineHeight;
	const titleBlock = textBlock({
		fitted,
		style: {
			left: TITLE_LEFT,
			position: "absolute",
			top:
				TITLE_TOP +
				Math.max(
					0,
					Math.round((TITLE_AREA_BOTTOM - TITLE_TOP - titleHeight) / 2),
				),
			width: TITLE_RIGHT - TITLE_LEFT,
		},
		textFont: FONTS.title,
	});
	const nameBlock = textBlock({
		fitted: singleLine({ fontSize: 36, text: siteName }),
		textFont: FONTS.siteName,
	});
	const dateBlock = textBlock({
		fitted: singleLine({
			fontSize: 32,
			text: formatDotDate({ date: publishedAt }),
		}),
		style: { color: COLORS.date },
		textFont: FONTS.meta,
	});
	const root = canvas({
		children: [
			picture({
				content: ballSvg({
					color,
					cx: POST_BALL.r,
					cy: POST_BALL.r,
					r: POST_BALL.r,
				}),
				height: POST_BALL.r * 2,
				left: POST_BALL.cx - POST_BALL.r,
				top: POST_BALL.cy - POST_BALL.r,
				width: POST_BALL.r * 2,
			}),
			titleBlock.node,
			div({
				style: {
					backgroundColor: COLORS.text,
					height: 2,
					left: 80,
					opacity: 0.3,
					position: "absolute",
					top: 520,
					width: 780,
				},
			}),
			div({
				children: [nameBlock.node, dateBlock.node],
				style: {
					alignItems: "center",
					height: 108,
					justifyContent: "space-between",
					left: 80,
					position: "absolute",
					top: 522,
					width: 780,
				},
			}),
		],
	});
	return renderPng({ blocks: [titleBlock, nameBlock, dateBlock], root });
}

/** サイト名を最初の空白で 2 行に分ける（`SENDO` / `BOWLING LAB`） */
function splitSiteName({ name }: { name: string }): string[] {
	const index = name.search(/\s/);
	return index === -1
		? [name]
		: [name.slice(0, index), name.slice(index).trim()];
}

export async function renderSiteOgp(): Promise<Uint8Array<ArrayBuffer>> {
	const nameBlock = textBlock({
		fitted: {
			fontSize: 112,
			lineHeight: 112,
			lines: splitSiteName({ name: siteName }),
		},
		textFont: FONTS.siteName,
	});
	const taglineBlock = textBlock({
		fitted: fitText({
			measure: createMeasure({ textFont: FONTS.tagline }),
			steps: TAGLINE_STEPS,
			text: SITE_TAGLINE,
		}),
		style: { marginTop: 24, opacity: 0.8 },
		textFont: FONTS.tagline,
	});
	const root = canvas({
		children: [
			picture({
				content:
					SITE_PINS.map((pin) => pinSvg(pin)).join("") +
					ballSvg({ color: "navy", ...SITE_BALL }),
			}),
			div({
				children: [nameBlock.node, taglineBlock.node],
				style: {
					flexDirection: "column",
					height: OGP_HEIGHT,
					justifyContent: "center",
					left: SITE_LEFT,
					position: "absolute",
					top: 0,
				},
			}),
		],
	});
	return renderPng({ blocks: [nameBlock, taglineBlock], root });
}
