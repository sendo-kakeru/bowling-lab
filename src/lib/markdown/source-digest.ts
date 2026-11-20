import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const RELATIVE_IMPORT_REGEX = /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g;

/** 拡張子のない相対 import（`./media`）は .ts として読む */
function resolveImport({
	specifier,
	from,
}: {
	specifier: string;
	from: URL;
}): URL {
	return new URL(
		/\.\w+$/.test(specifier) ? specifier : `${specifier}.ts`,
		from,
	);
}

/**
 * ファイルと、そこから相対 import でたどれるファイルの中身のハッシュ（16 桁）。
 * パッケージの import はたどらない
 */
export function sourceDigest({ entry }: { entry: URL }): string {
	const hash = createHash("sha256");
	const seen = new Set<string>();
	const visit = ({ file }: { file: URL }): void => {
		if (seen.has(file.href)) return;
		seen.add(file.href);
		const text = readFileSync(file, "utf8");
		hash.update(text).update("\0");
		for (const [, specifier] of text.matchAll(RELATIVE_IMPORT_REGEX)) {
			if (specifier !== undefined) {
				visit({ file: resolveImport({ from: file, specifier }) });
			}
		}
	};
	visit({ file: entry });
	return hash.digest("hex").slice(0, 16);
}
