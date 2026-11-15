import type { AstroRenderer } from "@storybook-astro/framework";
import type { ProjectAnnotations } from "storybook/internal/types";
// レイヤーの順番を決めるので最初に読み込む
import "../src/styles/layers.css";
import "../src/styles/tokens.css";
import "../src/styles/base.css";
import "../src/styles/text.css";
import "../src/styles/utilities.css";
import "../src/styles/prose.css";
import "./preview.css";

// 確かめる画面幅（最小、ブレークポイント 3 つ、全体幅の最大）。キーの番号は、メニューを狭い順に並べるため
const viewports = {
	"1-min": { name: "最小 375", styles: { height: "812px", width: "375px" } },
	"2-md": { name: "md 768", styles: { height: "1024px", width: "768px" } },
	"3-lg": { name: "lg 1024", styles: { height: "768px", width: "1024px" } },
	"4-xl": { name: "xl 1280", styles: { height: "800px", width: "1280px" } },
	"5-max": {
		name: "最大 1360",
		styles: { height: "900px", width: "1360px" },
	},
};

const preview: ProjectAnnotations<AstroRenderer> = {
	// layout: "fullscreen" のストーリー（ヘッダー、フッター、ページの枠に入れるもの）は台紙に載せない
	decorators: [
		(Story, { parameters }) =>
			parameters.layout === "fullscreen"
				? Story()
				: `<div class="story-surface">${Story()}</div>`,
	],
	parameters: {
		viewport: { options: viewports },
	},
};

export default preview;
