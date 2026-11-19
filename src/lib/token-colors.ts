/**
 * CSS の外（SVG や PNG の画像）で使うトークンの色。CSS の変数は読めないので値を書き写す。
 * キーは tokens.css の `--color-<キー>` で、値が同じことを token-colors.test.ts で確かめる
 */
export const TOKEN_COLORS = {
	"ink-600": "#6b5440",
	"navy-900": "#142038",
	"wood-100": "#efe4d0",
} as const;
