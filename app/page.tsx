import { ProveItApp } from "@/components/ProveItApp";
import { reviewChallenges } from "@/data/challenge";
import { highlightChallenge } from "@/lib/highlight";
import { scoreAttempt } from "@/lib/scoring";

export default async function Home() {
  const challengePacks = await Promise.all(
    reviewChallenges.map(async (pack) => {
      const highlightedChallenge = await highlightChallenge(pack.challenge);

      return {
        challenge: highlightedChallenge,
        replay: pack.replay,
        replayScorecard: scoreAttempt(highlightedChallenge, pack.replay.comments)
      };
    })
  );

  return <ProveItApp challengePacks={challengePacks} />;
}
