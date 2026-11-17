import type { KnownBlock } from "@slack/types";
import { describe, expect, test } from "vitest";
import { markdownToSlackBlocks } from "./index.js";

// `pnpm tsc` fails here when our block types drift from the ones Slack publishes.
const _blocksAcceptedBySlack: KnownBlock[] = markdownToSlackBlocks("");

describe("Markdown to Slack blocks", () => {
  test("renders a paragraph as a section", () => {
    const result = markdownToSlackBlocks("Hello world!");

    expect(result).toEqual([section("Hello world!")]);
  });

  test("renders inline formatting as mrkdwn", () => {
    const result = markdownToSlackBlocks(
      "Hello **world**, see [docs](https://example.com)",
    );

    expect(result).toEqual([
      section("Hello *world*, see <https://example.com|docs>"),
    ]);
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
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    const mrkdwn = [
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
    ].join("\n");
    expect(result).toEqual([section(mrkdwn)]);
  });

  test("renders a table as a table block, the header row first", () => {
    const markdown = ["| a | b |", "| - | - |", "| 1 | 2 |", "| 3 | 4 |"].join(
      "\n",
    );

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      table([
        ["a", "b"],
        ["1", "2"],
        ["3", "4"],
      ]),
    ]);
  });

  test("renders the cells of a table as plain text", () => {
    const markdown = [
      "| **bold** _italic_ | A & B |",
      "| - | - |",
      "| `code` ~~gone~~ | [docs](https://example.com) |",
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      table([
        ["bold italic", "A & B"],
        ["code gone", "docs (https://example.com)"],
      ]),
    ]);
  });

  test("aligns the columns of a table like the Markdown does", () => {
    const markdown = [
      "| a | b | c | d |",
      "| - | :- | :-: | -: |",
      "| 1 | 2 | 3 | 4 |",
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      {
        ...table([
          ["a", "b", "c", "d"],
          ["1", "2", "3", "4"],
        ]),
        column_settings: [
          { align: "left" },
          { align: "left" },
          { align: "center" },
          { align: "right" },
        ],
      },
    ]);
  });

  test("renders an empty cell of a table as a space", () => {
    const markdown = ["| a | |", "| - | - |", "| | 2 |"].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      table([
        ["a", " "],
        [" ", "2"],
      ]),
    ]);
  });

  test("renders a table of 100 rows, 20 columns and 10,000 characters as a table block", () => {
    const row = Array<string>(20).fill("abcde");
    const rows = Array<string[]>(100).fill(row);
    const [header, ...body] = rows.map((cells) => `| ${cells.join(" | ")} |`);
    const separator = `|${" - |".repeat(20)}`;

    const result = markdownToSlackBlocks(
      [header, separator, ...body].join("\n"),
    );

    expect(result).toEqual([table(rows)]);
  });

  test("keeps a table over 100 rows in the text", () => {
    const markdown = [
      "| h |",
      "| - |",
      ...Array<string>(100).fill("| 1 |"),
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      section(
        ["```", "h", "-", ...Array<string>(100).fill("1"), "```"].join("\n"),
      ),
    ]);
  });

  test("keeps a table over 20 columns in the text", () => {
    const markdown = [
      `|${" h |".repeat(21)}`,
      `|${" - |".repeat(21)}`,
      `|${" 1 |".repeat(21)}`,
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      section(
        [
          "```",
          Array(21).fill("h").join(" | "),
          Array(21).fill("-").join("-|-"),
          Array(21).fill("1").join(" | "),
          "```",
        ].join("\n"),
      ),
    ]);
  });

  test("keeps a table in the text when the tables of the message would exceed 10,000 characters", () => {
    const cell = "a".repeat(1000);
    const rows = Array<string[]>(4).fill([cell]);
    const markdown = Array<string>(3).fill(toMarkdownTable(rows)).join("\n\n");
    const codeBlock = (...lines: string[]) =>
      ["```", ...lines, "```"].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      table(rows),
      table(rows),
      section(codeBlock(cell, "-".repeat(1000))),
      section(codeBlock(cell, cell)),
      section(codeBlock(cell)),
    ]);
  });

  test("cuts the text into a section before and after a table", () => {
    const markdown = [
      "Before",
      "",
      "| a |",
      "| - |",
      "| 1 |",
      "",
      "After",
      "",
      "The end",
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      section("Before"),
      table([["a"], ["1"]]),
      section("After\n\nThe end"),
    ]);
  });

  test("keeps a table nested in a list in the text", () => {
    const markdown = ["- item", "", "  | a |", "  | - |", "  | 1 |"].join("\n");

    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([
      section(["- item", "", "```", "a", "-", "1", "```"].join("\n")),
    ]);
  });

  test("starts the section at the first line with content", () => {
    const result = markdownToSlackBlocks("\n\n  \nHello world!\n\n");

    expect(result).toEqual([section("Hello world!")]);
  });

  test.each(["", "  \n\n\t\n"])("returns no block for %j", (markdown) => {
    const result = markdownToSlackBlocks(markdown);

    expect(result).toEqual([]);
  });

  describe("text over 3,000 characters", () => {
    test("splits between Markdown blocks", () => {
      const first = "a".repeat(2000);
      const second = "b".repeat(2000);

      const result = markdownToSlackBlocks(`${first}\n\n${second}`);

      expect(result).toEqual([section(first), section(second)]);
    });

    test("packs as many whole blocks as fit in a section", () => {
      const first = "a".repeat(1499);
      const second = "b".repeat(1499);
      const third = "c".repeat(10);

      const result = markdownToSlackBlocks(`${first}\n\n${second}\n\n${third}`);

      expect(result).toEqual([
        section(`${first}\n\n${second}`),
        section(third),
      ]);
    });

    test("doesn't split on a blank line inside a code block", () => {
      const paragraph = "a".repeat(2500);
      const code = ["```", "b".repeat(300), "", "c".repeat(300), "```"].join(
        "\n",
      );

      const result = markdownToSlackBlocks(`${paragraph}\n\n${code}`);

      expect(result).toEqual([section(paragraph), section(code)]);
    });

    test("splits a block that is too long on its line breaks", () => {
      const firstLine = "a".repeat(1500);
      const secondLine = "b".repeat(1400);
      const thirdLine = "c".repeat(1000);

      const result = markdownToSlackBlocks(
        `${firstLine}\n${secondLine}\n${thirdLine}`,
      );

      expect(result).toEqual([
        section(`${firstLine}\n${secondLine}`),
        section(thirdLine),
      ]);
    });

    test("splits a code block that is too long into code blocks of the same language", () => {
      const firstLine = "a".repeat(1500);
      const secondLine = "b".repeat(1489);
      const thirdLine = "c".repeat(1000);
      const codeBlock = (...lines: string[]) =>
        ["```js", ...lines, "```"].join("\n");

      const result = markdownToSlackBlocks(
        codeBlock(firstLine, secondLine, thirdLine),
      );

      expect(result).toEqual([
        section(codeBlock(firstLine, secondLine)),
        section(codeBlock(thirdLine)),
      ]);
    });

    test("cuts a line that is too long", () => {
      const result = markdownToSlackBlocks("a".repeat(7000));

      expect(result).toEqual([
        section("a".repeat(3000)),
        section("a".repeat(3000)),
        section("a".repeat(1000)),
      ]);
    });

    test("cuts a line of code that is too long, leaving room for the fences", () => {
      const codeBlock = (code: string) => ["```", code, "```"].join("\n");

      const result = markdownToSlackBlocks(codeBlock("a".repeat(6000)));

      expect(result).toEqual([
        section(codeBlock("a".repeat(2992))),
        section(codeBlock("a".repeat(2992))),
        section(codeBlock("a".repeat(16))),
      ]);
    });

    test("splits a table over 10,000 characters into code blocks", () => {
      const header = "h".repeat(1001);
      const row = "a".repeat(1000);
      const table = [header, "-", ...Array<string>(9).fill(row)]
        .map((line) => `| ${line} |`)
        .join("\n");
      const codeBlock = (...lines: string[]) =>
        ["```", ...lines, "```"].join("\n");

      const result = markdownToSlackBlocks(table);

      expect(result).toEqual([
        section(codeBlock(header, "-".repeat(1001))),
        section(codeBlock(row, row)),
        section(codeBlock(row, row)),
        section(codeBlock(row, row)),
        section(codeBlock(row, row)),
        section(codeBlock(row)),
      ]);
    });

    test("keeps the blank lines of a code block it splits", () => {
      const firstLine = "a".repeat(1000);
      const secondLine = "b".repeat(1000);
      const thirdLine = "c".repeat(1500);
      const codeBlock = (...lines: string[]) =>
        ["```", ...lines, "```"].join("\n");

      const result = markdownToSlackBlocks(
        codeBlock(firstLine, "", secondLine, "", thirdLine),
      );

      expect(result).toEqual([
        section(codeBlock(firstLine, "", secondLine, "")),
        section(codeBlock(thirdLine)),
      ]);
    });

    test("drops the blank line where it splits a block", () => {
      const firstParagraph = `- ${"a".repeat(2000)}`;
      const secondParagraph = `  ${"b".repeat(2000)}`;

      const result = markdownToSlackBlocks(
        `${firstParagraph}\n\n${secondParagraph}`,
      );

      expect(result).toEqual([
        section(firstParagraph),
        section(secondParagraph),
      ]);
    });

    test("resolves a link whose reference ends up in another section", () => {
      const paragraph = "a".repeat(2990);

      const result = markdownToSlackBlocks(
        `See [docs][ref]\n\n${paragraph}\n\n[ref]: https://example.com`,
      );

      expect(result).toEqual([
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

      const result = markdownToSlackBlocks(markdown);

      const sectionLengths = result.flatMap((block) =>
        block.type === "section" ? [block.text.text.length] : [],
      );
      expect(sectionLengths).toEqual([
        7, 2401, 1200, 2010, 2010, 3000, 500, 11,
      ]);
    });
  });
});

function section(text: string) {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function table(rows: string[][]) {
  return {
    type: "table",
    rows: rows.map((row) => row.map((text) => ({ type: "raw_text", text }))),
  };
}

function toMarkdownTable([header, ...body]: string[][]) {
  const toLine = (cells: string[]) => `| ${cells.join(" | ")} |`;
  const separator = header.map(() => "-");

  return [header, separator, ...body].map(toLine).join("\n");
}
