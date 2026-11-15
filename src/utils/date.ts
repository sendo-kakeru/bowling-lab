import { SITE_TIME_ZONE } from "../consts.ts";

// 整形のたびに作ると重いので、1 回だけ作って使い回す
const dateFormat = new Intl.DateTimeFormat("en-US", {
	day: "2-digit",
	month: "2-digit",
	timeZone: SITE_TIME_ZONE,
	year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-GB", {
	hour: "2-digit",
	hourCycle: "h23",
	minute: "2-digit",
	timeZone: SITE_TIME_ZONE,
});

/** 「2026.11.06」の形。日本時間で数える */
export function formatDotDate({ date }: { date: Date }): string {
	const parts = dateFormat.formatToParts(date);
	const part = ({ type }: { type: Intl.DateTimeFormatPartTypes }): string =>
		parts.find((p) => p.type === type)?.value ?? "";
	return `${part({ type: "year" })}.${part({ type: "month" })}.${part({ type: "day" })}`;
}

/** 「21:14」の形。24 時間制で、時と分は 2 桁。日本時間で数える */
export function formatTime({ date }: { date: Date }): string {
	return timeFormat.format(date);
}
