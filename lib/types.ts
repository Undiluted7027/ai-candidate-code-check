export type Severity = "critical" | "high" | "medium" | "low";

export type Category = "security" | "correctness" | "testing" | "maintainability" | "reasoning";

export type ChallengeFile = {
  path: string;
  language: string;
  code: string;
};

export type RubricIssue = {
  id: string;
  title: string;
  category: Category;
  severity: Severity;
  weight: number;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  expectedEvidence: string;
  seniorSignal: string;
};

export type CandidateComment = {
  id: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  category: Category;
  severity: Severity;
  body: string;
};

export type CandidateProfile = {
  name: string;
  role: string;
  assessment: string;
  submittedAt: string;
};

export type Challenge = {
  id: string;
  title: string;
  scenario: string;
  role: string;
  timeboxMinutes: number;
  files: ChallengeFile[];
  rubric: RubricIssue[];
};

export type CandidateReplay = {
  candidate: CandidateProfile;
  comments: CandidateComment[];
};

export type IssueMatchStatus = "caught" | "partial" | "missed";

export type IssueMatch = {
  issue: RubricIssue;
  status: IssueMatchStatus;
  matchedCommentIds: string[];
  awarded: number;
};

export type CategoryScore = {
  category: Category;
  score: number;
  possible: number;
  percentage: number;
};

export type Scorecard = {
  overall: number;
  earned: number;
  possible: number;
  caught: number;
  partial: number;
  missed: number;
  categoryScores: CategoryScore[];
  issueMatches: IssueMatch[];
};

export type SummaryResponse = {
  summary: string;
  strengths: string[];
  risks: string[];
  missedRiskExplanation: string;
  followUps: string[];
  source: "openai" | "fallback";
};
