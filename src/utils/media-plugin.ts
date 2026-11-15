import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineMdastPlugin, type MdastPluginDefinition } from "satteri";
import {
	parseMediaRef,
	toImageAttributes,
	toStillImage,
	toVideoAttributes,
} from "./media.ts";
import type { MediaManifest } from "./media-manifest.ts";

/**
 * Markdown の `![alt](media:...)` を、manifest を引いて `<img>` / `<video>` にする。
 * Astro の画像の収集より先に動くので、`media:` を外部画像として扱わせずに済む。
 * manifest にない参照は、ファイルと参照を添えて投げる
 */
export function createMediaPlugin({
	manifest,
}: {
	manifest: MediaManifest;
}): MdastPluginDefinition {
	return defineMdastPlugin({
		image(node, ctx) {
			const path = parseMediaRef({ url: node.url });
			if (path === undefined) return;
			const entry = manifest[path];
			if (!entry) {
				const file = ctx.fileURL
					? relative(process.cwd(), fileURLToPath(ctx.fileURL))
					: "(ファイル不明)";
				throw new Error(`${file}: ${node.url} が media-manifest.json にない`);
			}
			const alt = node.alt ?? "";
			ctx.replaceNode(node, {
				children: [],
				data:
					entry.type === "image"
						? {
								hName: "img",
								hProperties: {
									alt,
									...toImageAttributes({ image: toStillImage({ entry }) }),
								},
							}
						: {
								hName: "video",
								hProperties: toVideoAttributes({ alt, video: entry }),
							},
				type: "mediaImage",
			});
		},
		// Astro は設定を文字列にした値が前回と違うときだけ、描画済みの記事のキャッシュを捨てる。
		// manifest を設定に載せて、manifest を変えたら記事を描画し直させる。satteri は知らないキーを読まない
		manifest,
		name: "media",
	});
}
