import satori, { type Font } from "satori";
import sharp from "sharp";
import { SITE_TAGLINE, SITE_TITLE } from "../consts.ts";
import { type BallColorName, ballSvg, svgDocument } from "./ball-svg.ts";
import { formatDotDate } from "./date.ts";
import { createMeasure, satoriFonts, type TextFont } from "./ogp-fonts.ts";
import { type FittedText, fitText, type TextStep } from "./ogp-text.ts";
import { TOKEN_COLORS } from "./token-colors.ts";

/*
  OGP 画像（1200×630 の PNG）。satori で SVG に組み、sharp で PNG にする。
  行の分け方は fitText で決め、satori には 1 行ずつ折り返さずに渡す（satori の折り返しに任せると行数を判定できない）
*/

const WIDTH = 1200;
const HEIGHT = 630;

const COLORS = {
	background: TOKEN_COLORS.card,
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

const TITLE_LEFT = 80;
export const TITLE_WIDTH = 1120 - TITLE_LEFT;
export const TITLE_STEPS = [
	{ fontSize: 68, lineHeight: 96, maxLines: 2 },
	{ fontSize: 52, lineHeight: 80, maxLines: 3 },
] as const satisfies readonly [TextStep, ...TextStep[]];

const SITE_BALL = { cx: 1010, cy: 315, r: 230 } as const;
const SITE_LEFT = 90;
const TAGLINE_STEPS = [
	{ fontSize: 34, lineHeight: 48, maxLines: 1 },
	{ fontSize: 28, lineHeight: 40, maxLines: 1 },
	{ fontSize: 28, lineHeight: 40, maxLines: 2 },
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

/** ボールの SVG を data URI の画像にして置く。画面の外にはみ出した分は切れる */
function ball({
	cx,
	cy,
	r,
	color,
}: {
	cx: number;
	cy: number;
	r: number;
	color: BallColorName;
}): Node {
	const size = r * 2;
	const svg = svgDocument({
		content: ballSvg({ color, cx: r, cy: r, r }),
		height: size,
		width: size,
	});
	return {
		props: {
			src: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
			style: {
				height: size,
				left: cx - r,
				position: "absolute",
				top: cy - r,
				width: size,
			},
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
		height: HEIGHT,
		width: WIDTH,
	});
	return new Uint8Array(await sharp(Buffer.from(svg)).png().toBuffer());
}

function canvas({ children }: { children: Node[] }): Node {
	return div({
		children,
		style: {
			backgroundColor: COLORS.background,
			color: COLORS.text,
			height: HEIGHT,
			position: "relative",
			width: WIDTH,
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
	const titleBlock = textBlock({
		fitted: fitText({
			maxWidth: TITLE_WIDTH,
			measure: createMeasure({ textFont: FONTS.title }),
			steps: TITLE_STEPS,
			text: title,
		}),
		style: {
			left: TITLE_LEFT,
			position: "absolute",
			top: 72,
			width: TITLE_WIDTH,
		},
		textFont: FONTS.title,
	});
	const nameBlock = textBlock({
		fitted: singleLine({ fontSize: 30, text: siteName }),
		textFont: FONTS.siteName,
	});
	const dateBlock = textBlock({
		fitted: singleLine({
			fontSize: 28,
			text: formatDotDate({ date: publishedAt }),
		}),
		style: { color: COLORS.date },
		textFont: FONTS.meta,
	});
	const root = canvas({
		children: [
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
			ball({ color, cx: 1090, cy: 560, r: 190 }),
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
			fontSize: 84,
			lineHeight: 88,
			lines: splitSiteName({ name: siteName }),
		},
		textFont: FONTS.siteName,
	});
	const taglineBlock = textBlock({
		fitted: fitText({
			maxWidth: SITE_BALL.cx - SITE_BALL.r - SITE_LEFT,
			measure: createMeasure({ textFont: FONTS.tagline }),
			steps: TAGLINE_STEPS,
			text: SITE_TAGLINE,
		}),
		style: { marginTop: 24, opacity: 0.8 },
		textFont: FONTS.tagline,
	});
	const root = canvas({
		children: [
			div({
				children: [nameBlock.node, taglineBlock.node],
				style: {
					flexDirection: "column",
					height: HEIGHT,
					justifyContent: "center",
					left: SITE_LEFT,
					position: "absolute",
					top: 0,
				},
			}),
			ball({ color: "navy", ...SITE_BALL }),
		],
	});
	return renderPng({ blocks: [nameBlock, taglineBlock], root });
}
