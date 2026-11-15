/**
 * ビルド中の Astro.url.pathname を、公開時の URL のパスに直す。
 * build.format が "file" だと、ビルド中は "/posts.html" や "/index.html" のように
 * 出力ファイルの名前が入る（開発サーバーでは "/posts" のまま）
 */
export function toPublicPath({ pathname }: { pathname: string }): string {
	const path = pathname
		.replace(/\.html$/, "")
		.replace(/\/index$/, "")
		.replace(/\/+$/, "");
	return path === "" ? "/" : path;
}
