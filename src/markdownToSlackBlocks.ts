import { Token, Tokens } from "marked";
import {
  cleanUrl,
  lexMarkdown,
  renderMrkdwn,
  renderPlainText,
} from "./markdownToSlack.js";

export function markdownToSlackBlocks(markdown: string): SlackBlock[] {
  return groupConsecutiveText(lexMarkdown(markdown)).flatMap((group) =>
    group.kind === "text" ? toSections(group.tokens) : [group.block],
  );
}

// The one place that gives a top-level token its own block, out of the text.
function toStandaloneBlock(
  token: Token,
  precedingBlocks: SlackBlock[],
): SlackBlock | undefined {
  if (isHeading(token) && token.depth <= MAX_HEADER_DEPTH) {
    return toHeader(token);
  }

  if (isTable(token)) {
    return toTableBlock(token, precedingBlocks);
  }

  return token.type === "hr" ? { type: "divider" } : toImageBlock(token);
}

function toImageBlock(token: Token): ImageBlock | undefined {
  if (token.type !== "paragraph" || !("tokens" in token) || !token.tokens) {
    return undefined;
  }

  const [image, ...otherTokens] = token.tokens.filter(
    ({ raw }) => raw.trim() !== "",
  );
  if (!image || !isImage(image) || otherTokens.length > 0) {
    return undefined;
  }

  // marked leaves the entities of a URL as written: fine in mrkdwn, not here.
  const url = cleanUrl(image.href.replaceAll("&amp;", "&"));
  const isAcceptedBySlack =
    /^https?:\/\//i.test(url) && url.length <= MAX_IMAGE_URL_LENGTH;
  if (!isAcceptedBySlack) {
    return undefined;
  }

  const altText = toPlainText(image.tokens) || image.title || "Image";

  return {
    type: "image",
    image_url: url,
    alt_text: altText.slice(0, MAX_IMAGE_ALT_TEXT_LENGTH),
  };
}

const MAX_IMAGE_URL_LENGTH = 3000;
const MAX_IMAGE_ALT_TEXT_LENGTH = 2000;

function isImage(token: Token): token is Tokens.Image {
  return token.type === "image";
}

function isHeading(token: Token): token is Tokens.Heading {
  return token.type === "heading";
}

const MAX_HEADER_DEPTH = 2;
const MAX_HEADER_TEXT_LENGTH = 150;

function toHeader(heading: Tokens.Heading): HeaderBlock | undefined {
  const text = toPlainText(heading.tokens);
  return text.length >= 1 && text.length <= MAX_HEADER_TEXT_LENGTH
    ? { type: "header", text: { type: "plain_text", text } }
    : undefined;
}

function toPlainText(tokens: Token[]): string {
  return tokens
    .map((token) => {
      if ("tokens" in token && token.tokens) {
        return toPlainText(token.tokens);
      }

      return "text" in token && typeof token.text === "string"
        ? token.text
        : "";
    })
    .join("");
}

function isTable(token: Token): token is Tokens.Table {
  return token.type === "table";
}

const MAX_TABLE_ROWS = 100;
const MAX_TABLE_COLUMNS = 20;
const MAX_TABLE_TEXT_LENGTH = 10_000;

function toTableBlock(
  token: Tokens.Table,
  precedingBlocks: SlackBlock[],
): TableBlock | undefined {
  const rows = [token.header, ...token.rows].map((row) =>
    row.map((cell) => toRawText(renderPlainText(cell.tokens))),
  );
  const hasAlignedColumn = token.align.some((align) => align !== null);
  const table: TableBlock = hasAlignedColumn
    ? {
        type: "table",
        rows,
        column_settings: token.align.map((align) => ({
          align: align ?? "left",
        })),
      }
    : { type: "table", rows };

  // Slack caps the text of all the tables of a message, not of each table.
  const fitsInMessage =
    rows.length <= MAX_TABLE_ROWS &&
    token.align.length <= MAX_TABLE_COLUMNS &&
    countTableText([...precedingBlocks, table]) <= MAX_TABLE_TEXT_LENGTH;

  return fitsInMessage ? table : undefined;
}

function countTableText(blocks: SlackBlock[]) {
  return blocks
    .flatMap((block) => (block.type === "table" ? block.rows.flat() : []))
    .reduce((length, cell) => length + cell.text.length, 0);
}

function toRawText(text: string): RawText {
  // Slack needs at least 1 character in a cell.
  return { type: "raw_text", text: text || " " };
}

function groupConsecutiveText(tokens: Token[]) {
  return tokens.reduce<TokenGroup[]>((groups, token) => {
    const precedingBlocks = groups.flatMap((group) =>
      group.kind === "standalone" ? [group.block] : [],
    );
    const block = toStandaloneBlock(token, precedingBlocks);
    if (block) {
      return [...groups, { kind: "standalone", block }];
    }

    const lastGroup = groups.at(-1);
    return lastGroup?.kind === "text"
      ? [
          ...groups.slice(0, -1),
          { kind: "text", tokens: [...lastGroup.tokens, token] },
        ]
      : [...groups, { kind: "text", tokens: [token] }];
  }, []);
}

type TokenGroup =
  | { kind: "text"; tokens: Token[] }
  | { kind: "standalone"; block: SlackBlock };

const MAX_SECTION_TEXT_LENGTH = 3000;

function toSections(tokens: Token[]) {
  const markdownBlocks = tokens.map((token) => ({
    token,
    mrkdwn: renderMrkdwn([token]),
  }));

  return packGreedily(markdownBlocks, (group) =>
    fitsInSection(joinBlocks(group)),
  )
    .flatMap((group) => {
      const text = joinBlocks(group);
      return fitsInSection(text) ? [text] : group.flatMap(splitBlock);
    })
    .filter((text) => text !== "")
    .map(toSection);
}

type MarkdownBlock = { token: Token; mrkdwn: string };

function fitsInSection(text: string) {
  return text.length <= MAX_SECTION_TEXT_LENGTH;
}

function splitBlock({ token, mrkdwn }: MarkdownBlock) {
  const text = trimBlankLines(mrkdwn);
  // mrkdwn has no tables: the renderer draws them in a code block.
  const isRenderedAsCodeBlock = token.type === "code" || token.type === "table";

  return isRenderedAsCodeBlock
    ? splitCodeBlock(text)
    : splitOnLines(text.split("\n"), MAX_SECTION_TEXT_LENGTH).map(
        trimBlankLines,
      );
}

const CODE_FENCE = "```";

function splitCodeBlock(codeBlock: string) {
  const [openingFence, ...codeLines] = codeBlock.split("\n").slice(0, -1);
  const fence = (code: string) => [openingFence, code, CODE_FENCE].join("\n");
  const maxCodeLength = MAX_SECTION_TEXT_LENGTH - fence("").length;

  return splitOnLines(codeLines, maxCodeLength).map(fence);
}

function splitOnLines(lines: string[], maxLength: number) {
  return packGreedily(
    lines.flatMap((line) => cutLine(line, maxLength)),
    (group) => group.join("\n").length <= maxLength,
  ).map((group) => group.join("\n"));
}

function cutLine(line: string, maxLength: number) {
  const pieceCount = Math.max(1, Math.ceil(line.length / maxLength));
  return Array.from({ length: pieceCount }, (_, index) =>
    line.slice(index * maxLength, (index + 1) * maxLength),
  );
}

function joinBlocks(blocks: MarkdownBlock[]) {
  return trimBlankLines(blocks.map(({ mrkdwn }) => mrkdwn).join(""));
}

function trimBlankLines(text: string) {
  return text.replace(/^(?:[ \t]*\n)+/, "").trimEnd();
}

function packGreedily<T>(items: T[], fits: (group: T[]) => boolean): T[][] {
  return items.reduce<T[][]>((groups, item) => {
    const extendedLastGroup = [...(groups.at(-1) ?? []), item];
    return groups.length > 0 && fits(extendedLastGroup)
      ? [...groups.slice(0, -1), extendedLastGroup]
      : [...groups, [item]];
  }, []);
}

function toSection(text: string): SectionBlock {
  return { type: "section", text: { type: "mrkdwn", text } };
}

export type SlackBlock =
  | SectionBlock
  | HeaderBlock
  | DividerBlock
  | ImageBlock
  | TableBlock;

type SectionBlock = { type: "section"; text: MrkdwnText };

type MrkdwnText = { type: "mrkdwn"; text: string };

type HeaderBlock = { type: "header"; text: PlainText };

type PlainText = { type: "plain_text"; text: string };

type DividerBlock = { type: "divider" };

type ImageBlock = { type: "image"; image_url: string; alt_text: string };

type TableBlock = {
  type: "table";
  rows: RawText[][];
  column_settings?: ColumnSettings[];
};

type ColumnSettings = { align: "left" | "center" | "right" };

type RawText = { type: "raw_text"; text: string };
