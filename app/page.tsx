import { ProveItApp } from "@/components/ProveItApp";
import { candidateReplay, challenge } from "@/data/challenge";
import { scoreAttempt } from "@/lib/scoring";

export default function Home() {
  const replayScorecard = scoreAttempt(challenge, candidateReplay.comments);

  return <ProveItApp challenge={challenge} replay={candidateReplay} replayScorecard={replayScorecard} />;
}
