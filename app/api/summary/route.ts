import { NextResponse } from "next/server";
import { buildFallbackSummary } from "@/lib/scoring";
import type { CandidateComment, CandidateProfile, Challenge, Scorecard, SummaryResponse } from "@/lib/types";

type SummaryRequest = {
  candidate: CandidateProfile;
  challenge: Pick<Challenge, "title" | "scenario" | "role">;
  scorecard: Scorecard;
  comments: CandidateComment[];
};

function fallbackFromRequest(body: SummaryRequest): SummaryResponse {
  return buildFallbackSummary(body.candidate.name, body.scorecard);
}

function parseJsonObject(text: string): Omit<SummaryResponse, "source"> | null {
  try {
    const parsed = JSON.parse(text) as Partial<SummaryResponse>;

    if (
      typeof parsed.summary === "string" &&
      Array.isArray(parsed.strengths) &&
      Array.isArray(parsed.risks) &&
      typeof parsed.missedRiskExplanation === "string" &&
      Array.isArray(parsed.followUps)
    ) {
      return {
        summary: parsed.summary,
        strengths: parsed.strengths.map(String).slice(0, 4),
        risks: parsed.risks.map(String).slice(0, 4),
        missedRiskExplanation: parsed.missedRiskExplanation,
        followUps: parsed.followUps.map(String).slice(0, 4)
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as SummaryRequest;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(fallbackFromRequest(body));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions:
          "You are ProveIt's evaluator assistant. Produce concise, recruiter-ready hiring signal from deterministic assessment results. Do not rescore the candidate. Return only valid JSON.",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `Create an evaluator summary for this assessment. JSON shape: {"summary": string, "strengths": string[], "risks": string[], "missedRiskExplanation": string, "followUps": string[]}. Keep it direct, specific, and under 180 total words.\n\n${JSON.stringify(body, null, 2)}`
              }
            ]
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        },
        max_output_tokens: 700
      })
    });

    if (!response.ok) {
      return NextResponse.json(fallbackFromRequest(body));
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{
          text?: string;
          type?: string;
        }>;
      }>;
    };

    const outputText =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .map((content) => content.text || "")
        .join("")
        .trim() ||
      "";
    const parsed = parseJsonObject(outputText);

    if (!parsed) {
      return NextResponse.json(fallbackFromRequest(body));
    }

    return NextResponse.json({ ...parsed, source: "openai" satisfies SummaryResponse["source"] });
  } catch {
    return NextResponse.json(fallbackFromRequest(body));
  }
}
