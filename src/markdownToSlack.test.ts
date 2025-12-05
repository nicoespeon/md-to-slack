import { describe, expect, test } from "vitest";
import { markdownToSlack } from "./index.js";

describe("Markdown to Slack", () => {
  test("preserves plain text", () => {
    expect(markdownToSlack("Hello world!")).toBe("Hello world!");
  });

  test("converts characters that should be escaped", () => {
    const result = markdownToSlack("Hello & << World >>");
    expect(result).toBe("Hello &amp; &lt;&lt; World &gt;&gt;");
  });

  describe("converts bold to Slack syntax", () => {
    test("supports **", () => {
      const result = markdownToSlack("Hello **world**! How are **you**?");
      expect(result).toBe("Hello *world*! How are *you*?");
    });

    test("supports __", () => {
      const result = markdownToSlack("Hello __world__! How are __you__?");
      expect(result).toBe("Hello *world*! How are *you*?");
    });
  });

  describe("converts italic to Slack syntax", () => {
    test("supports *", () => {
      const result = markdownToSlack("Hello *world*! How are *you*?");
      expect(result).toBe("Hello _world_! How are _you_?");
    });

    test("supports _", () => {
      const result = markdownToSlack("Hello _world_! How are _you_?");
      expect(result).toBe("Hello _world_! How are _you_?");
    });
  });

  describe("converts strikethrough to Slack syntax", () => {
    test("supports ~~", () => {
      const result = markdownToSlack("Hello ~~world~~! How are ~~you~~?");
      expect(result).toBe("Hello ~world~! How are ~you~?");
    });

    test("supports <del>", () => {
      const result = markdownToSlack(
        "Hello <del>world</del>! How are <del>you</del>?",
      );
      expect(result).toBe("Hello ~world~! How are ~you~?");
    });

    test("supports <s>", () => {
      const result = markdownToSlack("Hello <s>world</s>! How are <s>you</s>?");
      expect(result).toBe("Hello ~world~! How are ~you~?");
    });

    test("supports <strike>", () => {
      const result = markdownToSlack(
        "Hello <strike>world</strike>! How are <strike>you</strike>?",
      );
      expect(result).toBe("Hello ~world~! How are ~you~?");
    });
  });

  describe("converts links to Slack syntax", () => {
    test("supports regular links", () => {
      const result = markdownToSlack("<http://www.example.com>");
      expect(result).toBe("<http://www.example.com>");
    });

    test("supports regular mailto links", () => {
      const result = markdownToSlack("<fake@example.com>");
      expect(result).toBe("<mailto:fake@example.com>");
    });

    test("supports links with text", () => {
      const result = markdownToSlack(
        "[This message is a link](http://www.example.com)",
      );
      expect(result).toBe("<http://www.example.com|This message is a link>");
    });

    test("supports links with reference", () => {
      const result = markdownToSlack(`The link to my [Hobbit Hole][1]

[1]: http://www.example.com`);
      expect(result).toBe(
        "The link to my <http://www.example.com|Hobbit Hole>",
      );
    });

    test("omits the title text", () => {
      const result = markdownToSlack(
        '[This message is a link](http://www.example.com "This is an example")',
      );
      expect(result).toBe("<http://www.example.com|This message is a link>");
    });
  });

  describe("converts paragraphs to Slack syntax", () => {
    test("preserves newlines", () => {
      const result = markdownToSlack(`Hello world!

How are you?`);
      expect(result).toBe(`Hello world!

How are you?`);
    });

    test("preserves leading newlines", () => {
      const result = markdownToSlack(`

Hello world!`);
      expect(result).toBe(`

Hello world!`);
    });

    test("remove trailing newlines", () => {
      const result = markdownToSlack(`Hello world!


`);
      expect(result).toBe(`Hello world!`);
    });
  });

  describe("converts line-breaks to Slack syntax", () => {
    test("supports \\n", () => {
      const result = markdownToSlack("Hello\nworld!");
      expect(result).toBe("Hello\nworld!");
    });

    test("supports <br>", () => {
      const result = markdownToSlack("Hello<br>world!");
      expect(result).toBe("Hello\nworld!");
    });

    test("supports <br />", () => {
      const result = markdownToSlack("Hello<br />world<br />!");
      expect(result).toBe("Hello\nworld\n!");
    });
  });

  describe("converts blockquotes to Slack syntax", () => {
    test("preserves >", () => {
      const result = markdownToSlack("> Hello world!");
      expect(result).toBe("> Hello world!");
    });

    test("supports multi-lines quotes", () => {
      const result = markdownToSlack(`> Hello world!
>
> How are you?`);
      expect(result).toBe(`> Hello world!
>
> How are you?`);
    });

    test("supports nested blockquotes", () => {
      const result = markdownToSlack(`> Hello world!
> > How are you?`);
      expect(result).toBe(`> Hello world!
> > How are you?`);
    });

    test("supports blockquotes with other elements", () => {
      const result = markdownToSlack(`> Hello **world**!`);
      expect(result).toBe(`> Hello *world*!`);
    });
  });

  describe("converts code to Slack syntax", () => {
    test("supports ```", () => {
      const result = markdownToSlack(`\`\`\`
const some = "code";
console.log(some);
\`\`\``);
      expect(result).toBe(`\`\`\`
const some = "code";
console.log(some);
\`\`\``);
    });

    test("supports ``` with code lang", () => {
      const result = markdownToSlack(`\`\`\`js
const some = "code";
console.log(some);
\`\`\``);
      expect(result).toBe(`\`\`\`js
const some = "code";
console.log(some);
\`\`\``);
    });

    test("supports inline code with `", () => {
      const result = markdownToSlack(
        "This is a sentence with some `inline *code*` in it",
      );
      expect(result).toBe("This is a sentence with some `inline *code*` in it");
    });

    test("supports 4-space indentation", () => {
      const result = markdownToSlack(`Here is some code:

    const some = "code";
    console.log(some);
`);
      expect(result).toBe(`Here is some code:

\`\`\`
const some = "code";
console.log(some);
\`\`\``);
    });
  });

  describe("converts list to Slack syntax", () => {
    test("supports *", () => {
      const result = markdownToSlack(`* Hello world!
* How are you?`);
      expect(result).toBe(`- Hello world!
- How are you?`);
    });

    test("converts inline formatting inside unordered list items", () => {
      const result =
        markdownToSlack(`- **Bold item**: Description [link](http://example.com)
- Another *italic* item`);
      expect(result).toBe(`- *Bold item*: Description <http://example.com|link>
- Another _italic_ item`);
    });

    test("converts inline formatting inside ordered list items", () => {
      const result =
        markdownToSlack(`1. **First item**: With a [link](http://example.com)
2. **Second item**: More ~~strikethrough~~ text`);
      expect(result).toBe(`1. *First item*: With a <http://example.com|link>
2. *Second item*: More ~strikethrough~ text`);
    });

    test("supports +", () => {
      const result = markdownToSlack(`+ Hello world!
+ How are you?`);
      expect(result).toBe(`- Hello world!
- How are you?`);
    });

    test("supports -", () => {
      const result = markdownToSlack(`- Hello world!
- How are you?`);
      expect(result).toBe(`- Hello world!
- How are you?`);
    });

    test("supports nested, unordered lists", () => {
      const result = markdownToSlack(`- First item
- Second item
    - Indented item
    - Indented item
- Third item`);
      expect(result).toBe(`- First item
- Second item
  - Indented item
  - Indented item
- Third item`);
    });

    test("supports 1.", () => {
      const result = markdownToSlack(`1. Hello world!
2. How are you?`);
      expect(result).toBe(`1. Hello world!
2. How are you?`);
    });

    test("supports 1. with custom start", () => {
      const result = markdownToSlack(`10. Hello world!
11. How are you?`);
      expect(result).toBe(`10. Hello world!
11. How are you?`);
    });

    test("supports nested, ordered list", () => {
      const result = markdownToSlack(`1. First item
2. Second item
    1. Indented item
    2. Indented item
3. Third item`);
      expect(result).toBe(`1. First item
2. Second item
  1. Indented item
  2. Indented item
3. Third item`);
    });

    test("converts checkboxes to an equivalent emoji", () => {
      const result = markdownToSlack(`- [x] #739
- [ ] https://github.com/octo-org/octo-repo/issues/740
- [ ] Add delight to the experience when all tasks are complete :tada:`);
      // Note: URLs are now correctly converted to Slack link format
      expect(result).toBe(`☒ #739
☐ <https://github.com/octo-org/octo-repo/issues/740>
☐ Add delight to the experience when all tasks are complete :tada:`);
    });
  });

  describe("preserves horizontal rules to Slack syntax", () => {
    test("preserves ---", () => {
      const result = markdownToSlack(`Hello world!

---

How are you?
`);
      expect(result).toBe(`Hello world!

---

How are you?`);
    });

    test("preserves ***", () => {
      const result = markdownToSlack(`Hello world!

***

How are you?
`);
      expect(result).toBe(`Hello world!

***

How are you?`);
    });

    test("preserves ___", () => {
      const result = markdownToSlack(`Hello world!

_________________

How are you?
`);
      expect(result).toBe(`Hello world!

_________________

How are you?`);
    });
  });

  describe("removes unsupported images", () => {
    test("removes image code", () => {
      const result = markdownToSlack(
        "My image: ![alt text](https://github.com/logo.png 'optional title')",
      );
      expect(result).toBe("My image:");
    });

    test("removes image code within a link", () => {
      const result = markdownToSlack(
        `My image: [![An old rock](/assets/images/shiprock.jpg "Shiprock, New Mexico")](https://www.flickr.com/photos/beaurogers/3183)`,
      );
      expect(result).toBe(
        "My image: <https://www.flickr.com/photos/beaurogers/3183>",
      );
    });
  });

  describe("removes unsupported headings", () => {
    test("removes #", () => {
      const result = markdownToSlack("# Hello world!");
      expect(result).toBe("Hello world!");
    });

    test("removes === underline", () => {
      const result = markdownToSlack(`
Hello world!
=====

How are you?`);
      expect(result).toBe(`
Hello world!

How are you?`);
    });

    test("removes ##", () => {
      const result = markdownToSlack(`## Hello world!

How are you?`);
      expect(result).toBe(`Hello world!

How are you?`);
    });

    test("removes --- underline", () => {
      const result = markdownToSlack(`
Hello world!
------

How are you?`);
      expect(result).toBe(`
Hello world!

How are you?`);
    });

    test("removes ###", () => {
      const result = markdownToSlack("### Hello world!");
      expect(result).toBe("Hello world!");
    });

    test("removes ####", () => {
      const result = markdownToSlack("#### Hello world!");
      expect(result).toBe("Hello world!");
    });

    test("removes #####", () => {
      const result = markdownToSlack("##### Hello world!");
      expect(result).toBe("Hello world!");
    });

    test("removes ######", () => {
      const result = markdownToSlack("###### Hello world!");
      expect(result).toBe("Hello world!");
    });
  });

  describe("supports mixed scenarios", () => {
    test("supports a mix of bold & italic", () => {
      const result = markdownToSlack(
        "This is really ***very*** important text.",
      );
      expect(result).toBe("This is really _*very*_ important text.");
    });

    test("supports formatted links", () => {
      const result = markdownToSlack(
        "I love the **[Example Site](https://example.com)**.",
      );
      expect(result).toBe("I love the *<https://example.com|Example Site>*.");
    });
  });
});
