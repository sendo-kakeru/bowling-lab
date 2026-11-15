import * as v from "valibot";

/*
  固定ページ（src/content/pages/*.md）のフロントマター。
  astro:content を読み込むと vitest で動かないので、取得関数（pages.ts）と分けている
*/

const TextSchema = v.pipe(v.string(), v.nonEmpty("空にしない"));

const AboutSchema = v.object({
	bowler: v.object({
		ball: TextSchema,
		hand: v.picklist(["右投げ", "左投げ"]),
		homeCenter: TextSchema,
		name: TextSchema,
		style: v.picklist(["1ハンド", "2ハンド"]),
	}),
	title: TextSchema,
});

const PrivacySchema = v.object({
	title: TextSchema,
});

const PAGE_SCHEMAS = {
	about: AboutSchema,
	privacy: PrivacySchema,
};

export type PageId = keyof typeof PAGE_SCHEMAS;

export type PageData<Id extends PageId> = v.InferOutput<
	(typeof PAGE_SCHEMAS)[Id]
>;

/** 固定ページのフロントマターを検証する。形が違えば、どの項目が違うかを添えて投げる */
export function parsePageData<Id extends PageId>({
	id,
	data,
}: {
	id: Id;
	data: unknown;
}): PageData<Id> {
	const result = v.safeParse(PAGE_SCHEMAS[id], data);
	if (result.success) return result.output;

	const details = result.issues
		.map((issue) => {
			const path = v.getDotPath(issue);
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("\n");
	throw new Error(
		`src/content/pages/${id}.md のフロントマターが正しくない\n${details}`,
	);
}
