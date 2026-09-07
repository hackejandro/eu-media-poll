import './style.css';
import { context, requestExpandedMode } from '@devvit/web/client';
import { createRoot } from 'react-dom/client';

function Splash() {
  return <main className="splash">
    <div className="masthead">EUobserver</div>
    <div className="kicker">The daily perception game</div>
    <h1>How well can you<br/><em>read Europe?</em></h1>
    <p>Predict the crowd. Give your own answer. Return tomorrow to see how sharp your Brussels instincts were.</p>
    <button className="primary" onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}>Play today’s Think Tank</button>
    <small>{context.username ? `Playing as u/${context.username}` : 'Sign in to save your answer'}</small>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Splash />);
