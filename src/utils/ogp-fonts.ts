import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import * as fontkit from "fontkit";
import type { Font } from "satori";
import type { Measure } from "./ogp-text.ts";

/*
  OGP 画像の書体。Fontsource の npm パッケージの woff を読む（satori は woff2 を読めない）。
  Fontsource は 1 つの書体を unicode-range ごとのファイルに分けている（Noto Sans JP は 1 太さで 100 以上）ので、
  描く文字を含むファイルだけを読み、satori に渡すのと同じファイルで幅を測る
*/

type FontWeight = 500 | 700;

const FAMILY_PACKAGES = {
	"Barlow Condensed": "@fontsource/barlow-condensed",
	Inter: "@fontsource/inter",
	"Noto Sans JP": "@fontsource/noto-sans-jp",
} as const;

type FontFamily = keyof typeof FAMILY_PACKAGES;

/** 書体の組み合わせ。前の書体に字がなければ次の書体で描く */
export interface TextFont {
	families: readonly FontFamily[];
	weight: FontWeight;
	letterSpacing?: number;
}

interface FontFace {
	family: FontFamily;
	weight: FontWeight;
	file: string;
	ranges: [number, number][];
}

const require = createRequire(import.meta.url);

function parseUnicodeRange({ value }: { value: string }): [number, number][] {
	return value.split(",").map((part) => {
		const [start = "", end = start] = part
			.trim()
			.replace(/^U\+/i, "")
			.split("-");
		return [Number.parseInt(start, 16), Number.parseInt(end, 16)];
	});
}

const facesCache = new Map<string, FontFace[]>();

/** `<パッケージ>/<太さ>.css` の @font-face から、woff のパスと unicode-range を読む */
function getFaces({
	family,
	weight,
}: {
	family: FontFamily;
	weight: FontWeight;
}): FontFace[] {
	const key = `${family}:${weight}`;
	const cached = facesCache.get(key);
	if (cached) return cached;
	const cssPath = require.resolve(`${FAMILY_PACKAGES[family]}/${weight}.css`);
	const css = readFileSync(cssPath, "utf8");
	const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map(
		([, body = ""]) => {
			const file = body.match(/url\(([^)]+\.woff)\)/)?.[1];
			const range = body.match(/unicode-range:\s*([^;]+);/)?.[1];
			if (!file || !range) throw new Error(`書体の CSS を読めない: ${cssPath}`);
			return {
				family,
				file: join(dirname(cssPath), file),
				ranges: parseUnicodeRange({ value: range }),
				weight,
			};
		},
	);
	facesCache.set(key, faces);
	return faces;
}

const fileCache = new Map<string, { data: Buffer; font: fontkit.Font }>();

function loadFace({ face }: { face: FontFace }): {
	data: Buffer;
	font: fontkit.Font;
} {
	const cached = fileCache.get(face.file);
	if (cached) return cached;
	const data = readFileSync(face.file);
	const font = fontkit.create(data);
	if (!("layout" in font))
		throw new Error(`書体のファイルを読めない: ${face.file}`);
	const loaded = { data, font };
	fileCache.set(face.file, loaded);
	return loaded;
}

/** その字を描く書体のファイル。どの書体にもなければ undefined */
function faceForCodePoint({
	textFont,
	codePoint,
}: {
	textFont: TextFont;
	codePoint: number;
}): FontFace | undefined {
	for (const family of textFont.families) {
		const face = getFaces({ family, weight: textFont.weight }).find(
			({ ranges }) =>
				ranges.some(([start, end]) => start <= codePoint && codePoint <= end),
		);
		if (face && loadFace({ face }).font.hasGlyphForCodePoint(codePoint))
			return face;
	}
	return undefined;
}

/** 字を描くのに使う書体のファイル。family の順、ファイルの順に並べる */
function facesForTexts({
	textFont,
	texts,
}: {
	textFont: TextFont;
	texts: string[];
}): FontFace[] {
	const used = new Set<FontFace>();
	for (const char of texts.join("")) {
		const face = faceForCodePoint({
			codePoint: char.codePointAt(0) ?? 0,
			textFont,
		});
		if (face) used.add(face);
	}
	return textFont.families.flatMap((family) =>
		getFaces({ family, weight: textFont.weight }).filter((face) =>
			used.has(face),
		),
	);
}

/**
 * satori に渡す書体と、要素の fontFamily に書く名前。
 * satori は同じ名前の書体を 1 つしか使わないので、unicode-range のファイルごとにファイル名を名前にする
 */
export function satoriFonts({
	textFont,
	texts,
}: {
	textFont: TextFont;
	texts: string[];
}): { fontFamily: string; fonts: Font[] } {
	const faces = facesForTexts({ textFont, texts });
	const fonts = faces.map(
		(face): Font => ({
			data: loadFace({ face }).data,
			name: basename(face.file, ".woff"),
			style: "normal",
			weight: face.weight,
		}),
	);
	return { fontFamily: fonts.map(({ name }) => `"${name}"`).join(","), fonts };
}

/** 書体を切り替える位置で区切り、区切りごとに字形を並べた幅を足す。字間は 1 字ごとに足す */
export function createMeasure({ textFont }: { textFont: TextFont }): Measure {
	return ({ text, fontSize }) => {
		const runs: { face: FontFace | undefined; text: string }[] = [];
		for (const char of text) {
			const face = faceForCodePoint({
				codePoint: char.codePointAt(0) ?? 0,
				textFont,
			});
			const last = runs.at(-1);
			if (last && last.face === face) last.text += char;
			else runs.push({ face, text: char });
		}
		const glyphs = runs.reduce((width, run) => {
			if (!run.face) return width + fontSize * [...run.text].length;
			const { font } = loadFace({ face: run.face });
			return (
				width +
				(font.layout(run.text).advanceWidth / font.unitsPerEm) * fontSize
			);
		}, 0);
		return glyphs + (textFont.letterSpacing ?? 0) * [...text].length;
	};
}
