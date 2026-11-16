回答は全て日本語にて行うこと

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Storybook runs with `pnpm storybook` (port 6006) and builds with `pnpm build-storybook`. Stories sit next to the component as `*.stories.ts`, and their sample data lives in `.storybook/fixtures/`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Design

Read these before working on content or media:

- [docs/design/content.md](docs/design/content.md): posts, memos, pages, commands, sample data, task breakdown
- [docs/design/media.md](docs/design/media.md): image and video processing, storage on R2, delivery

The development workflow (who does what, where rules go) is in [docs/ai-development.md](docs/ai-development.md).

## Styling

The code is the reference for the look (the design canvas is no longer maintained). `.claude/rules/css.md` holds the CSS conventions.

## Previous site

The site was first built with EmDash in `sendo-kakeru/bowling-lab_old`. Components and utilities may be ported from there (`src/components/`, `src/utils/`), but drop anything EmDash-specific: server rendering, `emdash/ui`, Portable Text, cache hints, and the seed.

## Pull requests

Write the PR body with the sections of `.github/pull_request_template.md` (in Japanese). The template is not applied automatically when a PR is created through `gh` or the API.
