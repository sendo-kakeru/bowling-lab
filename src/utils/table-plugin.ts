import { defineHastPlugin } from "satteri";

const SCROLL_CLASS = "table-scroll";

/**
 * 表を横スクロールの枠（div.table-scroll）で囲む。
 * table 自体をスクロールさせると幅いっぱいに広げられないので、広げる役（table）とスクロールする役（枠）を分ける
 */
export const tablePlugin = defineHastPlugin({
	element: {
		filter: ["table"],
		visit(node, ctx) {
			// 囲んだ後の表をもう一度訪れても、二重に囲まない
			const parent = ctx.parent(node);
			const parentClass =
				parent?.type === "element" ? parent.properties.className : undefined;
			if (Array.isArray(parentClass) && parentClass.includes(SCROLL_CLASS)) {
				return;
			}
			ctx.replaceNode(node, {
				children: [node],
				properties: { className: [SCROLL_CLASS] },
				tagName: "div",
				type: "element",
			});
		},
	},
	name: "table-scroll",
});
