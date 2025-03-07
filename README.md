# Markdown to Slack

> Converts Markdown to Slack-compatible text.

<br>
<div align="center">
  <img src="https://github.com/nicoespeon/md-to-slack/blob/main/assets/md2slack-logo.png?raw=true" width="300px" />
</div>
<br>

[![All Contributors](https://img.shields.io/github/all-contributors/nicoespeon/md-to-slack?color=ee8449&style=for-the-badge)](#contributors)

## Features

- 💫 Converts input into Slack-compatible [mrkdwn](https://api.slack.com/reference/surfaces/formatting) syntax
- 🧱 Supports [Markdown](https://daringfireball.net/projects/markdown/) and [GitHub Flavored Markdown](https://github.github.com/gfm/) syntaxes

## ✨ Usage

```shell
npm i md-to-slack
```

You can then use `markdownToSlack()` to convert Markdown to Slack-compatible text:

```js
import { markdownToSlack } from "md-to-slack";

const slackText = markdownToSlack("Hello **world**!");
```

So text like:

```md
Hello **World**! How are you _today_?
```

Gets transformed into the proper syntax for rendering it on Slack:

```
Hello *World*! How are you _today_?
```

### ☑️ Supported syntax

All of the [basic Markdown syntax](https://www.markdownguide.org/basic-syntax/) is supported and translated into Slack-compatible [mrkdwn](https://api.slack.com/reference/surfaces/formatting) syntax.

A few remarks though:

- Headings (`#`, `##`, etc.) are not supported by mrkdwn, so they are stripped out
- Same with images
- GitHub Flavored Markdown checkboxes are converted into an equivalent emoji (☐ or ☒)

### 🔭 Next features

1. Support Markdown extended syntax (e.g. tables)
2. Generate Slack [BlockKit-compatible](https://api.slack.com/block-kit) objects, as an opt-in parameter

We want to support the [extended syntax](https://www.markdownguide.org/extended-syntax/), in particular things like tables and GitHub Flavored Markdown niceties.

`mrkdwn` syntax has limited capabilities, so we intend to do a "best possble conversion" like we do for checkboxes.

But the real deal will be to add the option for generating a Slack BlockKit-compatible output to render rich elements, such as images, checkboxes, tables, and other HTML elements in Slack.

### 🦺 Security consideration

`md-to-slack` doesn't sanitize your text, it only converts the syntax.

If your Markdown input was generated from an external source, consider sanitizing it before sending it to Slack to avoid [cross-site scripting XSS](https://en.wikipedia.org/wiki/Cross-site_scripting) attacks.

## 🤹 Alternatives

As of February 2025, the most popular solution to do a similar job is [mack](https://github.com/tryfabric/mack/tree/master). But it has pitfalls:

1. It only converts the output to Slack BlockKit block objects, it doesn't handle simple mrkdwn
2. Types are out-of-date with the latest Slack API, so you can't use it in TypeScript with SDK like [bolt](https://github.com/slackapi/bolt-js)
3. CI is not passing and the code has not been changed since 2022

`md-to-slack` was built to provide a simple, up-to-date alternative that converts a Markdown input into a Slack-compatible one (mrkdwn).

## 🧑‍💻 Development

The project uses Node.js and [pnpm](https://pnpm.io). These are versioned in `.tool-versions` for easy setup via [asdf](https://asdf-vm.com).

```shell
git clone https://github.com/nicoespeon/md-to-slack
cd md-to-slack
pnpm install
```

> This repository includes a list of suggested VS Code extensions.
> It's a good idea to use [VS Code](https://code.visualstudio.com) and accept its suggestion to install them, as they'll help with development.

### Pre-requisites

To run the project, you'll need:

- [Node.js](https://nodejs.org)
- [pnpm](https://pnpm.io)

The exact versions are listed in `.tool-versions`. To use them automatically, you can use [asdf](https://asdf-vm.com) and run `asdf install`.

### Building

Run [**tsup**](https://tsup.egoist.dev) locally to build source files from `src/` into output files in `dist/`:

```shell
pnpm build
```

Add `--watch` to run the builder in a watch mode that continuously cleans and recreates `dist/` as you save files:

```shell
pnpm build --watch
```

### Formatting

[Prettier](https://prettier.io) is used to format code.
It should be applied automatically when you save files in VS Code or make a Git commit.

To manually reformat all files, you can run:

```shell
pnpm format --write
```

### Linting

[ESLint](https://eslint.org) is used with with [typescript-eslint](https://typescript-eslint.io)) to lint JavaScript and TypeScript source files.
You can run it locally on the command-line:

```shell
pnpm run lint
```

ESLint can be run with `--fix` to auto-fix some lint rule complaints:

```shell
pnpm run lint --fix
```

Note that you'll need to run `pnpm build` before `pnpm lint` so that lint rules which check the file system can pick up on any built files.

### Type Checking

You should be able to see suggestions from [TypeScript](https://typescriptlang.org) in your editor for all open files.

However, it can be useful to run the TypeScript command-line (`tsc`) to type check all files in `src/`:

```shell
pnpm tsc
```

Add `--watch` to keep the type checker running in a watch mode that updates the display as you save files:

```shell
pnpm tsc --watch
```

### Testing

[Vitest](https://vitest.dev) is used for tests.
You can run it locally on the command-line:

```shell
pnpm test
```

It will run in watch mode by default and re-run tests when it detects changes to the file system.

### Deployment

The project uses [release-please](https://github.com/googleapis/release-please) to automatically create new releases and update the CHANGELOG.

To make this work, we need to follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

The most important prefixes you should have in mind are:

- `fix:` which represents bug fixes, and correlates to a SemVer patch.
- `feat:` which represents a new feature, and correlates to a SemVer minor.
- `feat!:`, or `fix!:`, `refactor!:`, etc., which represent a breaking change (indicated by the !) and will result in a SemVer major.

It's fine if you don't follow the convention yourself for the commits. If you open a pull request, only its title matters. That's what will be used to create the merge commit for release-please to pick up.

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->
