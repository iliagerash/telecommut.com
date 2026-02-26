function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function hasHtmlTags(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function stripTrailingEmptyHtmlBlocks(value: string): string {
  let output = value;
  const trailingEmptyBlock =
    /(?:\s|&nbsp;|&#160;)*(?:<p|div)(?:\s[^>]*)?>(?:\s|&nbsp;|&#160;|<br\s*\/?>)*<\/(?:p|div)>(?:\s|&nbsp;|&#160;)*$/i;

  while (trailingEmptyBlock.test(output)) {
    output = output.replace(trailingEmptyBlock, "").trimEnd();
  }

  return output.replace(/(?:\s|&nbsp;|&#160;|<br\s*\/?>)+$/gi, "").trimEnd();
}

export function formatDescriptionHtml(value: string | null | undefined): string {
  const input = String(value ?? "").trim();
  if (!input) {
    return "";
  }

  if (hasHtmlTags(input)) {
    return stripTrailingEmptyHtmlBlocks(input);
  }

  return escapeHtml(input).replaceAll(/\r\n|\r|\n/g, "<br />");
}
