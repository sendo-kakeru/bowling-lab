import type { Meta, Story } from "../../.storybook/types";
import Button from "./Button.astro";

const meta = {
	component: Button,
	tags: ["autodocs"],
	title: "Components/Button",
} satisfies Meta;

export default meta;

const VARIANTS = ["primary", "secondary", "outline"] as const;

const LABEL = "ダミーテキスト";

/** variant ごとの行。withLink で <a> も並べる */
function variantRows({
	disabled = false,
	withLink = true,
}: {
	disabled?: boolean;
	withLink?: boolean;
}): Story["decorators"] {
	return [
		() => [
			'<div class="story-stack">',
			...VARIANTS.flatMap((variant) => [
				'<div class="story-row">',
				`<span class="story-caption">${variant}</span>`,
				{
					component: Button,
					props: { disabled, variant },
					slots: { default: LABEL },
				},
				...(withLink
					? [
							{
								component: Button,
								props: { href: "#", variant },
								slots: { default: `${LABEL}（リンク）` },
							},
						]
					: []),
				"</div>",
			]),
			"</div>",
		],
	];
}

/** <button> と <a> を並べる */
export const VariantList: Story = {
	decorators: variantRows({}),
};

/**
 * :hover を常に当てる（storybook-addon-pseudo-states）。
 * parameters に書くとアドオンがグローバルに書き込み、ほかのストーリーにも残るので globals に書く
 */
export const Hover: Story = {
	decorators: variantRows({}),
	globals: { pseudo: { hover: true } },
};

/** disabled にできるのは <button> だけ */
export const Disabled: Story = {
	decorators: variantRows({ disabled: true, withLink: false }),
};

export const Playground: Story = {
	args: {
		disabled: false,
		slots: { default: LABEL },
		type: "button",
		variant: "primary",
	},
	argTypes: {
		type: { control: "inline-radio", options: ["button", "submit", "reset"] },
		variant: { control: "inline-radio", options: VARIANTS },
	},
};

export const Link: Story = {
	args: {
		href: "#",
		slots: { default: LABEL },
		variant: "primary",
	},
};
