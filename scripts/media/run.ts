import { spawn } from "node:child_process";

interface RunResult {
	stdout: string;
}

/** コマンドを実行し、出力を集めて返す。終了コードが 0 でなければ stderr を添えて投げる */
export function run({
	args,
	command,
	input,
}: {
	args: string[];
	command: string;
	input?: string;
}): Promise<RunResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: "pipe" });
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve({ stdout });
				return;
			}
			reject(
				new Error(
					`${command} が終了コード ${code} で失敗した\n${stderr.trim()}`,
				),
			);
		});
		child.stdin.end(input);
	});
}
