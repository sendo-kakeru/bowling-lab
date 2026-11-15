import * as v from "valibot";
import { formatIssues } from "./valibot.ts";

/*
  固定ページ（src/content/pages/*.md）のフロントマター。
  astro:content を読み込むと vitest で動かないので、取得関数（pages.ts）と分けている
*/

const PageSchema = v.strictObject({
	title: v.pipe(v.string(), v.nonEmpty("空にしない")),
});

export type PageData = v.InferOutput<typeof PageSchema>;

/** 固定ページのフロントマターを検証する。形が違えば、どの項目が違うかを添えて投げる */
export function parsePageData({
	id,
	data,
}: {
	id: string;
	data: unknown;
}): PageData {
	const result = v.safeParse(PageSchema, data);
	if (result.success) return result.output;

	const details = formatIssues({ issues: result.issues });
	throw new Error(
		`src/content/pages/${id}.md のフロントマターが正しくない\n${details}`,
	);
}
