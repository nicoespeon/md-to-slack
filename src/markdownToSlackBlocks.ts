import { Token, Tokens } from "marked";
import {
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
function toStandaloneBlock(token: Token): SlackBlock | undefined {
  return isTable(token) ? toTableBlock(token) : undefined;
}

function isTable(token: Token): token is Tokens.Table {
  return token.type === "table";
}

const MAX_TABLE_ROWS = 100;
const MAX_TABLE_COLUMNS = 20;
const MAX_TABLE_TEXT_LENGTH = 10_000;

function toTableBlock(token: Tokens.Table): TableBlock | undefined {
  const rows = [token.header, ...token.rows].map((row) =>
    row.map((cell) => toRawText(renderPlainText(cell.tokens))),
  );
  const textLength = rows
    .flat()
    .reduce((length, cell) => length + cell.text.length, 0);
  const fitsInTable =
    rows.length <= MAX_TABLE_ROWS &&
    token.align.length <= MAX_TABLE_COLUMNS &&
    textLength <= MAX_TABLE_TEXT_LENGTH;

  if (!fitsInTable) {
    return undefined;
  }

  const hasAlignedColumn = token.align.some((align) => align !== null);
  return hasAlignedColumn
    ? {
        type: "table",
        rows,
        column_settings: token.align.map((align) => ({
          align: align ?? "left",
        })),
      }
    : { type: "table", rows };
}

function toRawText(text: string): RawText {
  // Slack needs at least 1 character in a cell.
  return { type: "raw_text", text: text || " " };
}

function groupConsecutiveText(tokens: Token[]) {
  return tokens.reduce<TokenGroup[]>((groups, token) => {
    const block = toStandaloneBlock(token);
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

export type SlackBlock = SectionBlock | TableBlock;

type SectionBlock = { type: "section"; text: MrkdwnText };

type MrkdwnText = { type: "mrkdwn"; text: string };

type TableBlock = {
  type: "table";
  rows: RawText[][];
  column_settings?: ColumnSettings[];
};

type ColumnSettings = { align: "left" | "center" | "right" };

type RawText = { type: "raw_text"; text: string };
