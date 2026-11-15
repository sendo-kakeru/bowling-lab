import { readFile } from "node:fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as v from "valibot";
import type { UploadFile } from "./inbox.ts";

const EnvSchema = v.object({
	R2_ACCESS_KEY_ID: v.pipe(v.string(), v.nonEmpty()),
	R2_ACCOUNT_ID: v.pipe(v.string(), v.nonEmpty()),
	R2_BUCKET: v.pipe(v.string(), v.nonEmpty()),
	R2_SECRET_ACCESS_KEY: v.pipe(v.string(), v.nonEmpty()),
});

/** .env の接続情報で R2 に上げる関数を作る */
export function createR2Uploader({
	envPath,
}: {
	envPath: string;
}): (file: UploadFile) => Promise<void> {
	try {
		process.loadEnvFile(envPath);
	} catch (error) {
		// .env がなくても、環境変数で渡されていれば動かせる
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT"))
			throw error;
	}
	const result = v.safeParse(EnvSchema, process.env);
	if (!result.success) {
		const names = result.issues.map((issue) => v.getDotPath(issue)).join(", ");
		throw new Error(
			`R2 の接続情報が足りない: ${names}\n.env.example を見て .env に書く`,
		);
	}
	const env = result.output;
	const client = new S3Client({
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		},
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		region: "auto",
	});

	return async ({ contentType, key, path }) => {
		await client.send(
			new PutObjectCommand({
				Body: await readFile(path),
				Bucket: env.R2_BUCKET,
				CacheControl: "public, max-age=31536000, immutable",
				ContentType: contentType,
				Key: key,
			}),
		);
	};
}
