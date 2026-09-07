import './style.css';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameResponse, SubmitResponse } from '../shared/api';

function App() {
  const [game, setGame] = useState<GameResponse | null>(null);
  const [prediction, setPrediction] = useState(50);
  const [vote, setVote] = useState<'A' | 'B' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { void fetch('/api/game').then((r) => r.json()).then(setGame).catch(() => setError('Could not load today’s game.')); }, []);

  async function submit() {
    if (!vote) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prediction, vote }) });
      const saved = await response.json() as SubmitResponse;
      if (!response.ok || !saved.ok) throw new Error(saved.message ?? 'Could not save your answer.');
      setGame((current) => current ? { ...current, ...saved, question: current.question, yesterday: current.yesterday } : saved);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your answer.'); }
    finally { setBusy(false); }
  }

  if (error && !game) return <main className="state"><h1>Something went wrong.</h1><p>{error}</p></main>;
  if (!game) return <main className="state"><div className="loader"/><p>Reading the Brussels room…</p></main>;
  if (!game.question) return <main className="state"><div className="masthead">EUobserver</div><h1>No Think Tank today.</h1><p>{game.message}</p></main>;

  const q = game.question;
  const answer = game.answer;
  return <main className="game">
    <header><div className="masthead">EUobserver</div><div className="meta"><span>Think Tank</span>{game.identity && <span className="identity">{game.identity}</span>}</div></header>
    {game.yesterday?.question && <section className="yesterday"><div><b>Yesterday’s result</b><p>{game.yesterday.question}</p></div><strong>{Math.round(game.yesterday.option_a_pct ?? 0)}%</strong></section>}
    <section className="question">
      <span className="kicker">Today’s question</span><h1>{q.question}</h1>
      {answer?.answered ? <Locked game={game}/> : <>
        <div className="step"><span>1</span><div><h2>Read the room</h2><p>What percentage of r/euobserver will choose <b>{q.option_a}</b>?</p></div></div>
        <div className="prediction"><strong>{prediction}%</strong><input aria-label="Crowd prediction" type="range" min="0" max="100" value={prediction} onChange={(event) => setPrediction(Number(event.target.value))}/><div><span>0%</span><span>100%</span></div></div>
        <div className="step"><span>2</span><div><h2>Your own vote</h2><p>What do you think?</p></div></div>
        <div className="choices"><button className={vote === 'A' ? 'selected' : ''} onClick={() => setVote('A')}>{q.option_a}</button><button className={vote === 'B' ? 'selected' : ''} onClick={() => setVote('B')}>{q.option_b}</button></div>
        {!game.authenticated && <p className="notice">Sign in to Reddit to lock in your answer and keep your streak.</p>}
        {error && <p className="error">{error}</p>}
        <button className="primary lock" disabled={!vote || busy || !game.authenticated} onClick={() => void submit()}>{busy ? 'Saving…' : 'Lock in my answer'}</button>
      </>}
    </section>
    <footer>Results unlock tomorrow · One answer per account</footer>
  </main>;
}

function Locked({ game }: { game: GameResponse }) {
  const answer = game.answer!; const q = game.question!;
  return <div className="locked"><div className="check">✓</div><h2>You’re locked in.</h2><p>You predicted <b>{answer.prediction}%</b> will choose <b>{q.option_a}</b>.</p><p>Your answer: <b>{answer.vote === 'A' ? q.option_a : q.option_b}</b></p><div className="streak"><strong>{game.streak ?? 1}</strong><span>day streak</span></div><small>Come back tomorrow to see the crowd result and how many players you beat.</small></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
