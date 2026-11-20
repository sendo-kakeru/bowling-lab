import { defineMdastPlugin } from "satteri";

/**
 * 段落の中の改行を、そのまま <br> にする（行末に空白 2 つを書かなくても改行が見た目に残る）。
 * 改行は text ノードの値に "\n" として残るので、そこで分けて break ノードを挟む。
 * コードは text ノードにならないので変わらない
 */
export const lineBreakPlugin = defineMdastPlugin({
	name: "line-break",
	text(node, ctx) {
		if (!node.value.includes("\n")) return;
		ctx.replaceNode(
			node,
			node.value
				.split("\n")
				.flatMap((value, index) => [
					...(index === 0 ? [] : [{ type: "break" as const }]),
					...(value === "" ? [] : [{ type: "text" as const, value }]),
				]),
		);
	},
});
