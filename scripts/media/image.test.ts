import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { processImage } from "./image.ts";

let dir: string;

beforeAll(async () => {
	dir = await mkdtemp(path.join(os.tmpdir(), "image-test-"));
});

afterAll(async () => {
	await rm(dir, { force: true, recursive: true });
});

function blank({ height, width }: { height: number; width: number }) {
	return sharp({
		create: { background: "#808080", channels: 3, height, width },
	});
}

describe("processImage", () => {
	test("位置情報つきの写真から EXIF を取り除く", async () => {
		const inputPath = path.join(dir, "gps.jpg");
		await blank({ height: 200, width: 300 })
			.withExif({
				IFD0: { Make: "Apple" },
				IFD3: {
					GPSLatitude: "35/1 0/1 4176/100",
					GPSLatitudeRef: "N",
					GPSLongitude: "135/1 46/1 520/100",
					GPSLongitudeRef: "E",
				},
			})
			.jpeg()
			.toFile(inputPath);
		const fixture = await sharp(inputPath).metadata();
		// GPS IFD を指すタグ 0x8825（リトルエンディアン）。テスト用の画像に位置情報が入っていることを先に確かめる
		expect(fixture.exif?.includes(Buffer.from([0x25, 0x88]))).toBe(true);

		const { data } = await processImage({ format: "jpeg", inputPath });

		const output = await sharp(data).metadata();
		expect(output.format).toBe("jpeg");
		expect(output.exif).toBeUndefined();
	});

	test("EXIF の向きを画素に反映する", async () => {
		const inputPath = path.join(dir, "rotated.jpg");
		await blank({ height: 200, width: 300 })
			.withMetadata({ orientation: 6 })
			.jpeg()
			.toFile(inputPath);
		expect((await sharp(inputPath).metadata()).orientation).toBe(6);

		const { data, height, width } = await processImage({
			format: "jpeg",
			inputPath,
		});

		expect({ height, width }).toEqual({ height: 300, width: 200 });
		const output = await sharp(data).metadata();
		expect({ height: output.height, width: output.width }).toEqual({
			height: 300,
			width: 200,
		});
		expect(output.orientation).toBeUndefined();
	});

	test("長辺を 2400px に収め、小さいものは拡大しない", async () => {
		const large = path.join(dir, "large.png");
		await blank({ height: 3000, width: 4000 }).png().toFile(large);
		const small = path.join(dir, "small.png");
		await blank({ height: 100, width: 120 }).png().toFile(small);

		const resized = await processImage({ format: "png", inputPath: large });
		const kept = await processImage({ format: "png", inputPath: small });

		expect({ height: resized.height, width: resized.width }).toEqual({
			height: 1800,
			width: 2400,
		});
		expect((await sharp(resized.data).metadata()).format).toBe("png");
		expect({ height: kept.height, width: kept.width }).toEqual({
			height: 100,
			width: 120,
		});
	});
});
