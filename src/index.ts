import {
  marked,
  MarkedExtension,
  Parser,
  TextRenderer,
  Token,
  Tokens,
} from "marked";

/**
 * Docs: https://marked.js.org/using_pro#renderer
 * HTML implementation example: https://github.com/markedjs/marked/blob/aa7a8a2b8944c00b2de8f4093a90a9990a2d6391/src/Renderer.ts#L14
 */
const renderer = {
  // #region Block-level renderers

  space(token) {
    return token.raw;
  },

  code(token) {
    const text = token.text.replace(/\n$/, "");
    const codeBlock = `\`\`\`${token.lang ?? ""}\n${text}\n\`\`\``;
    return endLineIfDirectlyFollowed(token, codeBlock);
  },

  blockquote(token) {
    const quote = token.tokens
      .map((t) => ("> " + this.parser.parse([t])).trim())
      .join("\n");
    return endLineIfDirectlyFollowed(token, quote);
  },

  html(token) {
    return token.text
      .replace(/<br\s*\/{0,1}>/g, "\n")
      .replace(/<\/{0,1}del>/g, "~")
      .replace(/<\/{0,1}s>/g, "~")
      .replace(/<\/{0,1}strike>/g, "~");
  },

  heading(token) {
    // Since marked 18, a blank line after a heading is its own space token.
    const isFollowedByBlankLine = !token.raw.endsWith("\n");
    const text = this.parser.parseInline(unwrapBold(token.tokens));
    const boldText = text ? `*${text}*` : "";
    return isFollowedByBlankLine ? boldText : `${boldText}\n\n`;
  },

  hr(token) {
    return token.raw;
  },

  list(token) {
    // The item separates its own blocks, so a block must not end its own line.
    const parseBlock = (block: Token) =>
      this.parser.parse([block]).replace(/\n$/, "");

    /**
     * Parse list item content, handling both inline formatting and nested blocks.
     * For text with inline formatting (bold, italic, links), we need parseInline.
     * For nested lists or other block elements, we use parse.
     */
    const parseItemContent = (
      itemTokens: (typeof token.items)[0]["tokens"],
    ) => {
      // Process text tokens' inline children for proper formatting
      return itemTokens
        .map((t, i) => {
          if (t.type === "space") {
            const isBeforeNestedList = itemTokens[i + 1]?.type === "list";
            return isBeforeNestedList ? "" : t.raw;
          } else if (t.type === "list") {
            return `\n${indent(parseBlock(t))}`;
          } else if (t.type === "html") {
            // An HTML block renders its own line breaks.
            return this.parser.parse([t]);
          }

          const isParagraph = t.type === "paragraph" || t.type === "text";
          // Text tokens may have inline children (bold, links, etc.)
          // Paragraphs go inline too: the item separates its own blocks.
          const block =
            isParagraph && "tokens" in t && t.tokens
              ? this.parser.parseInline(t.tokens)
              : parseBlock(t);

          const previous = itemTokens[i - 1];
          const continuesMarkerLine = !previous || previous.type === "checkbox";
          if (continuesMarkerLine) {
            return block;
          }

          const indented = isParagraph ? indent(block) : block;
          return previous.type === "space" ? indented : `\n${indented}`;
        })
        .join("");
    };

    const items = token.ordered
      ? token.items.map(
          (item, i) =>
            `${Number(token.start) + i}. ${parseItemContent(item.tokens)}`,
        )
      : token.items.map((item) => {
          const marker = item.task ? (item.checked ? "☒" : "☐") : "-";
          return `${marker} ${parseItemContent(item.tokens)}`;
        });

    return endLineIfDirectlyFollowed(token, items.join("\n"));
  },

  listitem() {
    return "";
  },

  checkbox() {
    return "";
  },

  paragraph(token) {
    const text = this.parser.parseInline(token.tokens);

    // No blank line after the paragraph: keep the next block off its last line.
    return endLineIfDirectlyFollowed(token, text);
  },

  table(token) {
    const rows = [token.header, ...token.rows].map((row) =>
      row.map((cell) => toPlainText(cell.tokens, this.parser)),
    );
    const columnWidths = token.align.map((_, column) =>
      Math.max(...rows.map((row) => row[column].length)),
    );
    const [header, ...body] = rows.map((row) =>
      row
        .map((cell, column) =>
          pad(cell, columnWidths[column], token.align[column]),
        )
        .join(" | ")
        .trimEnd(),
    );
    const separator = columnWidths
      .map((width) => "-".repeat(width))
      .join("-|-");

    // Escaped after padding: Slack displays an entity as a single character.
    const lines = [header, separator, ...body].map((line) =>
      this.text({ type: "text", raw: line, text: line }),
    );

    const codeBlock = ["```", ...lines, "```"].join("\n");

    // No blank line after the table: keep the next block off the fence line.
    return endLineIfDirectlyFollowed(token, codeBlock);
  },

  tablerow() {
    return "";
  },

  tablecell() {
    return "";
  },

  // #endregion

  // #region Inline-level renderers

  strong(token) {
    const text = this.parser.parseInline(token.tokens);
    return `*${text}*`;
  },

  em(token) {
    const text = this.parser.parseInline(token.tokens);
    return `_${text}_`;
  },

  codespan(token) {
    return token.raw;
  },

  br() {
    return "";
  },

  del(token) {
    const text = this.parser.parseInline(token.tokens);
    return `~${text}~`;
  },

  link(token) {
    const text = this.parser.parseInline(unwrapLinksAndImages(token.tokens));
    const url = cleanUrl(token.href);

    return url === text || url === `mailto:${text}` || !text
      ? `<${url}>`
      : `<${url}|${text}>`;
  },

  image(token) {
    // mrkdwn can't display images, so we link to them. Use Slack Block Kit to show them.
    const url = cleanUrl(token.href);
    const altText = this.parser.parseInline(unwrapLinksAndImages(token.tokens));

    return altText ? `<${url}|${altText}>` : `<${url}>`;
  },

  text(token) {
    return (
      token.text
        // Escaped characters: https://api.slack.com/reference/surfaces/formatting#escaping
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
    );
  },

  // #endregion
} satisfies MarkedExtension["renderer"];

function endLineIfDirectlyFollowed(token: Token, block: string) {
  const isDirectlyFollowedByBlock = token.raw.endsWith("\n");
  return isDirectlyFollowedByBlock ? `${block}\n` : block;
}

// Slack doesn't render bold nested in bold.
function unwrapBold(tokens: Token[]) {
  return unwrap(tokens, ["strong"]);
}

function indent(text: string) {
  return text
    .split("\n")
    .reduce<{ lines: string[]; isInCode: boolean }>(
      ({ lines, isInCode }, line) => {
        // Indenting a code block would add spaces to the code itself.
        const isCode = isInCode || line.startsWith("```");
        const isIndented = !isCode && line !== "";
        // A fence can open on a marker's line, when code starts an item.
        const isFence = line.split("```").length === 2;
        return {
          lines: [...lines, isIndented ? `  ${line}` : line],
          isInCode: isFence ? !isInCode : isInCode,
        };
      },
      { lines: [], isInCode: false },
    )
    .lines.join("\n");
}

function pad(text: string, width: number, alignment: ColumnAlignment) {
  const padByAlignment = {
    left: () => text.padEnd(width),
    right: () => text.padStart(width),
    center: () =>
      text
        .padStart(text.length + Math.floor((width - text.length) / 2))
        .padEnd(width),
  } satisfies Record<NonNullable<ColumnAlignment>, () => string>;

  return padByAlignment[alignment ?? "left"]();
}

type ColumnAlignment = Tokens.Table["align"][number];

function toPlainText(tokens: Token[], parser: Parser) {
  const plainTextRenderer: TextRenderer = Object.assign(new TextRenderer(), {
    parser,
    link(token: Tokens.Link) {
      const text = parser.parseInline(token.tokens, plainTextRenderer);
      const url = cleanUrl(token.href);

      return url === text || url === `mailto:${text}` || !text
        ? url
        : `${text} (${url})`;
    },
  });

  return parser.parseInline(tokens, plainTextRenderer);
}

function cleanUrl(href: string) {
  try {
    return encodeURI(href).replace(/%25/g, "%");
  } catch {
    return href;
  }
}

// Slack can't parse a link nested in another one.
function unwrapLinksAndImages(tokens: Token[]) {
  return unwrap(tokens, ["link", "image"]);
}

function unwrap(tokens: Token[], types: Token["type"][]): Token[] {
  return tokens.flatMap((token) => {
    if (!("tokens" in token) || !token.tokens) {
      return [token];
    }

    const children = unwrap(token.tokens, types);
    return types.includes(token.type)
      ? children
      : [{ ...token, tokens: children }];
  });
}

marked.use({ renderer });

export function markdownToSlack(markdown: string): string {
  return marked
    .parse(markdown, {
      // Available options: https://marked.js.org/using_advanced#options
      async: false,
      gfm: true,
    })
    .trimEnd();
}
