import { describe, expect, test } from "vitest";
import { formatDotDate, formatTime } from "./date.ts";

describe("formatDotDate", () => {
	test("年.月.日 の形で、月と日は 2 桁にする", () => {
		expect(formatDotDate({ date: new Date("2026-01-05T03:00:00Z") })).toBe(
			"2026.01.05",
		);
	});

	test("日本時間で数える（UTC では前の日でも、日本時間の日付になる）", () => {
		expect(formatDotDate({ date: new Date("2026-11-05T15:30:00Z") })).toBe(
			"2026.11.06",
		);
	});

	test("年をまたぐ", () => {
		expect(formatDotDate({ date: new Date("2026-12-31T15:00:00Z") })).toBe(
			"2027.01.01",
		);
	});
});

describe("formatTime", () => {
	test("24 時間制の 時:分 にする", () => {
		expect(formatTime({ date: new Date("2026-11-06T12:14:00Z") })).toBe(
			"21:14",
		);
	});

	test("時と分は 2 桁にする", () => {
		expect(formatTime({ date: new Date("2026-11-06T00:05:00Z") })).toBe(
			"09:05",
		);
	});

	test("日本時間の 0 時台は 00 にする（24 にしない）", () => {
		expect(formatTime({ date: new Date("2026-11-05T15:30:00Z") })).toBe(
			"00:30",
		);
	});
});
