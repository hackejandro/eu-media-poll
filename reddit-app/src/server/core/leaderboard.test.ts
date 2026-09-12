import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLeaderboardComment, rankPlayers, scorePrediction } from './leaderboard.ts';

test('scores a forecast by distance from the crowd result', () => {
  assert.equal(scorePrediction(62, 68.4), 94);
  assert.equal(scorePrediction(100, 0), 0);
});

test('ranks the three closest forecasts and resolves ties by username', () => {
  const ranked = rankPlayers([
    { username: 'delta', prediction: 10 },
    { username: 'bravo', prediction: 61 },
    { username: 'alpha', prediction: 59 },
    { username: 'charlie', prediction: 70 },
  ], 60);

  assert.deepEqual(ranked.map(({ username, score }) => ({ username, score })), [
    { username: 'alpha', score: 99 },
    { username: 'bravo', score: 99 },
    { username: 'charlie', score: 90 },
  ]);
});

test('formats Reddit handles and scores in the leaderboard comment', () => {
  const comment = formatLeaderboardComment([
    { username: 'best_player', prediction: 55, score: 98 },
  ], 'Yes');

  assert.match(comment, /u\/best_player — \*\*98\/100\*\*/);
  assert.match(comment, /crowd’s \*\*Yes\*\* vote/);
});
