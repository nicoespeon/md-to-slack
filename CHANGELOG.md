# Changelog

## [1.2.0](https://github.com/nicoespeon/md-to-slack/compare/v1.1.8...v1.2.0) (2026-11-16)


### Features

* render headings in bold ([#86](https://github.com/nicoespeon/md-to-slack/issues/86)) ([015ec3e](https://github.com/nicoespeon/md-to-slack/commit/015ec3e816d6ace693eec35584ac5b7bd80a52c8))
* render images as links instead of dropping them ([#87](https://github.com/nicoespeon/md-to-slack/issues/87)) ([dc08fc6](https://github.com/nicoespeon/md-to-slack/commit/dc08fc634112c2c4807ada78333eeaef59bda340))
* render tables as aligned text in a code block ([#88](https://github.com/nicoespeon/md-to-slack/issues/88)) ([0acf209](https://github.com/nicoespeon/md-to-slack/commit/0acf209ec55b0c9e6174090372d92e23e882c5c6))


### Bug Fixes

* keep paragraphs and code blocks of a list item on their own lines ([#89](https://github.com/nicoespeon/md-to-slack/issues/89)) ([0a2192d](https://github.com/nicoespeon/md-to-slack/commit/0a2192d5e779cd1c5a0096fe8ec6ed5e714837cc))

## [1.1.8](https://github.com/nicoespeon/md-to-slack/compare/v1.1.7...v1.1.8) (2026-11-16)


### Bug Fixes

* render nested lists on their own line regardless of indentation ([0a3826b](https://github.com/nicoespeon/md-to-slack/commit/0a3826b336128195a4b611b6188a618fd609c3dc)), closes [#82](https://github.com/nicoespeon/md-to-slack/issues/82)

## [1.1.7](https://github.com/nicoespeon/md-to-slack/compare/v1.1.6...v1.1.7) (2025-12-11)


### Bug Fixes

* **publish:** ensure GitHub has latest NPM for publish ([a5bcd4e](https://github.com/nicoespeon/md-to-slack/commit/a5bcd4ec737985ad1ea5ff92db870834d27b2b98))

## [1.1.6](https://github.com/nicoespeon/md-to-slack/compare/v1.1.5...v1.1.6) (2025-12-11)


### Bug Fixes

* **publish:** inline all steps in release-please ([41f8763](https://github.com/nicoespeon/md-to-slack/commit/41f87631f9e0de6a83263ba61bb38144d29bb955))


### Reverts

* "fix(publish): provide NODE_AUTH_TOKEN to publish step" ([ee2a113](https://github.com/nicoespeon/md-to-slack/commit/ee2a113c5111c60fb7523221bd6022ba9f176f47))

## [1.1.5](https://github.com/nicoespeon/md-to-slack/compare/v1.1.4...v1.1.5) (2025-12-11)


### Bug Fixes

* **publish:** provide NODE_AUTH_TOKEN to publish step ([6b6ec46](https://github.com/nicoespeon/md-to-slack/commit/6b6ec462c52c332c351d8d1287a8a96be94ab181))

## [1.1.4](https://github.com/nicoespeon/md-to-slack/compare/v1.1.3...v1.1.4) (2025-12-11)


### Bug Fixes

* **publish:** add registry for trusted publishing ([f63bb37](https://github.com/nicoespeon/md-to-slack/commit/f63bb37372594b56b34eca70c761bb621f84ae0b))
* **publish:** use custom PAT for release-please ([d428844](https://github.com/nicoespeon/md-to-slack/commit/d428844a61d810ffd8ea1392cfe178e6a536c3d0))

## [1.1.3](https://github.com/nicoespeon/md-to-slack/compare/v1.1.2...v1.1.3) (2025-12-11)


### Bug Fixes

* **publish:** merge publish & release workflows ([bd3061c](https://github.com/nicoespeon/md-to-slack/commit/bd3061c07af30dea997977511c7852ac5414e197))

## [1.1.2](https://github.com/nicoespeon/md-to-slack/compare/v1.1.1...v1.1.2) (2025-12-11)


### Bug Fixes

* **publish:** use npm trusted publishing ([a2165d3](https://github.com/nicoespeon/md-to-slack/commit/a2165d31a261e0a7b2f4d6c1edaf76890df52b42))

## [1.1.1](https://github.com/nicoespeon/md-to-slack/compare/v1.1.0...v1.1.1) (2025-12-11)


### Bug Fixes

* **publish:** add missing build step ([db1837c](https://github.com/nicoespeon/md-to-slack/commit/db1837c1d7712bf2011f49b952b6187f4be98b1f)), closes [#47](https://github.com/nicoespeon/md-to-slack/issues/47)

## [1.1.0](https://github.com/nicoespeon/md-to-slack/compare/v1.0.0...v1.1.0) (2025-12-09)


### Features

* convert inline formatting inside list items ([#43](https://github.com/nicoespeon/md-to-slack/issues/43)) ([e0aa1e9](https://github.com/nicoespeon/md-to-slack/commit/e0aa1e91e655a2f5b9bec7e71a8c388e82e97490))

## 1.0.0 (2025-03-07)


### Features

* initial POC ([12d4c3c](https://github.com/nicoespeon/md-to-slack/commit/12d4c3ce595ee0bf94a8c8b7190b987de17a7550))
