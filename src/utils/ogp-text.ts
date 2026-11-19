/** 文字列を指定の大きさで組んだときの幅（px） */
export type Measure = ({
	text,
	fontSize,
}: {
	text: string;
	fontSize: number;
}) => number;

/**
 * 文字の大きさの候補。前から順に試し、lineWidths の行数に収まった最初のものを使う。
 * lineWidths は 1 行目からの各行の最大幅で、その長さが最大の行数になる
 */
export interface TextStep {
	fontSize: number;
	lineHeight: number;
	lineWidths: readonly [number, ...number[]];
}

export interface FittedText {
	fontSize: number;
	lineHeight: number;
	lines: string[];
}

const ELLIPSIS = "…";

/** 前後のどこでも改行できる字（和文）。英数字の語は途中で改行しない */
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}　-〿＀-￯]/u;

/** 行頭に置かない字。前の字とつなげる */
const NO_LINE_START = new Set(
	"、。，．・：；？！ー）］｝〕〉》」』】〙〗〟’”ゝゞヽヾぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ…‥,.:;?!)]}%",
);

/** 行末に置かない字。後ろの字とつなげる */
const NO_LINE_END = new Set("（［｛〔〈《「『【〘〖〝‘“([{");

/** 改行できる位置で区切った断片。半角の空白は " " の 1 つにまとめ、全角の空白は和文の字として残す */
function splitIntoAtoms({ text }: { text: string }): string[] {
	const tokens: string[] = [];
	for (const char of text.trim()) {
		const last = tokens.at(-1);
		if (/[^\S\u3000]/u.test(char)) {
			if (last !== " ") tokens.push(" ");
		} else if (
			WIDE.test(char) ||
			last === undefined ||
			last === " " ||
			WIDE.test(last.at(-1) ?? "")
		) {
			tokens.push(char);
		} else {
			tokens[tokens.length - 1] = last + char;
		}
	}
	const atoms: string[] = [];
	for (const token of tokens) {
		const last = atoms.at(-1);
		const joinsLast =
			last !== undefined &&
			last !== " " &&
			token !== " " &&
			(NO_LINE_START.has(token[0] ?? "") || NO_LINE_END.has(last.at(-1) ?? ""));
		if (joinsLast) atoms[atoms.length - 1] = last + token;
		else atoms.push(token);
	}
	return atoms;
}

/**
 * 行ごとの幅に収まるように行を分ける。lineWidths より後の行は最後の幅で組む。
 * 1 つで幅を超える語だけは字の途中で分ける
 */
function wrapText({
	text,
	lineWidths,
	fontSize,
	measure,
}: {
	text: string;
	lineWidths: TextStep["lineWidths"];
	fontSize: number;
	measure: Measure;
}): string[] {
	const lines: string[] = [];
	const fits = (line: string): boolean =>
		measure({ fontSize, text: line }) <=
		(lineWidths[lines.length] ?? lineWidths.at(-1) ?? lineWidths[0]);
	let line = "";
	for (const atom of splitIntoAtoms({ text })) {
		if (atom === " ") {
			if (line !== "") line += " ";
			continue;
		}
		if (fits(line + atom)) {
			line += atom;
			continue;
		}
		if (line.trim() !== "") lines.push(line.trimEnd());
		line = "";
		for (const char of atom) {
			if (line !== "" && !fits(line + char)) {
				lines.push(line);
				line = "";
			}
			line += char;
		}
	}
	if (line.trim() !== "") lines.push(line.trimEnd());
	return lines;
}

/** 最後の行を幅に収まるまで削り、末尾を「…」にする */
function truncateLine({
	line,
	maxWidth,
	fontSize,
	measure,
}: {
	line: string;
	maxWidth: number;
	fontSize: number;
	measure: Measure;
}): string {
	let chars = [...line];
	while (
		chars.length > 0 &&
		measure({ fontSize, text: chars.join("") + ELLIPSIS }) > maxWidth
	) {
		chars = chars.slice(0, -1);
	}
	return chars.join("").trimEnd() + ELLIPSIS;
}

/**
 * 文字の大きさを steps の順に試し、実際に組んだ行数が lineWidths の行数以下になった最初の大きさで組む。
 * 最後の大きさでも収まらなければ、最後の行の末尾を「…」で省略する
 */
export function fitText({
	text,
	steps,
	measure,
}: {
	text: string;
	steps: readonly [TextStep, ...TextStep[]];
	measure: Measure;
}): FittedText {
	for (const { fontSize, lineHeight, lineWidths } of steps) {
		const lines = wrapText({ fontSize, lineWidths, measure, text });
		if (lines.length <= lineWidths.length) {
			return { fontSize, lineHeight, lines };
		}
	}
	const { fontSize, lineHeight, lineWidths } = steps.at(-1) ?? steps[0];
	const lines = wrapText({ fontSize, lineWidths, measure, text });
	const last = lineWidths.length - 1;
	return {
		fontSize,
		lineHeight,
		lines: [
			...lines.slice(0, last),
			truncateLine({
				fontSize,
				line: lines[last] ?? "",
				maxWidth: lineWidths[last] ?? lineWidths[0],
				measure,
			}),
		],
	};
}
