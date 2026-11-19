import { describe, expect, test } from "vitest";
import { findLocationTags, isHdr, videoFilterArgs } from "./video.ts";

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

describe("isHdr", () => {
	function probeWithTransfer({
		colorTransfer,
	}: {
		colorTransfer?: string;
	}): Parameters<typeof isHdr>[0]["probe"] {
		return {
			format: { duration: 2, tags: {} },
			streams: [
				{ codec_type: "audio", tags: {} },
				{ codec_type: "video", color_transfer: colorTransfer, tags: {} },
			],
		};
	}

	test.each([
		["HLG（iPhone の既定）", "arib-std-b67"],
		["PQ", "smpte2084"],
	])("%s は HDR", (_, colorTransfer) => {
		expect(isHdr({ probe: probeWithTransfer({ colorTransfer }) })).toBe(true);
	});

	test.each([
		["BT.709", "bt709"],
		["伝達特性の指定なし", undefined],
	])("%s は HDR ではない", (_, colorTransfer) => {
		expect(isHdr({ probe: probeWithTransfer({ colorTransfer }) })).toBe(false);
	});
});

describe("videoFilterArgs", () => {
	function filterOf({ hdr }: { hdr: boolean }): string {
		const { output } = videoFilterArgs({ hdr });
		const filter = output[output.indexOf("-vf") + 1];
		if (filter === undefined) throw new Error("-vf がない");
		return filter;
	}

	test.each([false, true])(
		"HDR=%s でも長辺 1920px への縮小と 60fps の上限をかける",
		(hdr) => {
			expect(filterOf({ hdr })).toMatch(
				/^scale=.*min\(1920,iw\).*setsar=1.*min\(60,source_fps\)/,
			);
		},
	);

	test("HDR は縮小してから GPU に渡し、BT.709 のタグを付ける", () => {
		const filter = filterOf({ hdr: true });
		expect(filter.indexOf("scale=")).toBeLessThan(filter.indexOf("hwupload"));
		expect(videoFilterArgs({ hdr: true }).output).toContain("-colorspace");
		expect(videoFilterArgs({ hdr: true }).input).toContain("-init_hw_device");
	});

	test("SDR は GPU を使わない", () => {
		expect(videoFilterArgs({ hdr: false }).input).toEqual([]);
		expect(filterOf({ hdr: false })).not.toContain("hwupload");
	});
});
