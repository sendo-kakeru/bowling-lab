import * as v from "valibot";

/** 知らない項目は、書ける項目を添えて落とす。綴りの誤り（descripton、pined）に気づけるように */
export function strictFrontmatter<const TEntries extends v.ObjectEntries>({
	entries,
}: {
	entries: TEntries;
}): v.StrictObjectSchema<TEntries, v.ErrorMessage<v.StrictObjectIssue>> {
	const keys = Object.keys(entries).join("、");
	return v.strictObject(
		entries,
		(issue) => `知らない項目 ${issue.received}。書けるのは ${keys}`,
	);
}
