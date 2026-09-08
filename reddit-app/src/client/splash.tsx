import './style.css';
import { context, requestExpandedMode } from '@devvit/web/client';
import { createRoot } from 'react-dom/client';

function Splash() {
  return <main className="splash">
    <header className="eo-header"><span className="eo-logo">eu<strong>observer</strong></span><span className="eo-header-tag">Think Tank</span></header>
    <section className="splash-body">
      <span className="eyebrow">The daily perception game</span>
      <h1 className="hero-title">Guess what <em>Europe</em> thinks.</h1>
      <p className="hero-sub">Predict how other EUobserver readers will answer. Then answer for yourself and come back tomorrow to see who read the room best.</p>
      <div className="action-row"><button className="eo-btn" onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}>Play today’s Think Tank</button></div>
      <small className="splash-player">{context.username ? `Playing as u/${context.username}` : 'Sign in to save your answer'}</small>
      <hr className="splash-rule"/>
      <div className="splash-steps"><span><b>1 · Predict</b>Read the room</span><span><b>2 · Vote</b>Give your answer</span><span><b>Tomorrow</b>See the result</span></div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Splash />);
