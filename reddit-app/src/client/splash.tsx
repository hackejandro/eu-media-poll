import './style.css';
import { context, requestExpandedMode } from '@devvit/web/client';
import { createRoot } from 'react-dom/client';

function Splash() {
  return <main className="splash">
    <header className="eo-header"><span className="eo-logo">eu<strong>observer</strong></span><span className="eo-header-tag">Think Tank</span></header>
    <section className="splash-body">
      <h1 className="hero-title">Predict the crowd. Then pick a side.</h1>
      <p className="hero-sub"><strong>How many players will vote Yes today?</strong> Forecast the result, cast your own vote, and return tomorrow to see how many people you outpredicted.</p>
      <div className="action-row"><button className="eo-btn" onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}>Play today’s Think Tank</button></div>
      <small className="splash-player">{context.username ? `Playing as u/${context.username}` : 'Sign in to save your answer'}</small>
      <hr className="splash-rule"/>
      <div className="splash-steps"><span><b>1 · Forecast</b>Predict the crowd</span><span><b>2 · Vote</b>Pick your side</span><span><b>Tomorrow</b>See who you outpredicted</span></div>
    </section>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Splash />);
