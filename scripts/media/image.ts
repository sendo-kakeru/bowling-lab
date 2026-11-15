import { createHash } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
	buildKey,
	type ImageFormat,
	type ImageItem,
	type ProcessedItem,
	shortHash,
	writeOutput,
} from "./inbox.ts";
import { run } from "./run.ts";

export const IMAGE_OUTPUT: Record<
	ImageFormat,
	{ contentType: string; extension: string }
> = {
	jpeg: { contentType: "image/jpeg", extension: "jpg" },
	png: { contentType: "image/png", extension: "png" },
};

interface ProcessedImage {
	data: Buffer;
	height: number;
	width: number;
}

/** 向きを画素に反映し、長辺 2400px に収める。sharp は既定でメタデータ（EXIF / GPS）を出力しない */
export async function processImage({
	format,
	inputPath,
}: {
	format: ImageFormat;
	inputPath: string;
}): Promise<ProcessedImage> {
	const pipeline = sharp(inputPath).rotate().resize({
		fit: "inside",
		height: 2400,
		width: 2400,
		withoutEnlargement: true,
	});
	const encoded =
		format === "jpeg" ? pipeline.jpeg({ quality: 90 }) : pipeline.png();
	const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
	return { data, height: info.height, width: info.width };
}

export async function processImageItem({
	item,
	workDir,
}: {
	item: ImageItem;
	workDir: string;
}): Promise<ProcessedItem> {
	const inputPath = item.convertHeic
		? await convertHeic({ inputPath: item.sourcePath, workDir })
		: item.sourcePath;
	const { data, height, width } = await processImage({
		format: item.format,
		inputPath,
	});
	const { contentType, extension } = IMAGE_OUTPUT[item.format];
	const key = buildKey({
		extension,
		hash: shortHash({ hash: createHash("sha256").update(data) }),
		logicalPath: item.logicalPath,
		prefix: "images",
	});
	return {
		entry: { height, key, type: "image", width },
		files: [
			{ contentType, key, path: await writeOutput({ data, key, workDir }) },
		],
		logicalPath: item.logicalPath,
	};
}

async function convertHeic({
	inputPath,
	workDir,
}: {
	inputPath: string;
	workDir: string;
}): Promise<string> {
	const outputPath = path.join(
		await mkdtemp(path.join(workDir, "heic-")),
		"converted.tiff",
	);
	// 可逆の TIFF を挟み、非可逆の圧縮を sharp の 1 回だけにする
	await run({
		args: ["-s", "format", "tiff", inputPath, "--out", outputPath],
		command: "sips",
	});
	return outputPath;
}
