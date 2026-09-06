(() => {
  'use strict';

  const CONFIG = Object.assign({ apiUrl: '', siteUrl: location.origin + location.pathname, timeZone: 'Europe/Brussels' }, window.THINK_TANK_CONFIG || {});
  const app = document.getElementById('app');
  const CODE_KEY = 'euobserver_think_tank_code';
  const DEMO_PREFIX = 'euobserver_think_tank_demo_';
  const isDemo = !String(CONFIG.apiUrl || '').trim();

  const Brussels = {
    parts(date = new Date()) {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: CONFIG.timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const p = Object.fromEntries(formatter.formatToParts(date).map(x => [x.type, x.value]));
      return `${p.year}-${p.month}-${p.day}`;
    },
    shift(day, amount) {
      const [y, m, d] = day.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d + amount, 12, 0, 0));
      return dt.toISOString().slice(0, 10);
    },
    label(day) {
      const [y, m, d] = day.split('-').map(Number);
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)));
    }
  };

  const today = Brussels.parts();
  const params = new URLSearchParams(location.search);
  const requestedDay = /^\d{4}-\d{2}-\d{2}$/.test(params.get('day') || '') ? params.get('day') : today;

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
  function codeMarkup(code) {
    return `<button class="code-chip" id="codeChip" type="button" title="Copy or change your Brussels code"><span class="code-dot"></span>${esc(code)}</button>`;
  }
  function shellTop(code, day = requestedDay) {
    return `<div class="dayline"><time datetime="${esc(day)}">${esc(Brussels.label(day))}</time>${codeMarkup(code)}</div>`;
  }
  function toast(message) {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  class ApiClient {
    constructor(url) { this.url = String(url || '').trim(); }
    jsonp(query) {
      return new Promise((resolve, reject) => {
        if (!this.url) return reject(new Error('No API configured'));
        const callback = `__tt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        const timeout = setTimeout(() => cleanup(new Error('The Think Tank server did not respond.')), 12000);
        const cleanup = (error, data) => {
          clearTimeout(timeout); delete window[callback]; script.remove();
          error ? reject(error) : resolve(data);
        };
        window[callback] = data => cleanup(null, data);
        const qs = new URLSearchParams(Object.assign({}, query, { callback }));
        script.src = `${this.url}${this.url.includes('?') ? '&' : '?'}${qs}`;
        script.onerror = () => cleanup(new Error('Could not reach the Think Tank server.'));
        document.head.appendChild(script);
      });
    }
    newCode() { return this.jsonp({ action: 'newCode' }); }
    validateCode(code) { return this.jsonp({ action: 'validateCode', code }); }
    question(day) { return this.jsonp({ action: 'question', day }); }
    status(day, code) { return this.jsonp({ action: 'status', day, code }); }
    summary(day, code) { return this.jsonp({ action: 'summary', day, code: code || '' }); }
    async answer(payload) {
      const body = new URLSearchParams(Object.assign({ action: 'answer' }, payload));
      await fetch(this.url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 450 + (i * 200)));
        const s = await this.status(payload.day, payload.code);
        if (s && s.ok && s.answered) return s;
      }
      throw new Error('Your answer may not have been saved. Please try again.');
    }
  }

  class DemoClient {
    constructor() { this.terms = ['SCHUMAN', 'BERLAYMONT', 'TRILOGUE', 'COREPER', 'JOURDAN', 'LEOPOLD', 'SPAAK', 'ACQUIS']; }
    async newCode() {
      const term = this.terms[Math.floor(Math.random() * this.terms.length)];
      return { ok: true, code: `${term}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}` };
    }
    async validateCode(code) { return { ok: true, valid: /^[A-Z-]+-\d{5}$/.test(code) }; }
    q(day) { return { ok: true, state: day > today ? 'future' : 'open', day, question: 'Will the EU have more than 30 member states by 2035?', option_a: 'Yes', option_b: 'No' }; }
    async question(day) { return this.q(day); }
    async status(day, code) {
      const raw = localStorage.getItem(`${DEMO_PREFIX}${day}_${code}`);
      return raw ? Object.assign({ ok: true, answered: true }, JSON.parse(raw)) : { ok: true, answered: false };
    }
    async answer(payload) {
      localStorage.setItem(`${DEMO_PREFIX}${payload.day}_${payload.code}`, JSON.stringify({ prediction: Number(payload.prediction), vote: payload.vote }));
      return this.status(payload.day, payload.code);
    }
    async summary(day, code) {
      const q = this.q(day); const s = await this.status(day, code); const actual = 68; const mean = 61;
      return { ok: true, state: 'closed', day, question: q.question, option_a: q.option_a, option_b: q.option_b, responses: 1247, option_a_pct: actual, mean_prediction_a: mean, user: s.answered ? { prediction: s.prediction, vote: s.vote, error: Math.abs(s.prediction - actual), beat_pct: 73 } : null };
    }
  }

  const client = isDemo ? new DemoClient() : new ApiClient(CONFIG.apiUrl);

  async function getCode() {
    let code = localStorage.getItem(CODE_KEY);
    if (code) return code;
    const res = await client.newCode();
    if (!res || !res.ok || !res.code) throw new Error('Could not create a Brussels code.');
    code = String(res.code).toUpperCase(); localStorage.setItem(CODE_KEY, code); return code;
  }

  async function changeCode() {
    const current = localStorage.getItem(CODE_KEY) || '';
    const entered = window.prompt('Enter your Brussels code from another device:', current);
    if (!entered || entered.trim().toUpperCase() === current) return;
    const code = entered.trim().toUpperCase();
    const check = await client.validateCode(code);
    if (!check || !check.ok || !check.valid) return toast('That Brussels code was not found.');
    localStorage.setItem(CODE_KEY, code); toast('Brussels code restored'); setTimeout(() => location.reload(), 350);
  }

  function attachCodeChip(code) {
    const chip = document.getElementById('codeChip'); if (!chip) return;
    chip.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch (_) { toast(code); }
      setTimeout(() => changeCode().catch(() => {}), 450);
    });
  }

  function yesterdayMarkup(summary) {
    if (!summary || !summary.ok || summary.state !== 'closed' || !summary.question) return '';
    const result = Math.round(summary.option_a_pct);
    const personal = summary.user ? `You were ${Math.round(summary.user.error)} points off${summary.user.beat_pct == null ? '.' : ` and beat ${Math.round(summary.user.beat_pct)}% of players.`}` : `${summary.responses || 0} people played.`;
    return `<section class="yesterday-card"><div><span class="label">Yesterday’s result</span><h2>${esc(summary.question)}</h2><p>${esc(personal)}</p></div><div class="yesterday-score"><strong>${result}%</strong><span>chose ${esc(summary.option_a)}</span></div></section>`;
  }

  async function renderToday(question, code) {
    const yesterday = await client.summary(Brussels.shift(today, -1), code).catch(() => null);
    const status = await client.status(today, code).catch(() => ({ ok: true, answered: false }));
    app.innerHTML = `<section class="screen">${shellTop(code, today)}<span class="eyebrow">EUobserver Think Tank</span><h1 class="hero-title">Guess what <em>Europe</em> thinks.</h1><p class="hero-sub">Predict how other EUobserver readers will answer today’s question. Then answer it yourself. Tomorrow, see who read the room best.</p>${yesterdayMarkup(yesterday)}<div id="todayStage"></div></section>`;
    attachCodeChip(code);
    const stage = document.getElementById('todayStage');
    if (status && status.answered) { stage.innerHTML = lockedMarkup(question, status, code); attachLockedActions(); return; }
    let prediction = 50; let vote = '';
    stage.innerHTML = `<section class="question-block"><span class="question-number">Today’s question</span><h2 class="question-title">${esc(question.question)}</h2><div class="step"><div class="step-label">1 · Read the room</div><div class="step-question">What percentage of players will choose <strong>${esc(question.option_a)}</strong>?</div><div class="prediction-wrap"><div class="prediction-readout"><strong id="predictionValue">50%</strong><span>of players</span></div><input class="range" id="prediction" type="range" min="0" max="100" value="50" step="1" aria-label="Predicted percentage choosing ${esc(question.option_a)}"><div class="range-labels"><span>0%</span><span>50%</span><span>100%</span></div></div></div><div class="step"><div class="step-label">2 · Your vote</div><div class="step-question">And what do <em>you</em> think?</div><div class="vote-grid"><button class="vote-btn" type="button" data-vote="A"><strong>${esc(question.option_a)}</strong><span>Choose this answer</span></button><button class="vote-btn" type="button" data-vote="B"><strong>${esc(question.option_b)}</strong><span>Choose this answer</span></button></div></div><div class="action-row"><button class="eo-btn" id="submit" type="button" disabled>Lock in my answer</button><span class="action-hint">Results unlock tomorrow.</span></div></section>`;
    const range = document.getElementById('prediction'); const value = document.getElementById('predictionValue'); const submit = document.getElementById('submit');
    range.addEventListener('input', () => { prediction = Number(range.value); value.textContent = `${prediction}%`; });
    document.querySelectorAll('.vote-btn').forEach(btn => btn.addEventListener('click', () => { vote = btn.dataset.vote; document.querySelectorAll('.vote-btn').forEach(x => x.classList.toggle('selected', x === btn)); submit.disabled = false; }));
    submit.addEventListener('click', async () => {
      submit.disabled = true; submit.textContent = 'Saving…';
      try { const saved = await client.answer({ day: today, code, prediction, vote }); stage.innerHTML = lockedMarkup(question, saved, code); attachLockedActions(); }
      catch (err) { submit.disabled = false; submit.textContent = 'Lock in my answer'; toast(err.message || 'Could not save your answer'); }
    });
  }

  function lockedMarkup(question, status, code) {
    const prediction = Number(status.prediction); const option = status.vote === 'A' ? question.option_a : question.option_b;
    return `<section class="locked-card"><div class="big-check">✓</div><h2>You’re locked in.</h2><p>You predicted <strong>${Math.round(prediction)}%</strong> of players will choose <strong>${esc(question.option_a)}</strong>. Your own answer: <strong>${esc(option)}</strong>.</p><div class="code-panel"><h3>Your Brussels code</h3><p>No login. This random code is your key to checking your Think Tank history on another device.</p><div class="code-value">${esc(code)}</div><div class="action-row"><button class="eo-btn secondary" id="copyCode" type="button">Copy code</button><button class="text-link" id="restoreCode" type="button">Use a different code</button></div></div><p style="margin-top:20px"><strong>Come back tomorrow</strong> to see the crowd result, the average prediction and how many players you beat.</p></section>`;
  }

  function attachLockedActions() {
    document.getElementById('copyCode')?.addEventListener('click', async () => { const code = localStorage.getItem(CODE_KEY) || ''; try { await navigator.clipboard.writeText(code); toast('Code copied'); } catch (_) { toast(code); } });
    document.getElementById('restoreCode')?.addEventListener('click', () => changeCode().catch(() => {}));
  }

  function renderResult(summary, code) {
    if (!summary || !summary.ok || summary.state !== 'closed') return renderError(code, 'This result is not available yet.');
    const a = clamp(Math.round(summary.option_a_pct), 0, 100); const b = 100 - a; const mean = summary.mean_prediction_a == null ? null : Math.round(summary.mean_prediction_a); const u = summary.user;
    const rank = u && u.beat_pct != null ? `<section class="rank-card"><span class="eyebrow">Your read of the room</span><strong>You beat ${Math.round(u.beat_pct)}% of players.</strong><p>Your prediction was ${Math.round(u.error)} percentage points from the final crowd result.</p></section>` : u ? `<section class="rank-card"><span class="eyebrow">Your read of the room</span><strong>${Math.round(u.error)} points off.</strong><p>We’ll show a player percentile once enough people have played.</p></section>` : '';
    app.innerHTML = `<section class="screen">${shellTop(code, summary.day)}<div class="result-hero"><span class="eyebrow">Think Tank result · ${summary.responses || 0} players</span><h1 class="result-title">${esc(summary.question)}</h1><p class="result-dek">Here’s what the crowd thought — and how well people predicted one another.</p></div><div class="result-grid"><div class="metric primary"><span class="metric-label">Crowd chose ${esc(summary.option_a)}</span><strong>${a}%</strong><small>${b}% chose ${esc(summary.option_b)}</small></div><div class="metric"><span class="metric-label">Average prediction</span><strong>${mean == null ? '—' : `${mean}%`}</strong><small>predicted ${esc(summary.option_a)}</small></div><div class="metric"><span class="metric-label">Your prediction</span><strong>${u ? `${Math.round(u.prediction)}%` : '—'}</strong><small>${u ? `${Math.round(u.error)} points off` : 'No response under this code'}</small></div></div>${rank}<section class="result-breakdown"><span class="eyebrow">How people voted</span><div class="bar-row"><div class="bar-meta"><strong>${esc(summary.option_a)}</strong><span>${a}%</span></div><div class="bar"><i style="width:${a}%"></i></div></div><div class="bar-row"><div class="bar-meta"><strong>${esc(summary.option_b)}</strong><span>${b}%</span></div><div class="bar alt"><i style="width:${b}%"></i></div></div></section><div class="action-row"><a class="eo-btn" href="${esc(CONFIG.siteUrl)}">Play today’s Think Tank</a></div></section>`;
    attachCodeChip(code);
  }

  function renderFuture(code, day) {
    app.innerHTML = `<section class="screen">${shellTop(code, day)}<span class="eyebrow">EUobserver Think Tank</span><h1 class="hero-title">You’re <em>early.</em></h1><section class="future-card"><h2>This Think Tank opens ${esc(Brussels.label(day))}.</h2><p>The question stays under wraps until then. Your link is correct — just come back on the day.</p></section><div class="action-row"><a class="eo-btn secondary" href="${esc(CONFIG.siteUrl)}">Play today instead</a></div></section>`;
    attachCodeChip(code);
  }
  function renderError(code, message) {
    app.innerHTML = `<section class="screen">${shellTop(code)}<span class="eyebrow">EUobserver Think Tank</span><section class="error-card"><h2>We hit a snag.</h2><p>${esc(message)}</p></section><div class="action-row"><button class="eo-btn" type="button" onclick="location.reload()">Try again</button></div></section>`;
    attachCodeChip(code);
  }

  async function boot() {
    let code = 'CREATING-CODE';
    try {
      code = await getCode();
      if (requestedDay < today) return renderResult(await client.summary(requestedDay, code), code);
      if (requestedDay > today) return renderFuture(code, requestedDay);
      const question = await client.question(today);
      if (!question || !question.ok) throw new Error(question?.error || 'Today’s question could not be loaded.');
      if (question.state === 'future') return renderFuture(code, today);
      if (question.state !== 'open') throw new Error('There is no published Think Tank question today.');
      await renderToday(question, code);
    } catch (err) { renderError(code, err.message || 'The game could not be loaded.'); }
  }
  boot();
})();
