import type { KnownBlock } from "@slack/types";
import { describe, expect, test } from "vitest";
import { markdownToSlackBlocks } from "./index.js";

// `pnpm tsc` fails here when our block types drift from the ones Slack publishes.
const _blocksAcceptedBySlack: KnownBlock[] = markdownToSlackBlocks("");

describe("Markdown to Slack blocks", () => {
  test("renders a paragraph as a section", () => {
    expect(markdownToSlackBlocks("Hello world!")).toEqual([
      section("Hello world!"),
    ]);
  });

  test("renders inline formatting as mrkdwn", () => {
    expect(
      markdownToSlackBlocks("Hello **world**, see [docs](https://example.com)"),
    ).toEqual([section("Hello *world*, see <https://example.com|docs>")]);
  });

  test("merges consecutive Markdown blocks into one section", () => {
    const markdown = [
      "# Title",
      "",
      "A paragraph.",
      "",
      "- one",
      "- two",
      "",
      "> quote",
      "",
      "```js",
      "const a = 1;",
      "",
      "const b = 2;",
      "```",
      "",
      "---",
      "",
      "![alt](https://example.com/cat.png)",
      "",
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
    ].join("\n");

    expect(markdownToSlackBlocks(markdown)).toEqual([
      section(
        [
          "*Title*",
          "",
          "A paragraph.",
          "",
          "- one",
          "- two",
          "",
          "> quote",
          "",
          "```js",
          "const a = 1;",
          "",
          "const b = 2;",
          "```",
          "",
          "---",
          "",
          "<https://example.com/cat.png|alt>",
          "",
          "```",
          "a | b",
          "--|--",
          "1 | 2",
          "```",
        ].join("\n"),
      ),
    ]);
  });

  test("starts the section at the first line with content", () => {
    expect(markdownToSlackBlocks("\n\n  \nHello world!\n\n")).toEqual([
      section("Hello world!"),
    ]);
  });

  test.each(["", "  \n\n\t\n"])("returns no block for %j", (markdown) => {
    expect(markdownToSlackBlocks(markdown)).toEqual([]);
  });

  describe("text over 3,000 characters", () => {
    test("splits between Markdown blocks", () => {
      const first = "a".repeat(2000);
      const second = "b".repeat(2000);

      expect(markdownToSlackBlocks(`${first}\n\n${second}`)).toEqual([
        section(first),
        section(second),
      ]);
    });

    test("packs as many whole blocks as fit in a section", () => {
      const first = "a".repeat(1499);
      const second = "b".repeat(1499);
      const third = "c".repeat(10);

      expect(
        markdownToSlackBlocks(`${first}\n\n${second}\n\n${third}`),
      ).toEqual([section(`${first}\n\n${second}`), section(third)]);
    });

    test("doesn't split on a blank line inside a code block", () => {
      const paragraph = "a".repeat(2500);
      const code = ["```", "b".repeat(300), "", "c".repeat(300), "```"].join(
        "\n",
      );

      expect(markdownToSlackBlocks(`${paragraph}\n\n${code}`)).toEqual([
        section(paragraph),
        section(code),
      ]);
    });

    test("splits a block that is too long on its line breaks", () => {
      const firstLine = "a".repeat(1500);
      const secondLine = "b".repeat(1400);
      const thirdLine = "c".repeat(1000);

      expect(
        markdownToSlackBlocks(`${firstLine}\n${secondLine}\n${thirdLine}`),
      ).toEqual([section(`${firstLine}\n${secondLine}`), section(thirdLine)]);
    });

    test("splits a code block that is too long into code blocks of the same language", () => {
      const firstLine = "a".repeat(1500);
      const secondLine = "b".repeat(1489);
      const thirdLine = "c".repeat(1000);
      const codeBlock = (...lines: string[]) =>
        ["```js", ...lines, "```"].join("\n");

      expect(
        markdownToSlackBlocks(codeBlock(firstLine, secondLine, thirdLine)),
      ).toEqual([
        section(codeBlock(firstLine, secondLine)),
        section(codeBlock(thirdLine)),
      ]);
    });

    test("cuts a line that is too long", () => {
      expect(markdownToSlackBlocks("a".repeat(7000))).toEqual([
        section("a".repeat(3000)),
        section("a".repeat(3000)),
        section("a".repeat(1000)),
      ]);
    });

    test("cuts a line of code that is too long, leaving room for the fences", () => {
      const codeBlock = (code: string) => ["```", code, "```"].join("\n");

      expect(markdownToSlackBlocks(codeBlock("a".repeat(6000)))).toEqual([
        section(codeBlock("a".repeat(2992))),
        section(codeBlock("a".repeat(2992))),
        section(codeBlock("a".repeat(16))),
      ]);
    });

    test("splits a table that is too long into code blocks", () => {
      const firstRow = "a".repeat(1000);
      const secondRow = "b".repeat(1000);
      const thirdRow = "c".repeat(1000);
      const codeBlock = (...lines: string[]) =>
        ["```", ...lines, "```"].join("\n");

      expect(
        markdownToSlackBlocks(
          ["h", "-", firstRow, secondRow, thirdRow]
            .map((row) => `| ${row} |`)
            .join("\n"),
        ),
      ).toEqual([
        section(codeBlock("h", "-".repeat(1000), firstRow)),
        section(codeBlock(secondRow, thirdRow)),
      ]);
    });

    test("keeps the blank lines of a code block it splits", () => {
      const firstLine = "a".repeat(1000);
      const secondLine = "b".repeat(1000);
      const thirdLine = "c".repeat(1500);
      const codeBlock = (...lines: string[]) =>
        ["```", ...lines, "```"].join("\n");

      expect(
        markdownToSlackBlocks(
          codeBlock(firstLine, "", secondLine, "", thirdLine),
        ),
      ).toEqual([
        section(codeBlock(firstLine, "", secondLine, "")),
        section(codeBlock(thirdLine)),
      ]);
    });

    test("drops the blank line where it splits a block", () => {
      const firstParagraph = `- ${"a".repeat(2000)}`;
      const secondParagraph = `  ${"b".repeat(2000)}`;

      expect(
        markdownToSlackBlocks(`${firstParagraph}\n\n${secondParagraph}`),
      ).toEqual([section(firstParagraph), section(secondParagraph)]);
    });

    test("resolves a link whose reference ends up in another section", () => {
      const paragraph = "a".repeat(2990);

      expect(
        markdownToSlackBlocks(
          `See [docs][ref]\n\n${paragraph}\n\n[ref]: https://example.com`,
        ),
      ).toEqual([
        section("See <https://example.com|docs>"),
        section(paragraph),
      ]);
    });

    test("keeps every section between 1 and 3,000 characters", () => {
      const markdown = [
        "# Title",
        Array(3).fill("a".repeat(1200)).join("\n"),
        ["```ts", "b".repeat(2000), "c".repeat(2000), "```"].join("\n"),
        "d".repeat(3500),
        "- one\n- two",
      ].join("\n\n");

      expect(
        markdownToSlackBlocks(markdown).map(({ text }) => text.text.length),
      ).toEqual([7, 2401, 1200, 2010, 2010, 3000, 500, 11]);
    });
  });
});

function section(text: string) {
  return { type: "section", text: { type: "mrkdwn", text } };
}
