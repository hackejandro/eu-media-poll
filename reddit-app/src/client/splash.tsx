import './style.css';
import { context, requestExpandedMode } from '@devvit/web/client';
import { createRoot } from 'react-dom/client';

function Splash() {
  const username = (context as { username?: string } | undefined)?.username;
  return <main className="splash">
    <header className="eo-header"><span className="eo-logo">eu<strong>observer</strong></span><span className="eo-header-tag">Think Tank</span></header>
    <section className="splash-body">
      <h1 className="hero-title">The future of Europe, one question at a time.</h1>
      <p className="hero-sub">Forecast the crowd’s answer, give your own, and return tomorrow to see how many players you outpredicted.</p>
      <div className="action-row"><button className="eo-btn" onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}>Play today’s Think Tank</button></div>
      <small className="splash-player">{username ? `Playing as u/${username}` : 'Sign in to save your answer'}</small>
      <div className="splash-flow"><span>Forecast</span><i>→</i><span>Vote</span><i>→</i><span>See your score tomorrow</span></div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Splash />);
