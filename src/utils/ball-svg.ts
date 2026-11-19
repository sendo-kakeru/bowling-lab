/*
  ボウリングボールの絵。既定のサムネイルと OGP 画像（#48）で使う。
  色は絵の色として扱い、トークンにはしない（CSS からは使わない）。紺はトークンの紺では暗すぎるので明るめにしている
*/

/** キーの順が記事に色を割り当てる順（thumbnail.ts の ballColorForSlug）。並べ替えると既存の記事の色が変わる */
// biome-ignore assist/source/useSortedKeys: キーの順に意味があるため
export const BALL_COLORS = {
	navy: "#2c406a",
	rust: "#b5502f",
	green: "#2f6b57",
	yellow: "#b8892b",
	purple: "#6a3f7a",
	teal: "#2b7a8c",
} as const;

export type BallColorName = keyof typeof BALL_COLORS;

export const BALL_COLOR_NAMES = Object.keys(BALL_COLORS) as BallColorName[];

/** `#rrggbb` の色に別の色を ratio の割合で混ぜる */
function mixHex({
	base,
	other,
	ratio,
}: {
	base: string;
	other: string;
	ratio: number;
}): string {
	const channels = (hex: string): number[] =>
		[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
	const others = channels(other);
	return `#${channels(base)
		.map((c, i) =>
			Math.round(c + ((others[i] ?? c) - c) * ratio)
				.toString(16)
				.padStart(2, "0"),
		)
		.join("")}`;
}

/** 指穴。ボールの中心からの位置と半径を、ボールの半径に対する比で持つ */
const HOLES = [
	{ dx: -0.22, dy: -0.28, r: 0.085 },
	{ dx: 0.02, dy: -0.36, r: 0.085 },
	{ dx: -0.08, dy: -0.02, r: 0.11 },
] as const;

/** 座標の浮動小数の誤差（35.840000000000003 など）を SVG に出さない */
function round({ value }: { value: number }): number {
	return Math.round(value * 100) / 100;
}

/**
 * ボールの SVG の断片（`<g>`）。呼び出し側の `<svg>` に埋め込む。
 * グラデーションと切り抜きの id は色の名前から作るので、同じ色のボールを 1 枚に 2 つ置くと id が重なる
 */
export function ballSvg({
	cx,
	cy,
	r,
	color,
}: {
	cx: number;
	cy: number;
	r: number;
	color: BallColorName;
}): string {
	const base = BALL_COLORS[color];
	const light = mixHex({ base, other: "#ffffff", ratio: 0.22 });
	const hole = mixHex({ base, other: "#000000", ratio: 0.7 });
	const shadeId = `ball-${color}-shade`;
	const clipId = `ball-${color}-clip`;
	const x = (k: number): number => round({ value: cx + k * r });
	const y = (k: number): number => round({ value: cy + k * r });
	const wave = `M${x(-1)} ${y(0.25)} C${x(-0.3)} ${y(-0.4)} ${x(0.2)} ${y(0.7)} ${x(1)} ${y(-0.1)}`;
	const holes = HOLES.map(
		(h) =>
			`<circle cx="${x(h.dx)}" cy="${y(h.dy)}" r="${round({ value: h.r * r })}" fill="${hole}"/>`,
	).join("");
	return `<g><defs><radialGradient id="${shadeId}" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${base}"/></radialGradient><clipPath id="${clipId}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${shadeId})"/><path d="${wave}" fill="none" stroke="#ffffff" stroke-opacity="0.1" stroke-width="${round({ value: 0.2 * r })}" clip-path="url(#${clipId})"/>${holes}</g>`;
}
