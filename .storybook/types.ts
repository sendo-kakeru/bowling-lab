import type { AstroRenderer } from "@storybook-astro/framework";
import type {
	ComponentAnnotations,
	StoryAnnotations,
} from "storybook/internal/types";

export type Meta = ComponentAnnotations<AstroRenderer>;

export type Story = StoryAnnotations<AstroRenderer>;
