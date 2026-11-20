import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineMdastPlugin, type MdastPluginDefinition } from "satteri";
import {
	getMediaEntry,
	parseMediaRef,
	toImageAttributes,
	toStillImage,
	toVideoAttributes,
} from "../media/media.ts";
import type { MediaManifest } from "../media/media-manifest.ts";

function describeFile({ fileURL }: { fileURL: URL | undefined }): string {
	return fileURL
		? relative(process.cwd(), fileURLToPath(fileURL))
		: "(ファイル不明)";
}

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
		// 参照形式（![alt][id] と [id]: media:...）は image として届かず、解決されないまま出てしまうので書かせない
		definition(node, ctx) {
			if (parseMediaRef({ url: node.url }) === undefined) return;
			throw new Error(
				`${describeFile({ fileURL: ctx.fileURL })}: ${node.url} は参照形式では書けない。![](${node.url}) の形で書く`,
			);
		},
		image(node, ctx) {
			const path = parseMediaRef({ url: node.url });
			if (path === undefined) return;
			const entry = getMediaEntry({
				manifest,
				path,
				ref: `${describeFile({ fileURL: ctx.fileURL })}: ${node.url}`,
			});
			const alt = node.alt ?? "";
			const title = node.title ? { title: node.title } : {};
			ctx.replaceNode(node, {
				children: [],
				data:
					entry.type === "image"
						? {
								hName: "img",
								hProperties: {
									alt,
									...title,
									...toImageAttributes({ image: toStillImage({ entry }) }),
								},
							}
						: {
								hName: "video",
								hProperties: {
									...title,
									...toVideoAttributes({ alt, video: entry }),
								},
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
