"use client";

import {
  ArrowRight,
  BracketsCurly,
  CheckCircle,
  ClipboardText,
  FileCode,
  Lightning,
  ShieldCheck,
  Sparkle,
  WarningCircle,
  XCircle
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { scoreAttempt } from "@/lib/scoring";
import type {
  CandidateComment,
  CandidateReplay,
  Category,
  Challenge,
  ChallengeFile,
  IssueMatchStatus,
  Scorecard,
  Severity,
  SummaryResponse
} from "@/lib/types";

type AppView = "dashboard" | "replay" | "try";

type Props = {
  challenge: Challenge;
  replay: CandidateReplay;
  replayScorecard: Scorecard;
};

const categoryLabels: Record<Category, string> = {
  security: "Security",
  correctness: "Correctness",
  testing: "Testing",
  maintainability: "Maintainability",
  reasoning: "Reasoning"
};

const severityLabels: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low"
};

const categoryOptions: Category[] = ["security", "correctness", "testing", "maintainability", "reasoning"];
const severityOptions: Severity[] = ["critical", "high", "medium", "low"];

function statusCopy(status: IssueMatchStatus) {
  if (status === "caught") return "Caught";
  if (status === "partial") return "Partial";
  return "Missed";
}

function statusStyles(status: IssueMatchStatus) {
  if (status === "caught") return "border-signal/30 bg-signal/10 text-signal";
  if (status === "partial") return "border-amber/30 bg-amber/10 text-amber";
  return "border-risk/30 bg-risk/10 text-risk";
}

function severityStyles(severity: Severity) {
  if (severity === "critical") return "bg-risk text-white";
  if (severity === "high") return "bg-risk/12 text-risk";
  if (severity === "medium") return "bg-amber/14 text-amber";
  return "bg-carbon/8 text-carbon";
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function lineNumbers(file: ChallengeFile) {
  return file.code.split("\n").map((code, index) => ({
    number: index + 1,
    code
  }));
}

function rangeLabel(start: number, end: number) {
  return start === end ? `L${start}` : `L${start}-L${end}`;
}

function ScoreOrb({ score }: { score: number }) {
  return (
    <div className="relative grid size-44 place-items-center rounded-full bg-carbon p-2 shadow-soft">
      <div
        className="absolute inset-2 rounded-full"
        style={{
          background: `conic-gradient(#167a5a ${score * 3.6}deg, rgba(255,255,255,0.12) 0deg)`
        }}
      />
      <div className="relative grid size-32 place-items-center rounded-full bg-paper shadow-insetline">
        <div className="text-center">
          <div className="text-5xl font-semibold tracking-tight text-ink">{score}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-carbon/55">ProveIt</div>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/75 bg-white/58 p-1.5 shadow-soft shadow-carbon/10 backdrop-blur-sm">
      <div className="rounded-[calc(2rem-0.375rem)] border border-carbon/8 bg-white/82 shadow-insetline">{children}</div>
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "dark",
  disabled = false
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "dark" | "light" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={classNames(
        "group inline-flex min-h-11 items-center justify-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "dark" && "bg-ink text-white shadow-[0_16px_36px_-22px_rgba(16,20,24,0.8)]",
        variant === "light" && "border border-carbon/10 bg-white text-ink",
        variant === "ghost" && "bg-transparent text-carbon hover:bg-carbon/6"
      )}
    >
      <span>{children}</span>
      {variant !== "ghost" ? (
        <span
          className={classNames(
            "grid size-7 place-items-center rounded-full transition duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5",
            variant === "dark" ? "bg-white/12 text-white" : "bg-carbon/6 text-ink"
          )}
        >
          <ArrowRight size={15} weight="bold" />
        </span>
      ) : null}
    </button>
  );
}

function Nav({ activeView, setActiveView }: { activeView: AppView; setActiveView: (view: AppView) => void }) {
  const items: Array<{ id: AppView; label: string }> = [
    { id: "dashboard", label: "Evaluator" },
    { id: "replay", label: "Replay" },
    { id: "try", label: "Try Mode" }
  ];

  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <button onClick={() => setActiveView("dashboard")} className="flex w-max items-center gap-3 rounded-full text-left">
        <span className="grid size-11 place-items-center rounded-full bg-ink text-white shadow-[0_18px_35px_-20px_rgba(16,20,24,0.9)]">
          <ShieldCheck size={22} weight="duotone" />
        </span>
        <span>
          <span className="block text-lg font-semibold tracking-tight text-ink">ProveIt</span>
          <span className="block text-xs font-medium uppercase tracking-[0.18em] text-carbon/52">AI Slop Review</span>
        </span>
      </button>

      <nav className="w-full overflow-x-auto rounded-full border border-carbon/8 bg-white/72 p-1 shadow-insetline lg:w-auto">
        <div className="flex min-w-max gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={classNames(
                "rounded-full px-4 py-2 text-sm font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                activeView === item.id ? "bg-ink text-white" : "text-carbon/65 hover:bg-carbon/6 hover:text-ink"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}

function Metric({
  label,
  value,
  subcopy
}: {
  label: string;
  value: string;
  subcopy: string;
}) {
  return (
    <div className="border-t border-carbon/10 pt-5">
      <div className="text-3xl font-semibold tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-sm font-semibold text-carbon">{label}</div>
      <div className="mt-1 text-xs leading-5 text-carbon/58">{subcopy}</div>
    </div>
  );
}

function CategoryBars({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="space-y-4">
      {scorecard.categoryScores
        .filter((item) => item.possible > 0)
        .map((item) => (
          <div key={item.category}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-carbon">{categoryLabels[item.category]}</span>
              <span className="font-mono text-xs text-carbon/58">
                {item.score}/{item.possible}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-carbon/8">
              <div
                className="h-full rounded-full bg-signal transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  );
}

function ScoreFormula({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="rounded-3xl border border-carbon/8 bg-paper/70 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
        <BracketsCurly size={18} weight="duotone" />
        Deterministic score formula
      </div>
      <p className="mt-3 text-sm leading-6 text-carbon/68">
        Each hidden issue has a severity weight. Full credit requires line overlap, matching category, close severity,
        and evidence in the review note. Nearby or incomplete findings receive partial credit.
      </p>
      <div className="mt-4 rounded-2xl px-4 py-3 font-mono text-xs leading-5 text-white/82">
        {scorecard.earned} earned / {scorecard.possible} possible = {scorecard.overall}% ProveIt score
      </div>
    </div>
  );
}

function SummaryPanel({
  challenge,
  candidate,
  comments,
  scorecard
}: {
  challenge: Challenge;
  candidate: CandidateReplay["candidate"];
  comments: CandidateComment[];
  scorecard: Scorecard;
}) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateSummary() {
    setLoading(true);

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate,
          challenge: {
            title: challenge.title,
            scenario: challenge.scenario,
            role: challenge.role
          },
          scorecard,
          comments
        })
      });

      const data = (await response.json()) as SummaryResponse;
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkle size={18} weight="duotone" />
              Evaluator summary
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-carbon/64">
              LLM-generated narrative, grounded in the deterministic scorecard. The score itself is never delegated to
              the model.
            </p>
          </div>
          <Button onClick={generateSummary} disabled={loading} variant="dark">
            {loading ? "Generating" : "Generate summary"}
          </Button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="h-4 w-11/12 animate-pulse rounded-full bg-carbon/10" />
            <div className="h-4 w-9/12 animate-pulse rounded-full bg-carbon/10" />
            <div className="h-4 w-7/12 animate-pulse rounded-full bg-carbon/10" />
          </div>
        ) : summary ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl bg-paper/70 p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-carbon/48">
                {summary.source === "openai" ? "OpenAI summary" : "Fallback summary"}
              </div>
              <p className="text-base leading-7 text-ink">{summary.summary}</p>
              <p className="mt-4 text-sm leading-6 text-carbon/68">{summary.missedRiskExplanation}</p>
            </div>
            <div className="grid gap-3">
              <SignalList title="Strengths" items={summary.strengths} tone="good" />
              <SignalList title="Follow-up questions" items={summary.followUps} tone="neutral" />
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-carbon/14 bg-paper/42 p-5 text-sm leading-6 text-carbon/64">
            Generate a recruiter-ready hiring summary during the demo. Without an API key, ProveIt uses a deterministic
            fallback so the flow still works.
          </div>
        )}
      </div>
    </Shell>
  );
}

function SignalList({ title, items, tone }: { title: string; items: string[]; tone: "good" | "neutral" }) {
  return (
    <div className="rounded-3xl border border-carbon/8 bg-white/72 p-4">
      <div className="text-sm font-semibold text-ink">{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-2 text-sm leading-5 text-carbon/68">
            {tone === "good" ? (
              <CheckCircle className="mt-0.5 shrink-0 text-signal" size={16} weight="fill" />
            ) : (
              <ClipboardText className="mt-0.5 shrink-0 text-carbon/50" size={16} weight="duotone" />
            )}
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Dashboard({
  challenge,
  replay,
  scorecard,
  setActiveView
}: {
  challenge: Challenge;
  replay: CandidateReplay;
  scorecard: Scorecard;
  setActiveView: (view: AppView) => void;
}) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Shell>
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-signal/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-signal">
                Recruiter dashboard
              </span>
              <span className="rounded-full bg-carbon/7 px-3 py-1 text-xs font-semibold text-carbon/62">
                {challenge.timeboxMinutes} min assessment
              </span>
            </div>

            <h1 className="mt-8 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight text-ink sm:text-6xl lg:text-7xl">
              Hire developers who can spot AI slop before it ships.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-carbon/68 sm:text-lg">
              ProveIt turns realistic AI-generated code into a hiring signal. This replay shows whether a candidate can
              catch security, correctness, and testing risks that polished model output hides.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => setActiveView("replay")}>Open assessment replay</Button>
              <Button onClick={() => setActiveView("try")} variant="light">
                Try the review
              </Button>
            </div>
          </div>
        </Shell>

        <Shell>
          <div className="grid gap-7 p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-start xl:flex-row xl:items-center">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-carbon/48">Candidate</div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{replay.candidate.name}</h2>
                <p className="mt-2 text-sm leading-6 text-carbon/65">
                  {replay.candidate.role} candidate, reviewed {challenge.title.toLowerCase()}.
                </p>
              </div>
              <ScoreOrb score={scorecard.overall} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Metric label="Caught" value={String(scorecard.caught)} subcopy="Seeded risks found" />
              <Metric label="Partial" value={String(scorecard.partial)} subcopy="Needs evidence" />
              <Metric label="Missed" value={String(scorecard.missed)} subcopy="Follow-up areas" />
            </div>

            <div className="rounded-3xl bg-ink p-5 text-white">
              <div className="text-sm font-semibold text-white/58">Hiring signal</div>
              <p className="mt-2 text-lg font-semibold leading-7">
                Strong practical reviewer. Probe cross-tenant security depth and operational hardening before final
                offer.
              </p>
            </div>
          </div>
        </Shell>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Shell>
          <div className="p-6">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Skill breakdown</h2>
            <div className="mt-6">
              <CategoryBars scorecard={scorecard} />
            </div>
          </div>
        </Shell>
        <SummaryPanel
          challenge={challenge}
          candidate={replay.candidate}
          comments={replay.comments}
          scorecard={scorecard}
        />
      </section>
    </main>
  );
}

function FileTabs({
  files,
  activePath,
  setActivePath
}: {
  files: ChallengeFile[];
  activePath: string;
  setActivePath: (path: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-carbon/8 bg-white/72 px-3 py-3">
      {files.map((file) => (
        <button
          key={file.path}
          onClick={() => setActivePath(file.path)}
          className={classNames(
            "flex min-w-max items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition duration-300",
            activePath === file.path ? "bg-ink text-white" : "bg-carbon/6 text-carbon/65 hover:bg-carbon/10"
          )}
        >
          <FileCode size={15} weight="duotone" />
          {file.path}
        </button>
      ))}
    </div>
  );
}

function CodeViewer({
  challenge,
  activePath,
  setActivePath,
  scorecard,
  selectedRange,
  onLineClick
}: {
  challenge: Challenge;
  activePath: string;
  setActivePath: (path: string) => void;
  scorecard?: Scorecard;
  selectedRange?: { start: number; end: number } | null;
  onLineClick?: (line: number) => void;
}) {
  const activeFile = challenge.files.find((file) => file.path === activePath) || challenge.files[0];
  const lines = lineNumbers(activeFile);

  function lineStatus(line: number): IssueMatchStatus | null {
    const match = scorecard?.issueMatches.find(
      (item) => item.issue.filePath === activeFile.path && line >= item.issue.lineStart && line <= item.issue.lineEnd
    );
    return match?.status || null;
  }

  function isSelected(line: number) {
    if (!selectedRange) return false;
    const low = Math.min(selectedRange.start, selectedRange.end);
    const high = Math.max(selectedRange.start, selectedRange.end);
    return line >= low && line <= high;
  }

  return (
    <Shell>
      <div className="overflow-hidden">
        <FileTabs files={challenge.files} activePath={activeFile.path} setActivePath={setActivePath} />
        <div className="code-scroll max-h-[680px] overflow-auto p-4 font-mono text-[13px] leading-6 text-white/78">
          {lines.map((line) => {
            const status = lineStatus(line.number);
            return (
              <button
                key={line.number}
                type="button"
                onClick={() => onLineClick?.(line.number)}
                className={classNames(
                  "flex min-w-full items-start rounded-lg px-2 text-left transition duration-300",
                  onLineClick && "cursor-pointer hover:bg-white/8",
                  status === "caught" && "bg-signal/16",
                  status === "partial" && "bg-amber/14",
                  status === "missed" && "bg-risk/14",
                  isSelected(line.number) && "ring-1 ring-white/55"
                )}
              >
                <span className="w-12 shrink-0 select-none pr-4 text-right text-white/38">{line.number}</span>
                <code className="block min-w-0 flex-1 whitespace-pre-wrap break-words text-white/82">
                  {line.code || " "}
                </code>
              </button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

function IssueList({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="space-y-3">
      {scorecard.issueMatches.map((match) => (
        <div key={match.issue.id} className="rounded-3xl border border-carbon/8 bg-white/76 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={classNames("rounded-full border px-2.5 py-1 text-xs font-bold", statusStyles(match.status))}>
              {statusCopy(match.status)}
            </span>
            <span className={classNames("rounded-full px-2.5 py-1 text-xs font-bold", severityStyles(match.issue.severity))}>
              {severityLabels[match.issue.severity]}
            </span>
            <span className="rounded-full bg-carbon/6 px-2.5 py-1 text-xs font-semibold text-carbon/62">
              {categoryLabels[match.issue.category]}
            </span>
            <span className="font-mono text-xs text-carbon/48">
              {rangeLabel(match.issue.lineStart, match.issue.lineEnd)}
            </span>
          </div>
          <h3 className="mt-3 text-base font-semibold tracking-tight text-ink">{match.issue.title}</h3>
          <p className="mt-2 text-sm leading-6 text-carbon/65">{match.issue.expectedEvidence}</p>
          <p className="mt-3 rounded-2xl bg-paper/70 p-3 text-xs leading-5 text-carbon/62">{match.issue.seniorSignal}</p>
        </div>
      ))}
    </div>
  );
}

function CommentList({ comments }: { comments: CandidateComment[] }) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-3xl border border-carbon/8 bg-white/76 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-carbon/7 px-2.5 py-1 font-mono text-xs text-carbon/58">
              {comment.filePath.split("/").at(-1)} {rangeLabel(comment.lineStart, comment.lineEnd)}
            </span>
            <span className="rounded-full bg-signal/10 px-2.5 py-1 text-xs font-semibold text-signal">
              {categoryLabels[comment.category]}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-carbon/72">{comment.body}</p>
        </div>
      ))}
    </div>
  );
}

function Replay({
  challenge,
  replay,
  scorecard,
  setActiveView
}: {
  challenge: Challenge;
  replay: CandidateReplay;
  scorecard: Scorecard;
  setActiveView: (view: AppView) => void;
}) {
  const [activePath, setActivePath] = useState(challenge.files[0].path);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-carbon/48">Challenge replay</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{challenge.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-carbon/67">{challenge.scenario}</p>
        </div>
        <Button onClick={() => setActiveView("try")} variant="light">
          Try it yourself
        </Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <CodeViewer challenge={challenge} activePath={activePath} setActivePath={setActivePath} scorecard={scorecard} />
        <div className="grid gap-6">
          <Shell>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-carbon/52">Replay score</div>
                  <div className="mt-1 text-4xl font-semibold tracking-tight text-ink">{scorecard.overall}%</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl bg-signal/10 px-3 py-2 text-signal">
                    <div className="text-xl font-semibold">{scorecard.caught}</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em]">Caught</div>
                  </div>
                  <div className="rounded-2xl bg-amber/10 px-3 py-2 text-amber">
                    <div className="text-xl font-semibold">{scorecard.partial}</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em]">Partial</div>
                  </div>
                  <div className="rounded-2xl bg-risk/10 px-3 py-2 text-risk">
                    <div className="text-xl font-semibold">{scorecard.missed}</div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.14em]">Missed</div>
                  </div>
                </div>
              </div>
            </div>
          </Shell>
          <ScoreFormula scorecard={scorecard} />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <Shell>
          <div className="p-6">
            <h2 className="text-xl font-semibold tracking-tight text-ink">{replay.candidate.name}'s review notes</h2>
            <div className="mt-5">
              <CommentList comments={replay.comments} />
            </div>
          </div>
        </Shell>
        <Shell>
          <div className="p-6">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Hidden rubric reveal</h2>
            <div className="mt-5">
              <IssueList scorecard={scorecard} />
            </div>
          </div>
        </Shell>
      </section>
    </main>
  );
}

function TryMode({ challenge }: { challenge: Challenge }) {
  const [activePath, setActivePath] = useState(challenge.files[0].path);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [category, setCategory] = useState<Category>("security");
  const [severity, setSeverity] = useState<Severity>("high");
  const [body, setBody] = useState("");
  const [comments, setComments] = useState<CandidateComment[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("proveit-try-comments");
    if (stored) {
      try {
        setComments(JSON.parse(stored) as CandidateComment[]);
      } catch {
        setComments([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("proveit-try-comments", JSON.stringify(comments));
  }, [comments]);

  const selectedRange =
    selectionStart === null
      ? null
      : {
          start: selectionStart,
          end: selectionEnd ?? selectionStart
        };
  const scorecard = useMemo(() => scoreAttempt(challenge, comments), [challenge, comments]);

  function selectLine(line: number) {
    setSubmitted(false);
    if (selectionStart === null || selectionEnd !== null) {
      setSelectionStart(line);
      setSelectionEnd(null);
      return;
    }

    setSelectionEnd(line);
  }

  function addComment() {
    if (!selectedRange || body.trim().length < 12) return;

    const start = Math.min(selectedRange.start, selectedRange.end);
    const end = Math.max(selectedRange.start, selectedRange.end);
    setComments((current) => [
      ...current,
      {
        id: `try-${Date.now()}`,
        filePath: activePath,
        lineStart: start,
        lineEnd: end,
        category,
        severity,
        body: body.trim()
      }
    ]);
    setBody("");
    setSelectionStart(null);
    setSelectionEnd(null);
  }

  function resetAttempt() {
    setComments([]);
    setSubmitted(false);
    setBody("");
    setSelectionStart(null);
    setSelectionEnd(null);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-carbon/48">Try mode</div>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Review the AI-generated endpoint</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-carbon/67">
          Click a line once to start a range, click another line to finish it, then add the review finding. Submit when
          you have enough evidence.
        </p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <CodeViewer
          challenge={challenge}
          activePath={activePath}
          setActivePath={(path) => {
            setActivePath(path);
            setSelectionStart(null);
            setSelectionEnd(null);
          }}
          scorecard={submitted ? scorecard : undefined}
          selectedRange={selectedRange}
          onLineClick={selectLine}
        />

        <div className="grid gap-6">
          <Shell>
            <div className="p-6">
              <h2 className="text-xl font-semibold tracking-tight text-ink">Add a finding</h2>
              <div className="mt-5 grid gap-4">
                <div className="rounded-2xl bg-paper/76 px-4 py-3 text-sm font-semibold text-carbon">
                  Selected range:{" "}
                  <span className="font-mono text-ink">
                    {selectedRange ? `${activePath.split("/").at(-1)} ${rangeLabel(Math.min(selectedRange.start, selectedRange.end), Math.max(selectedRange.start, selectedRange.end))}` : "None"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-carbon">
                    Category
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value as Category)}
                      className="rounded-2xl border border-carbon/12 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-signal"
                    >
                      {categoryOptions.map((option) => (
                        <option key={option} value={option}>
                          {categoryLabels[option]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-semibold text-carbon">
                    Severity
                    <select
                      value={severity}
                      onChange={(event) => setSeverity(event.target.value as Severity)}
                      className="rounded-2xl border border-carbon/12 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-signal"
                    >
                      {severityOptions.map((option) => (
                        <option key={option} value={option}>
                          {severityLabels[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-semibold text-carbon">
                  Review note
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={5}
                    placeholder="Describe the production risk and what you would change."
                    className="resize-none rounded-3xl border border-carbon/12 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-carbon/36 focus:border-signal"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={addComment} disabled={!selectedRange || body.trim().length < 12}>
                    Add finding
                  </Button>
                  <Button onClick={() => setSubmitted(true)} disabled={comments.length === 0} variant="light">
                    Submit review
                  </Button>
                  <Button onClick={resetAttempt} variant="ghost">
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </Shell>

          {submitted ? (
            <Shell>
              <div className="p-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-carbon/48">Your score</div>
                    <div className="mt-2 text-5xl font-semibold tracking-tight text-ink">{scorecard.overall}%</div>
                  </div>
                  <div className="rounded-full bg-signal/10 p-3 text-signal">
                    <Lightning size={26} weight="duotone" />
                  </div>
                </div>
                <div className="mt-6">
                  <CategoryBars scorecard={scorecard} />
                </div>
                <div className="mt-6">
                  <ScoreFormula scorecard={scorecard} />
                </div>
              </div>
            </Shell>
          ) : (
            <Shell>
              <div className="p-6">
                <h2 className="text-xl font-semibold tracking-tight text-ink">Your findings</h2>
                {comments.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-carbon/14 bg-paper/60 p-5 text-sm leading-6 text-carbon/62">
                    No findings yet. Start with the auth check, file handling, or the moment the API sends a success
                    response.
                  </div>
                ) : (
                  <div className="mt-5">
                    <CommentList comments={comments} />
                  </div>
                )}
              </div>
            </Shell>
          )}
        </div>
      </section>
    </main>
  );
}

export function ProveItApp({ challenge, replay, replayScorecard }: Props) {
  const [activeView, setActiveView] = useState<AppView>("dashboard");

  return (
    <div className="noise min-h-[100dvh] overflow-x-hidden">
      <Nav activeView={activeView} setActiveView={setActiveView} />
      {activeView === "dashboard" ? (
        <Dashboard challenge={challenge} replay={replay} scorecard={replayScorecard} setActiveView={setActiveView} />
      ) : null}
      {activeView === "replay" ? (
        <Replay challenge={challenge} replay={replay} scorecard={replayScorecard} setActiveView={setActiveView} />
      ) : null}
      {activeView === "try" ? <TryMode challenge={challenge} /> : null}
      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pb-8 text-xs text-carbon/48 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <span>ProveIt BuildDay POC</span>
        <span>Deterministic scoring plus AI-generated evaluator narrative</span>
      </footer>
    </div>
  );
}
