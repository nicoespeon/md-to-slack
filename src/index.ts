import { marked, MarkedExtension, Token } from "marked";

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
    return `\`\`\`${token.lang ?? ""}\n${text}\n\`\`\``;
  },

  blockquote(token) {
    return token.tokens
      .map((t) => ("> " + this.parser.parse([t])).trim())
      .join("\n");
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
          if (t.type === "text" && "tokens" in t && t.tokens) {
            // Text tokens may have inline children (bold, links, etc.)
            return this.parser.parseInline(t.tokens);
          } else if (t.type === "space") {
            const isBeforeNestedList = itemTokens[i + 1]?.type === "list";
            return isBeforeNestedList ? "" : t.raw;
          } else if (t.type === "list") {
            return `\n${indent(this.parser.parse([t]))}`;
          }
          return this.parser.parse([t]);
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

    return items.join("\n");
  },

  listitem() {
    return "";
  },

  checkbox() {
    return "";
  },

  paragraph(token) {
    return this.parser.parseInline(token.tokens);
  },

  table() {
    return "";
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

// Slack doesn't render bold nested in bold.
function unwrapBold(tokens: Token[]) {
  return unwrap(tokens, ["strong"]);
}

function indent(text: string) {
  return text.replace(/^/gm, "  ");
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
