import assert from 'node:assert/strict';
import test from 'node:test';
import { formatLeaderboardComment, rankPlayers, scorePrediction } from './leaderboard.ts';

test('scores a forecast by distance from the crowd result', () => {
  assert.equal(scorePrediction(62, 68.4), 94);
  assert.equal(scorePrediction(100, 0), 0);
});

test('ranks the ten closest forecasts and resolves ties by username', () => {
  const ranked = rankPlayers([
    { username: 'delta', prediction: 10 },
    { username: 'bravo', prediction: 61 },
    { username: 'alpha', prediction: 59 },
    { username: 'charlie', prediction: 70 },
    { username: 'echo', prediction: 71 },
    { username: 'foxtrot', prediction: 72 },
    { username: 'golf', prediction: 73 },
    { username: 'hotel', prediction: 74 },
    { username: 'india', prediction: 75 },
    { username: 'juliet', prediction: 76 },
    { username: 'kilo', prediction: 77 },
  ], 60);

  assert.deepEqual(ranked.map(({ username, score }) => ({ username, score })), [
    { username: 'alpha', score: 99 },
    { username: 'bravo', score: 99 },
    { username: 'charlie', score: 90 },
    { username: 'echo', score: 89 },
    { username: 'foxtrot', score: 88 },
    { username: 'golf', score: 87 },
    { username: 'hotel', score: 86 },
    { username: 'india', score: 85 },
    { username: 'juliet', score: 84 },
    { username: 'kilo', score: 83 },
  ]);
});

test('formats Reddit handles and scores in the leaderboard comment', () => {
  const comment = formatLeaderboardComment([
    { username: 'best_player', prediction: 55, score: 98 },
  ], 'Yes');

  assert.match(comment, /u\/best_player — \*\*98\/100\*\*/);
  assert.match(comment, /crowd’s \*\*Yes\*\* vote/);
});
