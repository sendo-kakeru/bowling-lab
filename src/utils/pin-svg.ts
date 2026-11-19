import { mixHex } from "./ball-svg.ts";
import { TOKEN_COLORS } from "./token-colors.ts";

/*
  ボウリングピンの絵。サイト共通の OGP 画像（#48）で使う。
  色はボールと同じく絵の色として扱い、トークンにはしない（足元の影だけはトークンの茶）
*/

const PIN_BODY = "#fdfaf4";
const PIN_SHADE = "#d8cdbb";
const PIN_STRIPE = "#b3121b";

/**
 * 輪郭の右半分。高さを 100 とした単位 (u, v) で、頭の上端の中心から足元の右端まで。
 * 左半分は u を反転して逆にたどる
 */
const RIGHT_HALF = [
	[9, 0, 12, 8, 12, 16],
	[12, 24, 8, 28, 8, 34],
	[8, 42, 21, 52, 21, 70],
	[21, 86, 14, 96, 11, 100],
] as const;

/** 首の赤い帯（v の範囲） */
const STRIPES = [
	[26, 29.6],
	[32.5, 36.1],
] as const;

/** 光。頭と胴に 1 本ずつ */
const HIGHLIGHTS = [
	[-6, 6, -8, 14, -7, 20],
	[-13, 56, -17, 70, -13, 86],
] as const;

/**
 * ピンの SVG の断片（`<g>`）。足元の影も含む。
 * グラデーションと切り抜きの id は id から作るので、1 枚に置くピンごとに別の id を渡す
 */
export function pinSvg({
	cx,
	top,
	height,
	id,
}: {
	cx: number;
	top: number;
	height: number;
	id: string;
}): string {
	const k = height / 100;
	const x = (u: number): number => cx + u * k;
	const y = (v: number): number => top + v * k;
	const point = (u: number, v: number): string => `${x(u)},${y(v)}`;
	const right = RIGHT_HALF.map(
		([u1, v1, u2, v2, u3, v3]) =>
			`C${point(u1, v1)} ${point(u2, v2)} ${point(u3, v3)}`,
	).join(" ");
	// 左半分は、右半分の各曲線を逆向きにたどる（制御点を入れ替え、終点を 1 つ前の曲線の終点にする）
	const ends: (readonly [number, number])[] = [
		[0, 0],
		...RIGHT_HALF.map(([, , , , u, v]) => [u, v] as const),
	];
	const left = RIGHT_HALF.map(([u1, v1, u2, v2], index) => {
		const [u0, v0] = ends[index] ?? [0, 0];
		return `C${point(-u2, v2)} ${point(-u1, v1)} ${point(-u0, v0)}`;
	})
		.reverse()
		.join(" ");
	const outline = `M${point(0, 0)} ${right} L${point(-11, 100)} ${left} Z`;
	const shadeId = `pin-${id}-shade`;
	const clipId = `pin-${id}-clip`;
	const stripes = STRIPES.map(
		([from, to]) =>
			`<rect x="${x(-30)}" y="${y(from)}" width="${60 * k}" height="${(to - from) * k}" fill="${PIN_STRIPE}"/>`,
	).join("");
	const highlights = HIGHLIGHTS.map(
		([u1, v1, u2, v2, u3, v3]) =>
			`M${point(u1, v1)} Q${point(u2, v2)} ${point(u3, v3)}`,
	).join(" ");
	const shadowRx = 0.22 * height;
	return `<g><ellipse cx="${cx}" cy="${y(100)}" rx="${shadowRx}" ry="${shadowRx * 0.16}" fill="${TOKEN_COLORS["ink-600"]}" opacity="0.18"/><defs><linearGradient id="${shadeId}" x1="0" x2="1"><stop offset="0" stop-color="${mixHex({ base: PIN_BODY, other: "#ffffff", ratio: 0.25 })}"/><stop offset="0.45" stop-color="${PIN_BODY}"/><stop offset="1" stop-color="${PIN_SHADE}"/></linearGradient><clipPath id="${clipId}"><path d="${outline}"/></clipPath></defs><path d="${outline}" fill="url(#${shadeId})"/><g clip-path="url(#${clipId})">${stripes}<path d="${highlights}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="${2.4 * k}" stroke-linecap="round"/></g></g>`;
}
