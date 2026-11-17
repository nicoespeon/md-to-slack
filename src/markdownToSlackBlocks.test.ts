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
      "",
      "| a | b |",
      "| - | - |",
      "| 1 | 2 |",
    ].join("\n");

    const result = markdownToSlackBlocks(markdown);

    const mrkdwnBeforeRule = [
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
    ].join("\n");
    const mrkdwnAfterImage = ["```", "a | b", "--|--", "1 | 2", "```"].join(
      "\n",
    );
    expect(result).toEqual([
      header("Title"),
      section(mrkdwnBeforeRule),
      divider(),
      image("https://example.com/cat.png", "alt"),
      section(mrkdwnAfterImage),
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

  test.each(["# Title", "## Title", "Title\n=====", "Title\n-----"])(
    "renders the heading %j as a header",
    (markdown) => {
      const result = markdownToSlackBlocks(markdown);

      expect(result).toEqual([header("Title")]);
    },
  );

  test("renders the text of a header without formatting nor escaping", () => {
    const result = markdownToSlackBlocks(
      "# A & B: **bold _nested_**, `code` and [the *docs*](https://example.com)",
    );

    expect(result).toEqual([header("A & B: bold nested, code and the docs")]);
  });

  test("keeps a heading over 150 characters in the text", () => {
    const longestHeader = "a".repeat(150);
    const tooLong = "b".repeat(151);

    const result = markdownToSlackBlocks(`# ${longestHeader}\n\n# ${tooLong}`);

    expect(result).toEqual([header(longestHeader), section(`*${tooLong}*`)]);
  });

  test("returns no header for a heading without text", () => {
    const result = markdownToSlackBlocks("#\n\nHello world!");

    expect(result).toEqual([section("Hello world!")]);
  });

  test("keeps a heading under the second level in the text", () => {
    const result = markdownToSlackBlocks("### Title");

    expect(result).toEqual([section("*Title*")]);
  });

  test("renders a horizontal rule as a divider between the sections around it", () => {
    const result = markdownToSlackBlocks("Above\n\n---\n\nBelow");

    expect(result).toEqual([section("Above"), divider(), section("Below")]);
  });

  test("keeps a heading and a horizontal rule nested in a quote in the text", () => {
    const result = markdownToSlackBlocks("> # Title\n>\n> ---");

    expect(result).toEqual([section("> *Title*\n>\n> ---")]);
  });

  describe("image alone in a paragraph", () => {
    test("renders an image block", () => {
      const result = markdownToSlackBlocks(
        "![A cat](https://example.com/cat.png)",
      );

      expect(result).toEqual([image("https://example.com/cat.png", "A cat")]);
    });

    test("uses the alt as plain text", () => {
      const result = markdownToSlackBlocks(
        "![A & **B** `c`](https://example.com/cat.png)",
      );

      expect(result).toEqual([image("https://example.com/cat.png", "A & B c")]);
    });

    test("falls back on the title when the alt is empty", () => {
      const result = markdownToSlackBlocks(
        '![](https://example.com/cat.png "A cat")',
      );

      expect(result).toEqual([image("https://example.com/cat.png", "A cat")]);
    });

    test("falls back on a default alt when it has no alt nor title", () => {
      const result = markdownToSlackBlocks("![](https://example.com/cat.png)");

      expect(result).toEqual([image("https://example.com/cat.png", "Image")]);
    });

    test("truncates an alt over 2,000 characters", () => {
      const result = markdownToSlackBlocks(
        `![${"a".repeat(2001)}](https://example.com/cat.png)`,
      );

      expect(result).toEqual([
        image("https://example.com/cat.png", "a".repeat(2000)),
      ]);
    });

    test("ignores the whitespace around the image", () => {
      const result = markdownToSlackBlocks(
        "  ![A cat](https://example.com/cat.png)  ",
      );

      expect(result).toEqual([image("https://example.com/cat.png", "A cat")]);
    });

    test("encodes the URL", () => {
      const result = markdownToSlackBlocks(
        "![A cat](<https://example.com/a cat.png>)",
      );

      expect(result).toEqual([
        image("https://example.com/a%20cat.png", "A cat"),
      ]);
    });

    test("decodes the ampersands of the URL", () => {
      const result = markdownToSlackBlocks(
        "![A cat](https://example.com/cat.png?w=1&amp;h=2)",
      );

      expect(result).toEqual([
        image("https://example.com/cat.png?w=1&h=2", "A cat"),
      ]);
    });

    test.each([
      [
        "with other content in its paragraph",
        "![A cat](https://example.com/cat.png) meows",
        "<https://example.com/cat.png|A cat> meows",
      ],
      [
        "wrapped in a link",
        "[![A cat](https://example.com/cat.png)](https://example.com)",
        "<https://example.com|A cat>",
      ],
      [
        "alone in a heading",
        "### ![A cat](https://example.com/cat.png)",
        "*<https://example.com/cat.png|A cat>*",
      ],
      ["whose URL is not http(s)", "![A cat](./cat.png)", "<./cat.png|A cat>"],
    ])("keeps as a link an image %s", (_, markdown, mrkdwn) => {
      const result = markdownToSlackBlocks(markdown);

      expect(result).toEqual([section(mrkdwn)]);
    });

    test("keeps as text an image whose URL is over 3,000 characters", () => {
      const url = `https://example.com/${"a".repeat(2981)}`;

      const result = markdownToSlackBlocks(`![A cat](${url})`);

      const link = `<${url}|A cat>`;
      expect(result).toEqual([
        section(link.slice(0, 3000)),
        section(link.slice(3000)),
      ]);
    });

    test("keeps as a link an image nested in another block", () => {
      const result = markdownToSlackBlocks(
        "- ![A cat](https://example.com/cat.png)",
      );

      expect(result).toEqual([
        section("- <https://example.com/cat.png|A cat>"),
      ]);
    });
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

    test("splits a table that is too long into code blocks", () => {
      const firstRow = "a".repeat(1000);
      const secondRow = "b".repeat(1000);
      const thirdRow = "c".repeat(1000);
      const table = ["h", "-", firstRow, secondRow, thirdRow]
        .map((row) => `| ${row} |`)
        .join("\n");
      const codeBlock = (...lines: string[]) =>
        ["```", ...lines, "```"].join("\n");

      const result = markdownToSlackBlocks(table);

      expect(result).toEqual([
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
      expect(sectionLengths).toEqual([2401, 1200, 2010, 2010, 3000, 500, 11]);
    });
  });
});

function section(text: string) {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function header(text: string) {
  return { type: "header", text: { type: "plain_text", text } };
}

function divider() {
  return { type: "divider" };
}

function image(image_url: string, alt_text: string) {
  return { type: "image", image_url, alt_text };
}
