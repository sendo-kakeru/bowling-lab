import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { TOKEN_COLORS } from "./token-colors.ts";

const tokensCss = readFileSync(
	new URL("../styles/tokens.css", import.meta.url),
	"utf8",
);

test.each(Object.entries(TOKEN_COLORS))(
	"--color-%s が tokens.css と同じ値",
	(name, value) => {
		const declared = tokensCss.match(
			new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`),
		)?.[1];
		expect(declared?.toLowerCase()).toBe(value);
	},
);
