import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rename } from "node:fs/promises";
import path from "node:path";
import * as v from "valibot";
import { IMAGE_OUTPUT, processImage } from "./image.ts";
import {
	buildKey,
	type ProcessedItem,
	shortHash,
	type VideoItem,
	writeOutput,
} from "./inbox.ts";
import { run } from "./run.ts";

const TagsSchema = v.optional(v.record(v.string(), v.string()), {});

const ProbeSchema = v.object({
	format: v.object({
		duration: v.pipe(v.string(), v.transform(Number), v.number()),
		tags: TagsSchema,
	}),
	streams: v.array(
		v.object({
			codec_type: v.string(),
			height: v.optional(v.number()),
			tags: TagsSchema,
			width: v.optional(v.number()),
		}),
	),
});

type Probe = v.InferOutput<typeof ProbeSchema>;

const LOCATION_TAG = /location|gps|iso6709/i;

/** ffprobe の結果から、位置情報らしいタグの名前を集める */
export function findLocationTags({ probe }: { probe: Probe }): string[] {
	return [probe.format, ...probe.streams]
		.flatMap(({ tags }) => Object.keys(tags))
		.filter((key) => LOCATION_TAG.test(key));
}

/** ffmpeg と ffprobe がなければ、入れ方を示して止める */
export async function ensureFfmpeg(): Promise<void> {
	for (const command of ["ffmpeg", "ffprobe"]) {
		try {
			await run({ args: ["-version"], command });
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "ENOENT"
			) {
				throw new Error(
					`${command} が見つからない。動画の加工に必要なので入れる\n  brew install ffmpeg`,
				);
			}
			throw error;
		}
	}
}

export async function processVideoItem({
	item,
	workDir,
}: {
	item: VideoItem;
	workDir: string;
}): Promise<ProcessedItem> {
	const scratch = await mkdtemp(path.join(workDir, "video-"));
	const mp4Path = path.join(scratch, "video.mp4");
	await run({
		args: [
			"-y",
			"-i",
			item.sourcePath,
			// iPhone の MOV は位置情報をデータのトラックにも持つので、映像と音声だけを選ぶ
			"-map",
			"0:v:0",
			"-map",
			"0:a:0?",
			"-c:v",
			"libx264",
			"-crf",
			"23",
			"-preset",
			"medium",
			"-pix_fmt",
			"yuv420p",
			"-c:a",
			"aac",
			"-b:a",
			"128k",
			"-movflags",
			"+faststart",
			"-map_metadata",
			"-1",
			"-map_chapters",
			"-1",
			mp4Path,
		],
		command: "ffmpeg",
	});

	const probe = await probeVideo({ inputPath: mp4Path });
	const locationTags = findLocationTags({ probe });
	if (locationTags.length > 0) {
		throw new Error(
			`書き出した MP4 に位置情報が残っている: ${locationTags.join(", ")}`,
		);
	}
	const videoStream = probe.streams.find(
		(stream) => stream.codec_type === "video",
	);
	if (videoStream?.width === undefined || videoStream.height === undefined) {
		throw new Error("書き出した MP4 から映像の幅と高さを取れない");
	}

	const hash = await hashFile({ filePath: mp4Path });
	const key = buildKey({
		extension: "mp4",
		hash,
		logicalPath: item.logicalPath,
		prefix: "videos",
	});
	const videoPath = path.join(workDir, key);
	await mkdir(path.dirname(videoPath), { recursive: true });
	await rename(mp4Path, videoPath);

	const framePath = path.join(scratch, "poster.png");
	await run({
		args: ["-y", "-i", videoPath, "-frames:v", "1", framePath],
		command: "ffmpeg",
	});
	const poster = await processImage({ format: "jpeg", inputPath: framePath });
	const { contentType, extension } = IMAGE_OUTPUT.jpeg;
	const posterKey = buildKey({
		extension,
		hash,
		logicalPath: item.logicalPath,
		prefix: "images",
		suffix: "poster",
	});

	return {
		entry: {
			duration: Math.round(probe.format.duration * 10) / 10,
			height: videoStream.height,
			key,
			poster: posterKey,
			type: "video",
			width: videoStream.width,
		},
		files: [
			{ contentType: "video/mp4", key, path: videoPath },
			{
				contentType,
				key: posterKey,
				path: await writeOutput({
					data: poster.data,
					key: posterKey,
					workDir,
				}),
			},
		],
		logicalPath: item.logicalPath,
	};
}

async function probeVideo({
	inputPath,
}: {
	inputPath: string;
}): Promise<Probe> {
	const { stdout } = await run({
		args: [
			"-v",
			"error",
			"-show_format",
			"-show_streams",
			"-of",
			"json",
			inputPath,
		],
		command: "ffprobe",
	});
	return v.parse(ProbeSchema, JSON.parse(stdout));
}

async function hashFile({ filePath }: { filePath: string }): Promise<string> {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(filePath)) hash.update(chunk);
	return shortHash({ hash });
}
