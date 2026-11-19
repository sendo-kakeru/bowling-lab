import { describe, expect, test } from "vitest";
import {
	type BallPath,
	CLEARING_MS,
	createShot,
	type DeckEvent,
	type DeckState,
	getPhaseDuration,
	INITIAL_STATE,
	LEAVES,
	PIN_NUMBERS,
	type PinNumber,
	pickStanding,
	planBallPath,
	rollShot,
	type Shot,
	toView,
	transition,
} from "./pin-deck.ts";

/** 種を固定した擬似乱数（mulberry32）。0 以上 1 未満 */
function seeded({ seed }: { seed: number }): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function isAscending({ values }: { values: readonly number[] }): boolean {
	return values.every((value, index) => {
		const previous = values[index - 1];
		return previous === undefined || previous < value;
	});
}

/** 残ったピンと倒れたピンで、1〜10 がちょうど 1 度ずつ。どちらも昇順 */
function expectEveryPinOnce({ shot }: { shot: Shot }): void {
	const fallen = shot.falls.map(({ pin }) => pin);
	expect([...shot.standing, ...fallen].sort((a, b) => a - b)).toEqual([
		...PIN_NUMBERS,
	]);
	expect(isAscending({ values: shot.standing })).toBe(true);
	expect(isAscending({ values: fallen })).toBe(true);
}

const leavePins = LEAVES.map(({ pins }) => pins);

describe("pickStanding", () => {
	test.each([0, 0.2799])(
		"outcomeRoll が %s ならストライク（何も残らない）",
		(outcomeRoll) => {
			expect(pickStanding({ leaveRoll: 0.5, outcomeRoll })).toEqual([]);
		},
	);

	test.each([0.28, 0.3099])(
		"outcomeRoll が %s ならガター（10 本残る）",
		(outcomeRoll) => {
			expect(pickStanding({ leaveRoll: 0.5, outcomeRoll })).toEqual([
				...PIN_NUMBERS,
			]);
		},
	);

	test.each([0.31, 0.9999])(
		"outcomeRoll が %s なら残り方の表のどれか",
		(outcomeRoll) => {
			expect(leavePins).toContainEqual(
				pickStanding({ leaveRoll: 0.5, outcomeRoll }),
			);
		},
	);

	test("leaveRoll が 0 なら表の最初、0.9999 なら表の最後", () => {
		expect(pickStanding({ leaveRoll: 0, outcomeRoll: 0.5 })).toEqual(
			leavePins[0],
		);
		expect(pickStanding({ leaveRoll: 0.9999, outcomeRoll: 0.5 })).toEqual(
			leavePins[leavePins.length - 1],
		);
	});

	test("重みの境目を越えると、隣の残り方に変わる", () => {
		const total = LEAVES.reduce((sum, { weight }) => sum + weight, 0);
		let start = 0;
		for (const [index, { pins, weight }] of LEAVES.entries()) {
			expect(
				pickStanding({ leaveRoll: start / total, outcomeRoll: 0.5 }),
			).toEqual(pins);
			expect(
				pickStanding({
					leaveRoll: (start + weight - 0.001) / total,
					outcomeRoll: 0.5,
				}),
			).toEqual(pins);
			if (index > 0) {
				expect(
					pickStanding({
						leaveRoll: (start - 0.001) / total,
						outcomeRoll: 0.5,
					}),
				).toEqual(LEAVES[index - 1]?.pins);
			}
			start += weight;
		}
	});
});

describe("LEAVES", () => {
	test.each(leavePins.map((pins) => [pins.join("-"), pins] as const))(
		"%s は 1〜4 本、昇順、重複なし、1 番を含まない",
		(_, pins) => {
			expect(pins.length).toBeGreaterThanOrEqual(1);
			expect(pins.length).toBeLessThanOrEqual(4);
			expect(isAscending({ values: pins })).toBe(true);
			expect(pins).not.toContain(1);
		},
	);

	test("同じ残り方は 2 度出てこず、重みは正の整数", () => {
		const keys = leavePins.map((pins) => pins.join("-"));
		expect(new Set(keys).size).toBe(keys.length);
		for (const { weight } of LEAVES) {
			expect(Number.isInteger(weight)).toBe(true);
			expect(weight).toBeGreaterThan(0);
		}
	});
});

describe("createShot", () => {
	const cases: [string, readonly PinNumber[]][] = [
		["ストライク", []],
		["残り 4・6・7・10", [4, 6, 7, 10]],
		["ガター", PIN_NUMBERS],
	];

	test.each(cases)("%s: 1〜10 がちょうど 1 度ずつ", (_, standing) => {
		for (const random of [() => 0, () => 0.5, () => 0.9999]) {
			expectEveryPinOnce({ shot: createShot({ random, standing }) });
		}
	});

	test("残るピンの並びが乱れていても、昇順にそろえる", () => {
		const shot = createShot({ random: () => 0.5, standing: [10, 4, 7] });
		expect(shot.standing).toEqual([4, 7, 10]);
	});

	test("倒れたピンは奥へ 6〜22、横に 6〜22 滑り、25〜110 度傾く", () => {
		for (const random of [() => 0, () => 0.9999, seeded({ seed: 3 })]) {
			for (const fall of createShot({ random, standing: [] }).falls) {
				expect(fall.y).toBeGreaterThanOrEqual(-22);
				expect(fall.y).toBeLessThanOrEqual(-6);
				expect(Math.abs(fall.x)).toBeGreaterThanOrEqual(6);
				expect(Math.abs(fall.x)).toBeLessThanOrEqual(22);
				expect(Math.abs(fall.angle)).toBeGreaterThanOrEqual(25);
				expect(Math.abs(fall.angle)).toBeLessThanOrEqual(110);
				expect(Math.sign(fall.angle)).toBe(Math.sign(fall.x));
			}
		}
	});

	test("ボールより左のピンは左へ、右のピンは右へ倒れる", () => {
		const shot = createShot({ random: () => 0.5, standing: [] });
		const sideOf = (pin: PinNumber): number =>
			Math.sign(shot.falls.find((fall) => fall.pin === pin)?.x ?? 0);
		for (const pin of [2, 4, 7, 8] as const) expect(sideOf(pin)).toBe(-1);
		for (const pin of [3, 6, 9, 10] as const) expect(sideOf(pin)).toBe(1);
	});

	test("ストライクのボールはポケット（137〜141）、それ以外は 128〜146 に止まる", () => {
		for (const random of [() => 0, () => 0.9999]) {
			const strike = createShot({ random, standing: [] }).ballX;
			expect(strike).toBeGreaterThanOrEqual(137);
			expect(strike).toBeLessThanOrEqual(141);
			const leave = createShot({ random, standing: [10] }).ballX;
			expect(leave).toBeGreaterThanOrEqual(128);
			expect(leave).toBeLessThanOrEqual(146);
		}
	});

	test("ガターのボールは箱（0〜260）の外へ抜け、ピンは倒れない", () => {
		for (const random of [() => 0, () => 0.9999]) {
			const shot = createShot({ random, standing: PIN_NUMBERS });
			expect(shot.ballX < 0 || shot.ballX > 260).toBe(true);
			expect(shot.falls).toEqual([]);
		}
	});
});

describe("rollShot", () => {
	test("種を固定した乱数で 1000 投しても、どの 1 投も決まりを満たす", () => {
		const random = seeded({ seed: 42 });
		for (let i = 0; i < 1000; i += 1) {
			const shot = rollShot({ random });
			expectEveryPinOnce({ shot });
			expect([0, 6, 7, 8, 9, 10]).toContain(shot.falls.length);
		}
	});
});

const STRIKE = createShot({ random: () => 0.5, standing: [] });
const LEAVE = createShot({ random: () => 0.5, standing: [4, 7, 10] });
const GUTTER = createShot({ random: () => 0.5, standing: PIN_NUMBERS });
const PATH: BallPath = {
	duration: 1200,
	endX: 100,
	endY: 50,
	startX: 120,
	startY: 800,
};

describe("transition", () => {
	const rolling: DeckState = { path: PATH, phase: "rolling", shot: LEAVE };
	const result: DeckState = { phase: "result", shot: LEAVE };
	const clearing: DeckState = {
		next: STRIKE,
		path: PATH,
		phase: "clearing",
	};
	const roll: DeckEvent = { path: PATH, shot: STRIKE, type: "roll" };
	const elapsed: DeckEvent = { type: "elapsed" };
	const abort: DeckEvent = { type: "abort" };

	test("idle で投げると、その 1 投と道のりで rolling に入る", () => {
		expect(transition({ event: roll, state: INITIAL_STATE })).toEqual({
			path: PATH,
			phase: "rolling",
			shot: STRIKE,
		});
	});

	test("rolling の時間が過ぎると、その 1 投の result に入る", () => {
		expect(transition({ event: elapsed, state: rolling })).toEqual({
			phase: "result",
			shot: LEAVE,
		});
	});

	test("result で投げると、前の 1 投を片付ける clearing に、次の 1 投と道のりを持って入る", () => {
		expect(transition({ event: roll, state: result })).toEqual(clearing);
	});

	test("clearing の時間が過ぎると、持っていた 1 投と道のりで rolling に入る", () => {
		expect(transition({ event: elapsed, state: clearing })).toEqual({
			path: PATH,
			phase: "rolling",
			shot: STRIKE,
		});
	});

	test.each([
		["rolling", rolling],
		["clearing", clearing],
	])("%s で見られなくなると idle に戻る", (_, state) => {
		expect(transition({ event: abort, state })).toEqual({ phase: "idle" });
	});

	test.each([
		["idle の elapsed", INITIAL_STATE, elapsed],
		["idle の abort", INITIAL_STATE, abort],
		["rolling の roll（連打）", rolling, roll],
		["result の elapsed", result, elapsed],
		["result の abort（止まった絵は戻さない）", result, abort],
		["clearing の roll（連打）", clearing, roll],
	] as const)("%s は受け付けず、同じ参照を返す", (_, state, event) => {
		expect(transition({ event, state })).toBe(state);
	});
});

describe("getPhaseDuration", () => {
	const rolling: DeckState = { path: PATH, phase: "rolling", shot: LEAVE };
	const clearing: DeckState = {
		next: STRIKE,
		path: PATH,
		phase: "clearing",
	};

	test("rolling は道のりの時間、clearing は片付けの時間。idle と result は待たない", () => {
		const reducedMotion = false;
		expect(getPhaseDuration({ reducedMotion, state: rolling })).toBe(1200);
		expect(getPhaseDuration({ reducedMotion, state: clearing })).toBe(
			CLEARING_MS,
		);
		expect(
			getPhaseDuration({ reducedMotion, state: INITIAL_STATE }),
		).toBeUndefined();
		expect(
			getPhaseDuration({
				reducedMotion,
				state: { phase: "result", shot: LEAVE },
			}),
		).toBeUndefined();
	});

	test("動きを減らす設定では、rolling と clearing を 150ms に縮め、result は待たないまま", () => {
		const reducedMotion = true;
		expect(getPhaseDuration({ reducedMotion, state: rolling })).toBe(150);
		expect(getPhaseDuration({ reducedMotion, state: clearing })).toBe(150);
		expect(
			getPhaseDuration({
				reducedMotion,
				state: { phase: "result", shot: LEAVE },
			}),
		).toBeUndefined();
	});
});

describe("planBallPath", () => {
	const deck = { x: 100, y: 40 };
	const unit = 1.35;

	test("出発点は見えている画面の下端より下", () => {
		for (const viewportBottom of [300, 720, 5000]) {
			const path = planBallPath({ deck, shot: LEAVE, unit, viewportBottom });
			expect(path.startY).toBeGreaterThan(viewportBottom);
		}
	});

	test("時間は 900〜1600ms で、遠いほど長い", () => {
		const near = planBallPath({ deck, shot: LEAVE, unit, viewportBottom: 260 });
		const middle = planBallPath({
			deck,
			shot: LEAVE,
			unit,
			viewportBottom: 900,
		});
		const far = planBallPath({ deck, shot: LEAVE, unit, viewportBottom: 9000 });
		expect(near.duration).toBe(900);
		expect(far.duration).toBe(1600);
		expect(middle.duration).toBeGreaterThan(900);
		expect(middle.duration).toBeLessThan(1600);
	});

	test("ストライクはポケット（ピン座標 137〜141）に、ヘッドピンの手前で止まる", () => {
		const path = planBallPath({
			deck,
			shot: STRIKE,
			unit,
			viewportBottom: 720,
		});
		expect(path.endX).toBeGreaterThanOrEqual(deck.x + 137 * unit);
		expect(path.endX).toBeLessThanOrEqual(deck.x + 141 * unit);
		// ヘッドピン（133.8）より手前、2 番・3 番（99.2）より手前
		expect(path.endY).toBeGreaterThan(deck.y + 99.2 * unit);
		expect(path.endY).toBeLessThan(deck.y + 133.8 * unit);
	});

	test("ガターは箱（幅 260）の左右の外を、奥の行より奥まで、曲がらずに抜ける", () => {
		for (const random of [() => 0, () => 0.9999]) {
			const shot = createShot({ random, standing: PIN_NUMBERS });
			const path = planBallPath({ deck, shot, unit, viewportBottom: 720 });
			expect(path.endX < deck.x || path.endX > deck.x + 260 * unit).toBe(true);
			expect(path.endY).toBeLessThan(deck.y + 30 * unit);
			// 横に動くと、立っているピンの上を通る
			expect(path.startX).toBe(path.endX);
		}
	});
});

describe("toView", () => {
	test("idle は PLAY だけで、ピンは立ったまま、札も読み上げもない", () => {
		expect(toView({ state: INITIAL_STATE })).toEqual({
			button: { hint: "（ボールを投げる）", text: "PLAY" },
			falls: [],
			phase: "idle",
			result: undefined,
			speech: "",
		});
	});

	test.each([
		["rolling", { path: PATH, phase: "rolling", shot: STRIKE }],
		["clearing", { next: LEAVE, path: PATH, phase: "clearing" }],
	] as const)("%s はピンを立てて描き、札も読み上げも出さない", (_, state) => {
		const view = toView({ state });
		expect(view.falls).toEqual([]);
		expect(view.result).toBeUndefined();
		expect(view.speech).toBe("");
	});

	test("ストライクは欄にストライクの印、STRIKE、10 本倒れた文", () => {
		const view = toView({ state: { phase: "result", shot: STRIKE } });
		expect(view.result).toEqual({ box: "strike", count: 10, text: "STRIKE" });
		expect(view.speech).toBe("ストライク。10 本すべて倒れました");
		expect(view.falls).toHaveLength(10);
		expect(view.button).toEqual({ hint: "（もう一度投げる）", text: "AGAIN" });
	});

	test("残りがあると欄に倒した本数だけを出し、残ったピンは示さない", () => {
		const view = toView({ state: { phase: "result", shot: LEAVE } });
		expect(view.result).toEqual({ box: "count", count: 7, text: undefined });
		expect(view.speech).toBe("7 本倒れました");
		expect(view.falls.map(({ pin }) => pin)).toEqual([1, 2, 3, 5, 6, 8, 9]);
	});

	test("ガターは欄に G、GUTTER、1 本も倒れなかった文", () => {
		const view = toView({ state: { phase: "result", shot: GUTTER } });
		expect(view.result).toEqual({ box: "gutter", count: 0, text: "GUTTER" });
		expect(view.speech).toBe("ガター。1 本も倒れませんでした");
		expect(view.falls).toEqual([]);
	});
});
