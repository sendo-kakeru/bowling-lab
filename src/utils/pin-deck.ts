/*
  ホームのピンデッキ（PinDeck）の、DOM に触れない部分。
  座標は単位のない「ピン座標」。横の間隔 40、行の間 34.6 の正三角形で、箱は 260 × 150。長さにするのは CSS。
*/

/** ピンの箱の幅（ピン座標）。PinDeck.astro が .deck の幅に使い、script は実際の幅との比で 1 の長さを測る */
export const DECK_WIDTH = 260;

export const PIN_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
export type PinNumber = (typeof PIN_NUMBERS)[number];

export interface PinSpot {
	pin: PinNumber;
	x: number;
	y: number;
	/** ヘッドピンからの行数。倒れる順の遅延に使う */
	depth: number;
}

/** 奥の行から並べる。後ろに書いたピンほど手前に描かれる */
export const PIN_SPOTS: readonly PinSpot[] = [
	{ depth: 3, pin: 7, x: 70, y: 30 },
	{ depth: 3, pin: 8, x: 110, y: 30 },
	{ depth: 3, pin: 9, x: 150, y: 30 },
	{ depth: 3, pin: 10, x: 190, y: 30 },
	{ depth: 2, pin: 4, x: 90, y: 64.6 },
	{ depth: 2, pin: 5, x: 130, y: 64.6 },
	{ depth: 2, pin: 6, x: 170, y: 64.6 },
	{ depth: 1, pin: 2, x: 110, y: 99.2 },
	{ depth: 1, pin: 3, x: 150, y: 99.2 },
	{ depth: 0, pin: 1, x: 130, y: 133.8 },
];

/** 倒れたピンが滑る先（ピン座標で、立ち位置からのずれ）と寝た向き */
export interface PinFall {
	pin: PinNumber;
	x: number;
	y: number;
	/** 度 */
	angle: number;
}

/** 1 投。押した瞬間にすべて決まり、あとは変わらない */
export interface Shot {
	/** 残ったピン。番号の昇順。空ならストライク、10 本ならガター */
	standing: readonly PinNumber[];
	/** 倒れたピン。番号の昇順 */
	falls: readonly PinFall[];
	/** ボールが止まる横の位置（ピン座標）。ガターは箱の外 */
	ballX: number;
}

/** outcomeRoll がこれ未満ならストライク（28%）、次の境目未満ならガター（3%）。率を足すと浮動小数点で境目がずれるので、境目で持つ */
const STRIKE_BELOW = 0.28;
const GUTTER_BELOW = 0.31;

/** 重みは整数で、合計に対する割合で選ばれる。値は仮で、持ち主が直す前提 */
export const LEAVES: readonly { pins: readonly PinNumber[]; weight: number }[] =
	[
		{ pins: [10], weight: 14 },
		{ pins: [7], weight: 8 },
		{ pins: [4], weight: 4 },
		{ pins: [6], weight: 3 },
		{ pins: [8], weight: 3 },
		{ pins: [9], weight: 3 },
		{ pins: [5], weight: 1 },
		{ pins: [6, 10], weight: 5 },
		{ pins: [4, 7], weight: 4 },
		{ pins: [3, 10], weight: 3 },
		{ pins: [2, 7], weight: 3 },
		{ pins: [2, 8], weight: 2 },
		{ pins: [3, 9], weight: 2 },
		{ pins: [7, 10], weight: 2 },
		{ pins: [5, 7], weight: 1 },
		{ pins: [3, 6, 10], weight: 3 },
		{ pins: [2, 4, 7], weight: 3 },
		{ pins: [2, 4, 5], weight: 2 },
		{ pins: [3, 5, 6], weight: 2 },
		{ pins: [6, 7, 10], weight: 1 },
		{ pins: [4, 7, 10], weight: 1 },
		{ pins: [2, 4, 5, 8], weight: 3 },
		{ pins: [3, 5, 6, 9], weight: 2 },
		{ pins: [3, 6, 9, 10], weight: 1 },
		{ pins: [4, 6, 7, 10], weight: 1 },
	];

const TOTAL_WEIGHT = LEAVES.reduce((sum, { weight }) => sum + weight, 0);

/** 残るピンを決める。どちらの引数も 0 以上 1 未満 */
export function pickStanding({
	outcomeRoll,
	leaveRoll,
}: {
	outcomeRoll: number;
	leaveRoll: number;
}): readonly PinNumber[] {
	if (outcomeRoll < STRIKE_BELOW) return [];
	if (outcomeRoll < GUTTER_BELOW) return PIN_NUMBERS;
	let rest = leaveRoll * TOTAL_WEIGHT;
	for (const { pins, weight } of LEAVES) {
		if (rest < weight) return pins;
		rest -= weight;
	}
	return LEAVES[LEAVES.length - 1]?.pins ?? [];
}

/** ストライクはポケット、それ以外はヘッドピンの前、ガターは箱の左右の外 */
const BALL_X = {
	gutterLeft: -40,
	gutterRight: 300,
	leave: { max: 146, min: 128 },
	strike: { max: 141, min: 137 },
} as const;

/** ボールからこれ以上離れていないピンは、左右どちらへ倒れるかを乱数で決める */
const FALL_SIDE_MARGIN = 4;

function between({
	min,
	max,
	random,
}: {
	min: number;
	max: number;
	random: () => number;
}): number {
	return min + random() * (max - min);
}

/** 残るピンから 1 投を組み立てる（ボールの止まる位置と、倒れたピンの滑り方を決める） */
export function createShot({
	standing,
	random,
}: {
	standing: readonly PinNumber[];
	random: () => number;
}): Shot {
	const sorted = [...new Set(standing)].sort((a, b) => a - b);
	const ballX =
		sorted.length === PIN_NUMBERS.length
			? random() < 0.5
				? BALL_X.gutterLeft
				: BALL_X.gutterRight
			: between({
					...(sorted.length === 0 ? BALL_X.strike : BALL_X.leave),
					random,
				});
	const falls = [...PIN_SPOTS]
		.sort((a, b) => a.pin - b.pin)
		.filter(({ pin }) => !sorted.includes(pin))
		.map(({ pin, x }): PinFall => {
			// ボールから離れる向きに倒れる
			const side =
				x < ballX - FALL_SIDE_MARGIN
					? -1
					: x > ballX + FALL_SIDE_MARGIN
						? 1
						: random() < 0.5
							? -1
							: 1;
			return {
				angle: side * between({ max: 110, min: 25, random }),
				pin,
				x: side * between({ max: 22, min: 6, random }),
				y: -between({ max: 22, min: 6, random }),
			};
		});
	return { ballX, falls, standing: sorted };
}

/** 1 投を決める。script が呼ぶのはこれだけ */
export function rollShot({ random }: { random: () => number }): Shot {
	return createShot({
		random,
		standing: pickStanding({ leaveRoll: random(), outcomeRoll: random() }),
	});
}

/** ボールの道のり。座標はボールの置き場の左上を原点とする px */
export interface BallPath {
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	/** ms */
	duration: number;
}

/** 出発点の横の位置（ピン座標）。ヘッドピンの右から上がってくる。ガターは曲がるとピンの上を通るので、溝をまっすぐ上がる */
const BALL_START_X = 168;
/** 見えている画面の下端から、さらにこれだけ下（px）から出る */
const BALL_START_BELOW = 40;
/** ヘッドピンの手前で止まる縦の位置と、ガターが抜けていく奥の位置（ピン座標） */
const BALL_END_Y = { gutter: -30, pocket: 128 } as const;
const ROLL_MS = { max: 1600, min: 900, perPx: 1.6 } as const;

/**
 * 押した瞬間に測った値から、ボールの道のりを決める。
 * deck はピンの箱の左上、viewportBottom は見えている画面の下端、unit はピン座標 1 の px
 */
export function planBallPath({
	deck,
	viewportBottom,
	shot,
	unit,
}: {
	deck: { x: number; y: number };
	viewportBottom: number;
	shot: Shot;
	unit: number;
}): BallPath {
	const gutter = shot.standing.length === PIN_NUMBERS.length;
	const endX = deck.x + shot.ballX * unit;
	const startX = gutter ? endX : deck.x + BALL_START_X * unit;
	const startY = viewportBottom + BALL_START_BELOW;
	const endY = deck.y + (gutter ? BALL_END_Y.gutter : BALL_END_Y.pocket) * unit;
	const duration = Math.min(
		ROLL_MS.max,
		Math.max(ROLL_MS.min, (startY - endY) * ROLL_MS.perPx),
	);
	return { duration, endX, endY, startX, startY };
}

export type Phase = "idle" | "rolling" | "result" | "clearing";

interface IdleState {
	phase: "idle";
}

interface RollingState {
	phase: "rolling";
	shot: Shot;
	path: BallPath;
}

interface ResultState {
	phase: "result";
	shot: Shot;
}

/** 前の 1 投のピンを片付けている間。次の 1 投と道のりは押した瞬間に決めて持っておく */
interface ClearingState {
	phase: "clearing";
	last: Shot;
	next: Shot;
	path: BallPath;
}

export type DeckState = IdleState | RollingState | ResultState | ClearingState;

export type DeckEvent =
	/** PLAY / AGAIN を押した */
	| { type: "roll"; shot: Shot; path: BallPath }
	/** 今の状態の時間が過ぎた */
	| { type: "elapsed" }
	/** 見られなくなった（タブが隠れた、ページを離れた） */
	| { type: "abort" };

export const INITIAL_STATE: DeckState = { phase: "idle" };

/** 受け付けないイベントでは、渡された state をそのまま（同じ参照で）返す */
export function transition({
	state,
	event,
}: {
	state: DeckState;
	event: DeckEvent;
}): DeckState {
	switch (state.phase) {
		case "idle":
			return event.type === "roll"
				? { path: event.path, phase: "rolling", shot: event.shot }
				: state;
		case "rolling":
			if (event.type === "elapsed")
				return { phase: "result", shot: state.shot };
			if (event.type === "abort") return INITIAL_STATE;
			return state;
		case "result":
			// abort でも戻さない。止まった絵なので、戻ってきたときに結果が見えているほうがよい
			return event.type === "roll"
				? {
						last: state.shot,
						next: event.shot,
						path: event.path,
						phase: "clearing",
					}
				: state;
		case "clearing":
			if (event.type === "elapsed")
				return { path: state.path, phase: "rolling", shot: state.next };
			if (event.type === "abort") return INITIAL_STATE;
			return state;
	}
}

/** 片付けの長さ（ms）。ピンが消える 220 と、並び直して出る 200 */
export const CLEARING_MS = 420;
/** 動きを減らす設定での rolling と clearing の長さ（ms）。読み上げの文を空にしてから入れるまでの間 */
const REDUCED_MS = 150;

/** 今の状態が続く長さ（ms）。待たない状態は undefined */
export function getPhaseDuration({
	state,
	reducedMotion,
}: {
	state: DeckState;
	reducedMotion: boolean;
}): number | undefined {
	switch (state.phase) {
		case "rolling":
			return reducedMotion ? REDUCED_MS : state.path.duration;
		case "clearing":
			return reducedMotion ? REDUCED_MS : CLEARING_MS;
		case "idle":
		case "result":
			return undefined;
	}
}

/** 結果の札。欄の中身はスコア表の 1 投目と同じ（ストライクの印、倒した本数、G） */
export interface ResultView {
	box: "strike" | "count" | "gutter";
	/** 倒した本数 */
	count: number;
	/** 欄の横の文字 */
	text: string;
}

export interface DeckView {
	phase: Phase;
	/** 倒れた姿で描くピン */
	falls: readonly PinFall[];
	/** result のあいだだけ */
	result: ResultView | undefined;
	/** ボタンの見える文字と、名前に足す説明 */
	button: { text: "PLAY" | "AGAIN"; hint: string };
	/** 読み上げる文。result のあいだだけ */
	speech: string;
}

const BUTTONS = {
	again: { hint: "（もう一度投げる）", text: "AGAIN" },
	play: { hint: "（ボールを投げる）", text: "PLAY" },
} as const;

function toResultView({ shot }: { shot: Shot }): ResultView {
	const count = shot.falls.length;
	if (shot.standing.length === 0)
		return { box: "strike", count, text: "STRIKE" };
	if (count === 0) return { box: "gutter", count, text: "GUTTER" };
	return { box: "count", count, text: `残り ${shot.standing.join("・")}` };
}

function toSpeech({ shot }: { shot: Shot }): string {
	if (shot.standing.length === 0) return "ストライク。10 本すべて倒れました";
	if (shot.falls.length === 0) return "ガター。1 本も倒れませんでした";
	const rest = shot.standing.map((pin) => `${pin} 番`).join("、");
	return `${shot.falls.length} 本倒れました。残りは ${rest}ピン`;
}

/** サーバーと script が同じ値で描くための、状態ごとの表示の値 */
export function toView({ state }: { state: DeckState }): DeckView {
	if (state.phase === "result") {
		return {
			button: BUTTONS.again,
			falls: state.shot.falls,
			phase: state.phase,
			result: toResultView({ shot: state.shot }),
			speech: toSpeech({ shot: state.shot }),
		};
	}
	return {
		// rolling と clearing では行ごと隠れるので、次に見えるときの文字にしておく
		button: state.phase === "idle" ? BUTTONS.play : BUTTONS.again,
		falls: [],
		phase: state.phase,
		result: undefined,
		speech: "",
	};
}
