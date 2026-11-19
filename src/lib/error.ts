export function errorMessage({ error }: { error: unknown }): string {
	return error instanceof Error ? error.message : String(error);
}

/** ファイルやコマンドが見つからないときに Node が投げるエラーか */
export function isEnoentError({ error }: { error: unknown }): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}
