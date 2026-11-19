import type { MediaManifest } from "./media-manifest.ts";

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
