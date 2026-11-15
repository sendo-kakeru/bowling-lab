import { describe, expect, test } from "vitest";
import { findLocationTags } from "./video.ts";

function probeWith({
	formatTags,
	streamTags,
}: {
	formatTags: Record<string, string>;
	streamTags: Record<string, string>[];
}): Parameters<typeof findLocationTags>[0]["probe"] {
	return {
		format: { duration: 2, tags: formatTags },
		streams: streamTags.map((tags) => ({
			codec_type: "video",
			height: 720,
			tags,
			width: 1280,
		})),
	};
}

describe("findLocationTags", () => {
	test("iPhone の動画の位置情報を見つける", () => {
		const probe = probeWith({
			formatTags: {
				"com.apple.quicktime.location.ISO6709": "+35.0116+135.7681+010.000/",
				"com.apple.quicktime.make": "Apple",
			},
			streamTags: [{ handler_name: "Core Media Video" }],
		});

		expect(findLocationTags({ probe })).toEqual([
			"com.apple.quicktime.location.ISO6709",
		]);
	});

	test("ストリームのタグにある location も見つける", () => {
		const probe = probeWith({
			formatTags: { encoder: "Lavf61.7.100" },
			streamTags: [{ language: "und" }, { location: "+35.0116+135.7681/" }],
		});

		expect(findLocationTags({ probe })).toEqual(["location"]);
	});

	test("位置情報がなければ空", () => {
		const probe = probeWith({
			formatTags: { encoder: "Lavf61.7.100", major_brand: "isom" },
			streamTags: [{ handler_name: "VideoHandler", language: "und" }],
		});

		expect(findLocationTags({ probe })).toEqual([]);
	});
});
