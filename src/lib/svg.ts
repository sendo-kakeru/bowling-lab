/** `#rrggbb` の色に別の色を ratio の割合で混ぜる */
export function mixHex({
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

/** SVG の断片を、それだけで開ける `<svg>` の文書にする（配信するファイルや data URI の画像） */
export function svgDocument({
	width,
	height,
	content,
}: {
	width: number;
	height: number;
	content: string;
}): string {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}
