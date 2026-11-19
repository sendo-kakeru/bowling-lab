import { describe, expect, test } from "vitest";
import { pinSvg } from "./pin-svg.ts";

/** 輪郭の path の座標を [x, y] の組にする */
function outlinePoints({ svg }: { svg: string }): [number, number][] {
	const d = svg.match(/<path d="([^"]+)" fill="url/)?.[1] ?? "";
	return [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map(([, x = "", y = ""]) => [
		Number(x),
		Number(y),
	]);
}

describe("pinSvg", () => {
	test("輪郭は中心の縦の線に対して左右対称", () => {
		const points = outlinePoints({
			svg: pinSvg({ cx: 100, height: 100, id: "a", top: 0 }),
		});
		const key = ([x, y]: [number, number]): string =>
			`${Math.abs(x - 100).toFixed(2)},${y.toFixed(2)}`;
		const left = points.filter(([x]) => x < 100).map(key);
		const right = points.filter(([x]) => x > 100).map(key);
		expect(left.sort()).toEqual(right.sort());
	});

	test("頭の上端が top、足元が top + 高さ、横幅は高さの 0.42 倍", () => {
		const points = outlinePoints({
			svg: pinSvg({ cx: 500, height: 300, id: "a", top: 150 }),
		});
		const xs = points.map(([x]) => x);
		const ys = points.map(([, y]) => y);
		expect(Math.min(...ys)).toBe(150);
		expect(Math.max(...ys)).toBe(450);
		expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(126);
	});

	test("グラデーションと切り抜きの id は渡した id から作る", () => {
		const svg = pinSvg({ cx: 0, height: 100, id: "back", top: 0 });
		expect(svg).toContain('id="pin-back-shade"');
		expect(svg).toContain('id="pin-back-clip"');
	});
});
