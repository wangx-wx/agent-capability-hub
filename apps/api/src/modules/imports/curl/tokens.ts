export function curlTokens(text: string) {
  const tokens: string[] = [];
  let token = "";
  let active = false;
  let quote = "";
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (quote === "'") {
      if (character === "'") quote = "";
      else token += character;
      continue;
    }
    if (character === "\\") {
      const next = text[++index];
      if (next === undefined) throw new Error("Incomplete cURL escape");
      if (next === "\n") continue;
      if (next === "\r" && text[index + 1] === "\n") { index++; continue; }
      token += quote === '"' && !['"', "\\", "$", "`"].includes(next) ? `\\${next}` : next;
      active = true;
      continue;
    }
    if (character === "$" && /[A-Za-z0-9_{(]/.test(text[index + 1] ?? "")) throw new Error("cURL variables and command substitutions must be replaced with explicit values");
    if (character === "`") throw new Error("cURL command substitution is unsupported");
    if (quote === '"') {
      if (character === '"') quote = "";
      else token += character;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; active = true; continue; }
    if (";|&<>()".includes(character)) throw new Error("Only a single cURL command without shell operators is supported");
    if (/\s/.test(character)) {
      if (active) tokens.push(token);
      token = ""; active = false;
    } else { token += character; active = true; }
  }
  if (quote) throw new Error("Unclosed cURL quote");
  if (active) tokens.push(token);
  if (tokens.shift() !== "curl") throw new Error("Input must be one cURL command");
  return tokens;
}
