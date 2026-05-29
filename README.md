# KinkList

KinkList is a privacy-first static Next.js app for building, filling, and sharing customizable kink checklists. It is designed to work on GitHub Pages, so the site can be hosted as a simple static export without a backend.

## Live demo

Try KinkList here: [https://hypeoman.github.io/KinkList/](https://hypeoman.github.io/KinkList/)

## Preview

Screenshot placeholder:

![KinkList screenshot](./public/screenshot.png)

GIF/demo placeholder:

![KinkList demo GIF](./public/demo.gif)

## What the site does

- Builds the checklist from plain text configuration.
- Supports localized default configs and localized UI.
- Lets people rate each item with color-coded response options.
- Stores the current state in the URL for easy sharing.
- Exports results as PNG and TXT.
- Supports light and dark themes.
- Allows editing sections, columns, items, and response options directly from the UI.

## Key features

### Text-driven configuration

The checklist is generated from a text format like this:

```text
# Section title
(Column 1, Column 2)
* Item title ::: Optional hint
```

You can also define custom response options:

```text
!options: not-entered|not entered|#ffffff; favorite|favorite|#f6abc8
```

Column rules:

- If no column line is provided, the app creates one empty column.
- `()` also creates one empty column.
- `(One column)` creates one named column.
- `(A, B)` creates two columns.
- Empty positions such as `(A,)` are preserved.

### Localization

The UI is localized through JSON files in [`locales/`](./locales). Each locale currently contains:

- UI strings
- localized help text
- a localized default checklist config

Current locales:

- Russian
- English

If a selected locale does not provide a default config, the app falls back to the English default config.

### Sharing and export

- The page URL updates as answers and settings change.
- PNG export asks for a custom filename and exports a clean summary card.
- TXT export creates a readable text summary of the filled checklist.

## Tech stack

- Next.js 15
- React 19
- TypeScript
- static export for GitHub Pages

## Local development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the static site:

```bash
npm run build
```

The production-ready static output is generated in `out/`.

## GitHub Pages deployment

This repository includes a GitHub Actions workflow for GitHub Pages deployment:

- workflow file: [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml)
- output mode: static export

Once GitHub Pages is enabled for the repository, pushes to `main` can publish the site automatically.

## Project structure

- [`app/`](./app) - app routes, page UI, and styles
- [`lib/`](./lib) - parser, serialization, and i18n helpers
- [`locales/`](./locales) - locale JSON files, including default configs
- [`public/`](./public) - static assets

## Contributing

Contribution guidelines are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).

If you are working on translations, read the translation section there carefully before opening a pull request. Translation changes in this project affect both UI strings and the default localized checklist config, so structural consistency matters.
