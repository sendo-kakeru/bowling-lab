export const SITE_TITLE = "Sendo Bowling Lab";

export const SITE_TAGLINE =
	"sendo-kakeru のボウリングブログ。フォーム、ボール、レーンの読み方、スペアの取り方を、自分で試しながらまとめています。";

export const SITE_LANG = "ja";

/**
 * 日付を数える時間帯。指定しないとビルド環境の時間帯になり、
 * 日本時間の 0〜9 時の日時が前の日として出る
 */
export const SITE_TIME_ZONE = "Asia/Tokyo";

/** 画像と動画を配信するドメイン（R2）。設計は docs/design/media.md */
export const MEDIA_ORIGIN = "https://bowling-media.sendo.page";

interface NavItem {
	label: string;
	href: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
	{ href: "/posts", label: "POSTS" },
	{ href: "/memos", label: "MEMO" },
	{ href: "/about", label: "ABOUT" },
];

export const FOOTER_NAV_ITEMS: readonly NavItem[] = [
	{ href: "/privacy", label: "プライバシーポリシー" },
];

export const SOCIAL_LINKS: readonly NavItem[] = [
	{ href: "https://www.instagram.com/sendo_bowling/", label: "Instagram" },
];
