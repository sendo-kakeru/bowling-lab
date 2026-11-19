import type { Element, ElementContent } from "hast";
import { defineHastPlugin } from "satteri";

/*
  URL だけの段落を、YouTube と Instagram の埋め込みに置き換える。
  記事もメモも Markdown の変換は astro.config.mjs の設定を通るので、ここに置けば両方に効く
*/

type Embed =
	| {
			provider: "youtube";
			id: string;
			format: "video" | "shorts";
			/** 開始位置（秒） */
			start?: number;
	  }
	| { provider: "instagram"; id: string; format: "p" | "reel" };

const YOUTUBE_ID = /^[\w-]{11}$/;
const INSTAGRAM_ID = /^[\w-]+$/;
// t=90、t=90s、t=1m30s、t=1h2m3s
const YOUTUBE_START = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/;

function parseYouTubeStart({
	value,
}: {
	value: string | null;
}): number | undefined {
	const match = value ? YOUTUBE_START.exec(value) : null;
	if (!match) return undefined;
	const [, hours = "0", minutes = "0", seconds = "0"] = match;
	const start = Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
	return start > 0 ? start : undefined;
}

function parseYouTube({ url }: { url: URL }): Embed | undefined {
	const segments = url.pathname.split("/").filter(Boolean);
	let id: string | undefined;
	let format: "video" | "shorts" = "video";
	if (url.hostname === "youtu.be") {
		id = segments.length === 1 ? segments[0] : undefined;
	} else if (segments.length === 1 && segments[0] === "watch") {
		id = url.searchParams.get("v") ?? undefined;
	} else if (segments.length === 2 && segments[0] === "shorts") {
		id = segments[1];
		format = "shorts";
	}
	if (!id || !YOUTUBE_ID.test(id)) return undefined;
	const start = parseYouTubeStart({ value: url.searchParams.get("t") });
	return {
		format,
		id,
		provider: "youtube",
		...(start === undefined ? {} : { start }),
	};
}

function parseInstagram({ url }: { url: URL }): Embed | undefined {
	const segments = url.pathname.split("/").filter(Boolean);
	// ブラウザのアドレス欄では、前にユーザー名が付く（/instagram/reel/<id>/）
	const [format, id, ...rest] =
		segments.length === 3 ? segments.slice(1) : segments;
	if (rest.length > 0 || !id || !INSTAGRAM_ID.test(id)) return undefined;
	if (format !== "p" && format !== "reel") return undefined;
	return { format, id, provider: "instagram" };
}

const PARSERS = new Map<string, (input: { url: URL }) => Embed | undefined>([
	["instagram.com", parseInstagram],
	["m.youtube.com", parseYouTube],
	["www.instagram.com", parseInstagram],
	["www.youtube.com", parseYouTube],
	["youtu.be", parseYouTube],
	["youtube.com", parseYouTube],
]);

/** 埋め込みにできる URL なら、その中身を返す。対象外なら undefined */
export function parseEmbed({ href }: { href: string }): Embed | undefined {
	const url = URL.parse(href);
	if (!url || (url.protocol !== "https:" && url.protocol !== "http:")) {
		return undefined;
	}
	return PARSERS.get(url.hostname)?.({ url });
}

function toIframe({ embed }: { embed: Embed }): Element {
	if (embed.provider === "youtube") {
		const query = embed.start === undefined ? "" : `?start=${embed.start}`;
		return {
			children: [],
			properties: {
				allow:
					"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
				allowFullScreen: true,
				loading: "lazy",
				// YouTube は参照元のオリジンがないと再生を断る
				referrerPolicy: "strict-origin-when-cross-origin",
				src: `https://www.youtube-nocookie.com/embed/${embed.id}${query}`,
				title: "YouTube の動画",
			},
			tagName: "iframe",
			type: "element",
		};
	}
	return {
		children: [],
		properties: {
			allow: "encrypted-media",
			loading: "lazy",
			src: `https://www.instagram.com/${embed.format}/${embed.id}/embed/`,
			title: "Instagram の投稿",
		},
		tagName: "iframe",
		type: "element",
	};
}

/** 比率を保つ枠で iframe を囲む */
function toEmbedElement({ embed }: { embed: Embed }): Element {
	const frame =
		embed.provider === "instagram"
			? "embed-instagram"
			: embed.format === "shorts"
				? "embed-portrait"
				: "embed-landscape";
	return {
		children: [toIframe({ embed })],
		properties: { className: ["embed", frame] },
		tagName: "div",
		type: "element",
	};
}

/** 段落の中身が URL のリンク 1 つだけ（URL をそのまま書いた行）なら、その URL を返す */
function readBareUrl({
	children,
}: {
	children: readonly ElementContent[];
}): string | undefined {
	if (children.length !== 1) return undefined;
	const [link] = children;
	if (link?.type !== "element" || link.tagName !== "a") return undefined;
	const href = link.properties.href;
	if (typeof href !== "string") return undefined;
	const [text] = link.children;
	if (link.children.length !== 1 || text?.type !== "text") return undefined;
	// href は日本語などがパーセントエンコードされるので、文字列のままでは比べられない
	const textUrl = URL.parse(text.value);
	return textUrl && textUrl.href === URL.parse(href)?.href ? href : undefined;
}

export const embedPlugin = defineHastPlugin({
	element: {
		filter: ["p"],
		visit(node, ctx) {
			// 引用やリストの中の URL はリンクのまま残す
			if (ctx.parent(node)?.type !== "root") return;
			const href = readBareUrl({ children: node.children });
			const embed = href === undefined ? undefined : parseEmbed({ href });
			if (embed) ctx.replaceNode(node, toEmbedElement({ embed }));
		},
	},
	name: "embed",
});
