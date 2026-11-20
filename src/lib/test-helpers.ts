import { MemoParseError } from "./content/parse-memo.ts";
import type { MediaManifest } from "./media/media-manifest.ts";

/* テストだけが使う見本と道具 */

export const CAT_IMAGE = {
	height: 1600,
	key: "images/2026/kyoto/cat.a1b2c3.jpg",
	type: "image",
	width: 2400,
} as const;

export const WALK_VIDEO = {
	duration: 12.4,
	height: 1080,
	key: "videos/2026/kyoto/walk.d4e5f6.mp4",
	poster: "images/2026/kyoto/walk.d4e5f6.poster.jpg",
	type: "video",
	width: 1920,
} as const;

export const MANIFEST: MediaManifest = {
	"2026/kyoto/cat.jpg": CAT_IMAGE,
	"2026/kyoto/walk.mov": WALK_VIDEO,
};

/** run が投げた MemoParseError を返す。投げなかったときと、ほかのエラーのときはテストを落とす */
export function catchMemoParseError({
	run,
}: {
	run: () => unknown;
}): MemoParseError {
	try {
		run();
	} catch (error) {
		if (error instanceof MemoParseError) return error;
		throw error;
	}
	throw new Error("MemoParseError が投げられなかった");
}

/** srcset の候補を「変換のオプション 幅の記述子」の形にする */
export function candidates({ srcset }: { srcset: string }): string[] {
	return srcset.split(", ").map((candidate) => {
		const [, options] = /\/cdn-cgi\/image\/([^/]+),format=auto\//.exec(
			candidate,
		) ?? [undefined, ""];
		return `${options} ${candidate.split(" ").at(-1)}`;
	});
}
