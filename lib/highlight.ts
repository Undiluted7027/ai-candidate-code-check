import { codeToTokens } from "shiki";
import type { BundledLanguage } from "shiki";
import type { Challenge, HighlightedLine } from "@/lib/types";

const languageMap: Record<string, BundledLanguage> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  java: "java",
  go: "go"
};

function normalizeLanguage(language: string): BundledLanguage {
  return languageMap[language] || (language as BundledLanguage);
}

export async function highlightCode(code: string, language: string): Promise<HighlightedLine[]> {
  const result = await codeToTokens(code, {
    lang: normalizeLanguage(language),
    theme: "github-light"
  });

  const rawLines = code.split("\n");

  return rawLines.map((line, index) => {
    const tokens = result.tokens[index] || [];

    return {
      number: index + 1,
      tokens:
        tokens.length > 0
          ? tokens.map((token) => ({
              content: token.content,
              color: token.color,
              fontStyle: token.fontStyle
            }))
          : [{ content: line || " " }]
    };
  });
}

export async function highlightChallenge(challenge: Challenge): Promise<Challenge> {
  const files = await Promise.all(
    challenge.files.map(async (file) => ({
      ...file,
      highlightedLines: await highlightCode(file.code, file.language)
    }))
  );

  return {
    ...challenge,
    files
  };
}
