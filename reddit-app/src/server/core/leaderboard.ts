export type DailyPlayer = {
  username: string;
  prediction: number;
};

export type LeaderboardEntry = DailyPlayer & {
  score: number;
};

export function scorePrediction(prediction: number, actual: number): number {
  return Math.max(0, Math.round(100 - Math.abs(prediction - actual)));
}

export function rankPlayers(players: DailyPlayer[], actual: number, limit = 3): LeaderboardEntry[] {
  return players
    .filter((player) => Number.isFinite(player.prediction) && player.prediction >= 0 && player.prediction <= 100)
    .map((player) => ({ ...player, score: scorePrediction(player.prediction, actual) }))
    .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
    .slice(0, limit);
}

export function formatLeaderboardComment(entries: LeaderboardEntry[], optionA: string): string {
  const medals = ['🥇', '🥈', '🥉'];
  const rows = entries.map((entry, index) =>
    `${medals[index] ?? `${index + 1}.`} u/${entry.username} — **${entry.score}/100**`
  );

  return [
    '## Yesterday’s Think Tank leaderboard',
    '',
    ...rows,
    '',
    `Scores measure how closely each player forecast the crowd’s **${optionA}** vote.`,
  ].join('\n');
}
