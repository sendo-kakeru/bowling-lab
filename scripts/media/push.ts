import { mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { processImageItem } from "./image.ts";
import {
	type InboxItem,
	type ProcessedItem,
	scanInbox,
	type UploadFile,
} from "./inbox.ts";
import {
	addEntries,
	planItems,
	readManifest,
	writeManifest,
} from "./manifest.ts";
import { createR2Uploader } from "./r2.ts";
import { run } from "./run.ts";
import { ensureFfmpeg, processVideoItem } from "./video.ts";

const UPLOAD_CONCURRENCY = 4;

const ROOT = path.resolve(import.meta.dirname, "../..");
const INBOX_DIR = path.join(ROOT, "media/inbox");
const UPLOADED_DIR = path.join(ROOT, "media/uploaded");
const MANIFEST_PATH = path.join(ROOT, "src/data/media-manifest.json");

const { values: options } = parseArgs({
	options: {
		copy: { default: false, type: "boolean" },
		"dry-run": { default: false, type: "boolean" },
		force: { default: false, type: "boolean" },
	},
});
const dryRun = options["dry-run"];
const { force } = options;

const failures: { logicalPath: string; message: string }[] = [];

try {
	await main();
} catch (error) {
	// ffmpeg がない、.env が足りないなど、続けられないときはメッセージだけを出す
	console.error(errorMessage(error));
	process.exitCode = 1;
}

async function main(): Promise<void> {
	const { items, unsupported } = await scanInbox({ inboxDir: INBOX_DIR });
	for (const logicalPath of unsupported) {
		failures.push({ logicalPath, message: "扱えない種類のファイル" });
	}

	const manifest = await readManifest({ filePath: MANIFEST_PATH });
	const plan = planItems({ force, items, manifest });
	for (const { logicalPath } of plan.skip) {
		console.log(
			`スキップ: ${logicalPath}（manifest にある。上書きするには --force）`,
		);
	}

	if (plan.process.some(({ kind }) => kind === "video")) await ensureFfmpeg();
	const upload = dryRun
		? undefined
		: createR2Uploader({ envPath: path.join(ROOT, ".env") });

	const workDir = await mkdtemp(path.join(os.tmpdir(), "media-push-"));
	try {
		const processed: { item: InboxItem; result: ProcessedItem }[] = [];
		for (const item of plan.process) {
			console.log(`加工: ${item.logicalPath}`);
			try {
				const result =
					item.kind === "image"
						? await processImageItem({ item, workDir })
						: await processVideoItem({ item, workDir });
				processed.push({ item, result });
			} catch (error) {
				failures.push({
					logicalPath: item.logicalPath,
					message: errorMessage(error),
				});
			}
		}

		const succeeded =
			upload === undefined ? processed : await uploadAll({ processed, upload });

		if (dryRun) {
			for (const { result } of succeeded) printDryRun({ result });
		} else if (succeeded.length > 0) {
			await writeManifest({
				filePath: MANIFEST_PATH,
				manifest: addEntries({
					entries: succeeded.map(({ result }) => result),
					force,
					manifest,
				}),
			});
			for (const { item } of succeeded) await moveToUploaded({ item });
		}

		const snippets = succeeded.map(
			({ item }) => `![](media:${item.logicalPath})`,
		);
		if (snippets.length > 0) {
			console.log(`\n${snippets.join("\n")}`);
			if (options.copy) {
				await run({ args: [], command: "pbcopy", input: snippets.join("\n") });
				console.log("クリップボードにコピーした");
			}
		}
		if (dryRun) {
			console.log(
				`\n--dry-run: アップロード、manifest の更新、原本の移動はしていない\n加工後のファイル: ${workDir}`,
			);
		}
	} finally {
		if (!dryRun) await rm(workDir, { force: true, recursive: true });
	}

	if (failures.length > 0) {
		console.error("\n失敗（原本は inbox に残した）:");
		for (const { logicalPath, message } of failures) {
			console.error(`- ${logicalPath}: ${message}`);
		}
		process.exitCode = 1;
	}
}

/** 全項目のファイルを並列で上げ、ファイルがすべて上がった項目だけを返す */
async function uploadAll({
	processed,
	upload,
}: {
	processed: { item: InboxItem; result: ProcessedItem }[];
	upload: (file: UploadFile) => Promise<void>;
}): Promise<{ item: InboxItem; result: ProcessedItem }[]> {
	const tasks = processed.flatMap((entry) =>
		entry.result.files.map((file) => ({ entry, file })),
	);
	const errors = new Map<InboxItem, unknown>();
	let next = 0;
	const worker = async (): Promise<void> => {
		while (next < tasks.length) {
			const task = tasks[next++];
			if (task === undefined) return;
			try {
				await upload(task.file);
				console.log(`アップロード: ${task.file.key}`);
			} catch (error) {
				if (!errors.has(task.entry.item)) errors.set(task.entry.item, error);
			}
		}
	};
	await Promise.all(Array.from({ length: UPLOAD_CONCURRENCY }, worker));

	for (const [item, error] of errors) {
		failures.push({
			logicalPath: item.logicalPath,
			message: `アップロードに失敗した: ${errorMessage(error)}`,
		});
	}
	return processed.filter(({ item }) => !errors.has(item));
}

async function moveToUploaded({ item }: { item: InboxItem }): Promise<void> {
	const destination = path.join(
		UPLOADED_DIR,
		path.relative(INBOX_DIR, item.sourcePath),
	);
	await mkdir(path.dirname(destination), { recursive: true });
	await rename(item.sourcePath, destination);
}

function printDryRun({ result }: { result: ProcessedItem }): void {
	console.log(`\n${result.logicalPath}`);
	for (const file of result.files) {
		console.log(`  ${file.key}  (${file.contentType})\n    ${file.path}`);
	}
	console.log(`  manifest: ${JSON.stringify(result.entry)}`);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
