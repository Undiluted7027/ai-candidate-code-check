import type {
  CandidateComment,
  Category,
  CategoryScore,
  Challenge,
  IssueMatch,
  RubricIssue,
  Scorecard,
  Severity,
  SummaryResponse
} from "@/lib/types";

const categories: Category[] = ["security", "correctness", "testing", "maintainability", "reasoning"];

const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return Math.max(aStart, bStart) <= Math.min(aEnd, bEnd);
}

function distanceFromRange(issue: RubricIssue, comment: CandidateComment) {
  if (rangesOverlap(issue.lineStart, issue.lineEnd, comment.lineStart, comment.lineEnd)) {
    return 0;
  }

  if (comment.lineEnd < issue.lineStart) {
    return issue.lineStart - comment.lineEnd;
  }

  return comment.lineStart - issue.lineEnd;
}

function commentMentionsEvidence(comment: CandidateComment, issue: RubricIssue) {
  const text = comment.body.toLowerCase();
  const signalWordsByIssue: Record<string, string[]> = {
    "tenant-auth": ["tenant", "project", "belongs", "membership", "scope", "authorization"],
    "path-traversal": ["filename", "path", "travers", "object key", "collision", "originalname"],
    "file-validation": ["mime", "size", "validation", "extension", "content", "limit"],
    "pii-logging": ["log", "email", "redact", "sensitive", "pii", "structured"],
    "success-before-durability": ["before", "201", "success", "durable", "rename", "database", "insert"],
    "overwrite-idempotency": ["overwrite", "collision", "retry", "idempot", "version", "same name"],
    "happy-path-tests": ["test", "happy path", "unauthorized", "failure", "oversized", "case"],
    "vampi-bola": ["owner", "ownership", "book", "secret", "idor", "authorization", "object"],
    "vampi-static-secret": ["secret", "jwt", "token", "hardcoded", "expiry", "expiration", "signing"],
    "vampi-user-enumeration": ["users", "email", "password", "admin", "enumeration", "exposure", "public"],
    "vampi-mass-assignment": ["admin", "mass assignment", "role", "payload", "allowlist", "is_admin"],
    "vampi-sql-injection": ["sql", "injection", "query", "parameterized", "title", "f-string"],
    "vampi-negative-tests": ["test", "negative", "unauthorized", "forbidden", "injection", "ownership", "case"],
    "java-xxe-doctype": ["xxe", "doctype", "external entity", "entity", "documentbuilderfactory", "secure processing"],
    "java-xml-size-dos": ["size", "limit", "payload", "billion laughs", "entity expansion", "dos", "timeout"],
    "java-error-disclosure": ["error", "exception", "stack", "message", "leak", "disclosure", "printstacktrace"],
    "java-transformer-hardening": ["transformer", "external stylesheet", "access_external", "secure processing", "feature"],
    "java-content-type": ["content-type", "xml", "form", "validation", "media type", "inputxml"],
    "java-xml-tests": ["test", "xxe", "doctype", "large", "malformed", "negative", "case"],
    "go-command-injection-shell": ["command", "injection", "shell", "sh -c", "exec", "host", "count"],
    "go-unbounded-process": ["timeout", "context", "hang", "count", "unbounded", "process", "resource"],
    "go-weak-admin-token": ["admin", "token", "hardcoded", "default", "auth", "secret", "header"],
    "go-network-recon": ["ssrf", "network", "scan", "internal", "allowlist", "host", "recon"],
    "go-output-disclosure": ["output", "stderr", "raw", "leak", "internal", "error"],
    "go-negative-tests": ["test", "injection", "timeout", "unauthorized", "internal", "negative", "case"]
  };

  return (signalWordsByIssue[issue.id] || []).some((word) => text.includes(word));
}

function scoreIssue(issue: RubricIssue, comments: CandidateComment[]): IssueMatch {
  const sameFileComments = comments.filter((comment) => comment.filePath === issue.filePath);
  const exactCandidates = sameFileComments.filter((comment) =>
    rangesOverlap(issue.lineStart, issue.lineEnd, comment.lineStart, comment.lineEnd)
  );
  const nearbyCandidates = sameFileComments.filter((comment) => distanceFromRange(issue, comment) <= 4);

  const exactWithEvidence = exactCandidates.find((comment) => {
    const categoryMatches = comment.category === issue.category;
    const severityClose = Math.abs(severityRank[comment.severity] - severityRank[issue.severity]) <= 1;
    return categoryMatches && severityClose && commentMentionsEvidence(comment, issue);
  });

  if (exactWithEvidence) {
    return {
      issue,
      status: "caught",
      matchedCommentIds: [exactWithEvidence.id],
      awarded: issue.weight
    };
  }

  const partial = [...exactCandidates, ...nearbyCandidates].find((comment) => {
    const categoryRelated = comment.category === issue.category || commentMentionsEvidence(comment, issue);
    return categoryRelated && comment.body.trim().length >= 24;
  });

  if (partial) {
    return {
      issue,
      status: "partial",
      matchedCommentIds: [partial.id],
      awarded: Math.round(issue.weight * 0.45)
    };
  }

  return {
    issue,
    status: "missed",
    matchedCommentIds: [],
    awarded: 0
  };
}

export function scoreAttempt(challenge: Challenge, comments: CandidateComment[]): Scorecard {
  const issueMatches = challenge.rubric.map((issue) => scoreIssue(issue, comments));
  const possible = challenge.rubric.reduce((total, issue) => total + issue.weight, 0);
  const earned = issueMatches.reduce((total, match) => total + match.awarded, 0);
  const categoryScores: CategoryScore[] = categories.map((category) => {
    const matches = issueMatches.filter((match) => match.issue.category === category);
    const categoryPossible = matches.reduce((total, match) => total + match.issue.weight, 0);
    const score = matches.reduce((total, match) => total + match.awarded, 0);

    return {
      category,
      score,
      possible: categoryPossible,
      percentage: categoryPossible === 0 ? 0 : Math.round((score / categoryPossible) * 100)
    };
  });

  return {
    overall: Math.round((earned / possible) * 100),
    earned,
    possible,
    caught: issueMatches.filter((match) => match.status === "caught").length,
    partial: issueMatches.filter((match) => match.status === "partial").length,
    missed: issueMatches.filter((match) => match.status === "missed").length,
    categoryScores,
    issueMatches
  };
}

export function buildFallbackSummary(candidateName: string, scorecard: Scorecard): SummaryResponse {
  const totalIssues = scorecard.issueMatches.length || scorecard.caught + scorecard.partial + scorecard.missed;
  const missedCritical = scorecard.issueMatches.filter(
    (match) => match.status === "missed" && (match.issue.severity === "critical" || match.issue.severity === "high")
  );
  const caughtTitles = scorecard.issueMatches
    .filter((match) => match.status === "caught")
    .slice(0, 3)
    .map((match) => match.issue.title.toLowerCase());
  const missedTitles = scorecard.issueMatches
    .filter((match) => match.status === "missed")
    .slice(0, 2)
    .map((match) => match.issue.title.toLowerCase());

  return {
    summary: `${candidateName} showed strong practical review instincts, catching ${scorecard.caught} of ${totalIssues} seeded risks for a ${scorecard.overall}% ProveIt score. The result indicates useful production judgment, with follow-up needed on ${missedCritical.length > 0 ? "high-severity missed risks" : "depth and prioritization"}.`,
    strengths:
      caughtTitles.length > 0
        ? caughtTitles.map((title) => `Identified ${title}.`)
        : ["Submitted specific review notes tied to production behavior."],
    risks:
      missedTitles.length > 0
        ? missedTitles.map((title) => `Missed or underweighted ${title}.`)
        : ["Needs deeper evidence in a longer assessment."],
    missedRiskExplanation:
      missedCritical.length > 0
        ? `The most important gap is ${missedCritical[0].issue.title.toLowerCase()}, which can create real production exposure despite the code looking plausible.`
        : "No critical seeded issue was fully missed, but partial findings should be probed for implementation depth.",
    followUps: [
      "How would you redesign the upload path so tenants cannot access each other's contractor documents?",
      "Which tests would you write first before approving this endpoint?",
      "What would you change in the storage model to make retries safe?"
    ],
    source: "fallback"
  };
}
