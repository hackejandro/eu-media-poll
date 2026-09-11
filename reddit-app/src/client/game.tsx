import './style.css';
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { GameResponse, SubmitResponse } from '../shared/api';

function dayLabel(day: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${day}T12:00:00Z`));
}

function prettyIdentity(identity: string): string {
  return identity.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function App() {
  const [game, setGame] = useState<GameResponse | null>(null);
  const [prediction, setPrediction] = useState(50);
  const [vote, setVote] = useState<'A' | 'B' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const predictionInput = useRef<HTMLInputElement>(null);

  useEffect(() => { void fetch('/api/game').then((r) => r.json()).then(setGame).catch(() => setError('Could not load today’s game.')); }, []);

  async function submit() {
    if (!vote) return;
    const submittedPrediction = Number(predictionInput.current?.value ?? prediction);
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prediction: submittedPrediction, vote }) });
      const saved = await response.json() as SubmitResponse;
      if (!response.ok || !saved.ok) throw new Error(saved.message ?? 'Could not save your answer.');
      setGame((current) => current ? { ...current, ...saved, question: current.question, yesterday: current.yesterday } : saved);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your answer.'); }
    finally { setBusy(false); }
  }

  if (error && !game) return <main className="state"><span className="eyebrow">EUobserver Think Tank</span><h1>Something went wrong.</h1><p>{error}</p></main>;
  if (!game) return <main className="state"><div className="loader"/><p>Reading the Brussels room…</p></main>;
  if (!game.question) return <main className="state"><span className="eyebrow">EUobserver Think Tank</span><h1>No Think Tank today.</h1><p>{game.message}</p></main>;

  const q = game.question;
  const answer = game.answer;
  return <main>
    <header className="eo-header"><span className="eo-logo">eu<strong>observer</strong></span><span className="eo-header-tag">Think Tank</span></header>
    <section className="screen">
      <div className="dayline"><time dateTime={q.day}>{dayLabel(q.day)}</time>{game.identity && <span className="identity">{prettyIdentity(game.identity)}</span>}</div>
      <span className="eyebrow">EUobserver Think Tank</span>
      <h1 className="hero-title">Can you read <span className="accent">Europe</span>?</h1>
      <p className="hero-sub">First, forecast how other players will vote. Then cast your own vote. Tomorrow, find out how well you read the crowd.</p>
      {game.yesterday?.question && <section className="yesterday-card"><div><span className="label">Yesterday’s result</span><h2>{game.yesterday.question}</h2><p>{game.yesterday.responses ?? 0} {(game.yesterday.responses ?? 0) === 1 ? 'person' : 'people'} played.</p></div><div className="yesterday-score"><strong>{Math.round(game.yesterday.option_a_pct ?? 0)}%</strong><span>chose {game.yesterday.option_a}</span></div></section>}
      <section className="question-block">
      <span className="question-number">Today’s question</span><h2 className="question-title">{q.question}</h2>
      {answer?.answered ? <Locked game={game}/> : <>
        <div className="step"><div className="step-label">1 · Forecast the crowd</div><div className="step-question">What percentage of players will vote <strong>{q.option_a}</strong>?</div>
          <div className="prediction-wrap"><div className="prediction-readout"><strong>{prediction}%</strong><span>of players will vote {q.option_a}</span></div><input className="range" ref={predictionInput} aria-label="Crowd forecast" type="range" min="0" max="100" step="1" value={prediction} onInput={(event) => setPrediction(Number(event.currentTarget.value))}/><div className="range-labels"><span>0%</span><span>50%</span><span>100%</span></div></div>
        </div>
        <div className="step"><div className="step-label">2 · Cast your vote</div><div className="step-question">Now forget the crowd. What do <em>you</em> think?</div>
          <div className="vote-grid"><button className={`vote-btn${vote === 'A' ? ' selected' : ''}`} onClick={() => setVote('A')}><strong>{q.option_a}</strong><span>Choose this answer</span></button><button className={`vote-btn${vote === 'B' ? ' selected' : ''}`} onClick={() => setVote('B')}><strong>{q.option_b}</strong><span>Choose this answer</span></button></div>
        </div>
        {!game.authenticated && <p className="notice">Sign in to Reddit to lock in your answer and keep your streak.</p>}
        {error && <p className="error">{error}</p>}
        <div className="action-row"><button className="eo-btn" disabled={!vote || busy || !game.authenticated} onClick={() => void submit()}>{busy ? 'Saving…' : 'Lock in both answers'}</button><span className="action-hint">Your forecast and vote cannot be changed. The crowd result is revealed tomorrow.</span></div>
      </>}
      </section>
      <div className="footer-note">One answer per Reddit account</div>
    </section>
  </main>;
}

function Locked({ game }: { game: GameResponse }) {
  const answer = game.answer!; const q = game.question!;
  return <div className="locked-card"><div className="big-check">✓</div><h2>You’re locked in.</h2><p>Your crowd forecast: <strong>{answer.prediction}% {q.option_a}</strong><br/>Your own vote: <strong>{answer.vote === 'A' ? q.option_a : q.option_b}</strong></p><div className="streak"><strong>{game.streak ?? 1}</strong><span>day streak</span></div><p className="come-back"><strong>Come back tomorrow</strong> to see the result, how close your forecast was, and how many players you outpredicted.</p></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
