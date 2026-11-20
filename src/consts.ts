import { TOKEN_COLORS } from "./lib/token-colors.ts";

export const SITE_TITLE = "Sendo Bowling Lab";

/** ホーム画面のアイコンの下に出す名前。長いと端末が省略する */
export const SITE_SHORT_TITLE = "Bowling Lab";

export const SITE_TAGLINE = "ボウリングの雑記";

export const SITE_AUTHOR = "Sendo";

export const SITE_LANG = "ja";

export const THEME_COLOR = TOKEN_COLORS["navy-900"];

/**
 * 日付を数える時間帯。指定しないとビルド環境の時間帯になり、
 * 日本時間の 0〜9 時の日時が前の日として出る
 */
export const SITE_TIME_ZONE = "Asia/Tokyo";

/** 記事とメモの一覧で、1 ページに出す件数 */
export const LIST_PER_PAGE = 20;

/** 記事とメモの md を置くディレクトリ。リポジトリのルートからの相対パス */
export const POST_DIR = "src/content/posts";
export const MEMO_DIR = "src/content/memos";

/** 画像と動画を配信するドメイン（R2）。設計は docs/design/media.md */
export const MEDIA_ORIGIN = "https://bowling-media.sendo.page";

/** Google タグマネージャーのコンテナ ID */
export const GTM_ID = "GTM-M6JTXKNV";

export const INSTAGRAM_URL = "https://www.instagram.com/sendo_bowling/";
