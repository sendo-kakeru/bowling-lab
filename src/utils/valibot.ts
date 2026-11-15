import * as v from "valibot";

/** 検証の失敗を「項目のパス: 理由」の行にまとめる */
export function formatIssues({
	issues,
}: {
	issues: readonly v.BaseIssue<unknown>[];
}): string {
	return issues
		.map((issue) => {
			const path = v.getDotPath(issue);
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("\n");
}
