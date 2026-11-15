import { randomInt } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_DIR, planNewPost } from "./post-plan.ts";

const ROOT = path.resolve(import.meta.dirname, "../..");

try {
	const existingSlugs = (await readdir(path.join(ROOT, POST_DIR)))
		.filter((file) => file.endsWith(".md"))
		.map((file) => path.basename(file, ".md"));
	const { slug, source } = planNewPost({
		date: new Date(),
		existingSlugs,
		randomInt,
	});
	const target = `${POST_DIR}/${slug}.md`;
	await writeFile(path.join(ROOT, target), source, { flag: "wx" });
	console.log(target);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
