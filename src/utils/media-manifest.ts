import * as v from "valibot";
import manifestJson from "../data/media-manifest.json" with { type: "json" };

/*
  メディアの manifest（src/data/media-manifest.json）。
  md に書く論理パス（例: "2026/kyoto/cat.jpg"）を、R2 のキーと寸法に対応付ける。
  形は docs/design/media.md の「manifest の形」
*/

const DimensionSchema = v.pipe(v.number(), v.integer(), v.minValue(1));

const ImageKeySchema = v.pipe(
	v.string(),
	v.startsWith("images/", "images/ で始まるキーにする"),
);

const ImageEntrySchema = v.object({
	height: DimensionSchema,
	key: ImageKeySchema,
	type: v.literal("image"),
	width: DimensionSchema,
});

const VideoEntrySchema = v.object({
	/** 秒 */
	duration: v.pipe(v.number(), v.minValue(0)),
	height: DimensionSchema,
	key: v.pipe(
		v.string(),
		v.startsWith("videos/", "videos/ で始まるキーにする"),
	),
	/** ポスター画像のキー */
	poster: ImageKeySchema,
	type: v.literal("video"),
	width: DimensionSchema,
});

const MediaEntrySchema = v.variant("type", [
	ImageEntrySchema,
	VideoEntrySchema,
]);

const MediaManifestSchema = v.record(
	v.pipe(v.string(), v.nonEmpty()),
	MediaEntrySchema,
);

export type MediaManifest = v.InferOutput<typeof MediaManifestSchema>;

/** manifest を検証する。形が違えば、どの項目が違うかを添えて投げる */
export function parseMediaManifest({
	data,
}: {
	data: unknown;
}): MediaManifest {
	// 配列もオブジェクトとして通ってしまうので、先に弾く
	if (Array.isArray(data)) {
		throw new Error(
			"media-manifest.json の形が正しくない\n論理パスをキーにしたオブジェクトにする",
		);
	}

	const result = v.safeParse(MediaManifestSchema, data);
	if (result.success) return result.output;

	const details = result.issues
		.map((issue) => {
			const path = v.getDotPath(issue);
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("\n");
	throw new Error(`media-manifest.json の形が正しくない\n${details}`);
}

let cached: MediaManifest | undefined;

/** リポジトリにある manifest を読む。検証は最初の 1 回だけ行う */
export function getMediaManifest(): MediaManifest {
	cached ??= parseMediaManifest({ data: manifestJson });
	return cached;
}
