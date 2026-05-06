# Contributing

Thank you for contributing to KinkList.

This project is a static, text-driven checklist app built with Next.js and hosted through GitHub Pages. The most important goal for contributions is to keep the app predictable: UI behavior, config parsing, exports, and localization should remain consistent across languages and themes.

## General contribution guidelines

- Keep changes focused and easy to review.
- Prefer small, intentional pull requests over broad mixed changes.
- Preserve existing behavior unless the change is explicitly meant to alter it.
- If you change parsing rules, make sure UI behavior, sharing, and export logic still match.
- If you change styling, keep both light and dark themes usable.
- Do not introduce backend-only assumptions. The app must continue to work as a static export.

## Local workflow

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Build before submitting:

```bash
npm run build
```

## What to test before submitting

Please verify the parts affected by your change. Depending on the work, that may include:

- loading the site with the default config
- editing config text in the UI
- switching locale
- switching theme
- sharing via URL
- TXT export
- PNG export
- behavior on narrower screen widths

## Translation and localization contributions

Translation work needs extra care in this project.

### Files involved

Locale data lives in [`locales/`](./locales). Each locale file contains:

- UI strings
- helper text
- the localized `defaultConfig`

### Rules for translation changes

- Keep all locale keys aligned across files.
- Do not remove keys from one locale unless you remove them from all locales intentionally.
- Preserve the meaning and product behavior of the original UI copy.
- Keep wording concise enough to fit controls and compact layouts.
- If a phrase is long in your language, prefer clarity, but watch for overflow in buttons, labels, and hints.

### Rules for translating `defaultConfig`

The localized default config is not just content. It is also parser input.

When translating `defaultConfig`, make sure to preserve:

- section structure
- section order
- column structure
- item count
- use of `#`, `()`, `*`, and `:::`
- custom option syntax, if present

In practice, this means:

- translate section titles, item text, and hints
- do not accidentally remove or add markers
- do not collapse lines
- do not merge multiple items into one line
- do not reorder items unless the project explicitly wants a locale-specific structure

### Translation quality expectations

For UI strings:

- match the tone of the existing product
- avoid machine-like literal phrasing when a natural interface phrase exists
- keep terminology consistent inside the same locale

For default checklist content:

- translate clearly and neutrally
- keep item scope equivalent to the source
- preserve distinctions between similar items
- keep explanatory hints faithful to the source meaning

### If you add a new locale

When adding a new locale:

1. Create a new JSON file in [`locales/`](./locales).
2. Copy all keys from an existing locale.
3. Translate both UI strings and `defaultConfig`.
4. Register the locale in the i18n helper code.
5. Verify locale switching in the app.
6. Build the project successfully with `npm run build`.

If you are not ready to provide a strong localized default config, it is better to wait than to ship a partial or structurally broken one.

## Content sensitivity

This project deals with intimate and kink-related content. Contributions should stay respectful, neutral, and descriptive. Avoid joke phrasing, shaming language, and wording that makes the UI feel unserious or unsafe.

## Pull requests

A good pull request description should explain:

- what changed
- why it changed
- whether the change affects parsing, localization, export, layout, or sharing
- what you tested locally
