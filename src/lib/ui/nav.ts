import { INSTAGRAM_URL } from "../../consts";

export interface NavLink {
	label: string;
	url: string;
	current?: "page" | "true";
}

type NavTarget = Omit<NavLink, "current">;

/** ヘッダーとフッターに並べるサイト内のページ */
export const MAIN_NAV = [
	{ label: "Home", url: "/" },
	{ label: "Posts", url: "/posts" },
	{ label: "Memos", url: "/memos" },
	{ label: "About", url: "/about" },
] as const satisfies NavTarget[];

/** ヘッダーとフッターにアイコンで出す、サイトの外へのリンク */
export const SOCIAL_NAV = [
	{ icon: "instagram", label: "Instagram", url: INSTAGRAM_URL },
	{ icon: "rss", label: "RSS", url: "/rss.xml" },
] as const satisfies (NavTarget & { icon: string })[];

export type SocialIconName = (typeof SOCIAL_NAV)[number]["icon"];

export const LEGAL_NAV = [
	{ label: "プライバシーポリシー", url: "/privacy" },
] as const satisfies NavTarget[];

const TRAILING_SLASH = /\/$/;

function trimPath({ path }: { path: string }): string {
	return path.replace(TRAILING_SLASH, "") || "/";
}

/** 今のページなら "page"、その親の区分（記事の詳細なら Posts）なら "true" */
function navCurrent({
	url,
	pathname,
}: {
	url: string;
	pathname: string;
}): NavLink["current"] {
	const linkPath = trimPath({ path: url });
	const currentPath = trimPath({ path: pathname });
	if (linkPath === currentPath) return "page";
	if (linkPath !== "/" && currentPath.startsWith(`${linkPath}/`)) return "true";
	return undefined;
}

export function withCurrent({
	links,
	page,
}: {
	links: readonly NavTarget[];
	page: URL;
}): NavLink[] {
	return links.map((link) => ({
		...link,
		current: navCurrent({ pathname: page.pathname, url: link.url }),
	}));
}
