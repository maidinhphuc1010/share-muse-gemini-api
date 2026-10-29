export type PromptPair = { vietnamese: string; english: string };
export type ScriptScene = { number: number; heading: string; content: string };

export function normalizeMarkdown(content: string) {
  return content
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\|/g, "|");
}

export function findPromptPair(content: string): PromptPair | null {
  const lines = content.split("\n");
  let current: "vietnamese" | "english" | null = null;
  const blocks: PromptPair = { vietnamese: "", english: "" };
  let foundVietnamese = false;
  let foundEnglish = false;
  let fence = false;
  for (const line of lines) {
    const normalized = line
      .trim()
      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)/, "")
      .replace(/^#{1,6}\s*/, "")
      .replace(/[*_`]/g, "");
    if (/^(?:prompt\s*)?(?:tiếng việt|vietnamese)(?:\s+prompt)?\s*:?$/i.test(normalized)) {
      current = "vietnamese";
      foundVietnamese = true;
      continue;
    }
    if (/^(?:english\s*prompt|prompt\s*(?:in\s*)?english|tiếng anh(?:\s+prompt)?)\s*:?$/i.test(normalized)) {
      current = "english";
      foundEnglish = true;
      continue;
    }
    if (/^```/.test(line)) {
      fence = !fence;
      continue;
    }
    if (current && (!fence || line.trim())) blocks[current] += `${line}\n`;
  }
  blocks.vietnamese = blocks.vietnamese.trim();
  blocks.english = blocks.english.trim();
  return foundVietnamese && foundEnglish && blocks.vietnamese && blocks.english
    ? blocks
    : null;
}

export function findScriptTitle(content: string) {
  for (const line of content.split("\n")) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match && /kịch bản|script|storyboard/i.test(match[1])) return match[1].trim();
  }
  return null;
}

export function findScriptScenes(content: string): ScriptScene[] {
  const scenes: ScriptScene[] = [];
  let current: ScriptScene | null = null;
  for (const line of content.split("\n")) {
    if (/^\s*\|/.test(line) || /^\s*[-*+]\s*\|/.test(line)) continue;
    const match = line.match(/^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:(?:Cảnh|Scene)\s*(?:\d+|[A-Z-]+)[^\n]*|\d+[.)]\s*Cảnh[^\n]*)(?:\*\*)?\s*$/i);
    if (match) {
      if (current?.content.trim()) scenes.push(current);
      current = { number: scenes.length + 1, heading: line.replace(/^\s*#+\s*/, "").replace(/\*\*/g, "").trim(), content: "" };
    } else if (current) current.content += `${line}\n`;
  }
  if (current?.content.trim()) scenes.push(current);
  return scenes;
}
