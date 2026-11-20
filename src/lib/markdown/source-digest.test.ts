import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import { sourceDigest } from "./source-digest.ts";

const dirs: string[] = [];

afterEach(() => {
	for (const dir of dirs.splice(0)) {
		rmSync(dir, { force: true, recursive: true });
	}
});

function writeSources({ files }: { files: Record<string, string> }): URL {
	const dir = mkdtempSync(join(tmpdir(), "source-digest-"));
	dirs.push(dir);
	for (const [name, text] of Object.entries(files)) {
		writeFileSync(join(dir, name), text);
	}
	return pathToFileURL(join(dir, "plugin.ts"));
}

const PLUGIN = 'import { a } from "./a.ts";\nimport { b } from "./b";\n';

describe("sourceDigest", () => {
	test("相対 import でたどれるファイルが変わると変わる", () => {
		const before = sourceDigest({
			entry: writeSources({
				files: { "a.ts": "a = 1", "b.ts": "b = 1", "plugin.ts": PLUGIN },
			}),
		});
		const after = sourceDigest({
			entry: writeSources({
				files: { "a.ts": "a = 1", "b.ts": "b = 2", "plugin.ts": PLUGIN },
			}),
		});

		expect(after).not.toBe(before);
	});

	test("中身が同じなら、置き場所によらず同じ", () => {
		const files = { "a.ts": "a = 1", "b.ts": "b = 1", "plugin.ts": PLUGIN };

		expect(sourceDigest({ entry: writeSources({ files }) })).toBe(
			sourceDigest({ entry: writeSources({ files }) }),
		);
	});
});
