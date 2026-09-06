(() => {
  'use strict';

  const CONFIG = Object.assign({ supabaseUrl:'', supabaseAnonKey:'', siteUrl:location.origin + location.pathname, timeZone:'Europe/Brussels' }, window.THINK_TANK_CONFIG || {});
  const app = document.getElementById('app');
  const CODE_KEY = 'euobserver_think_tank_code';
  const DEMO_PREFIX = 'euobserver_think_tank_demo_';
  const isDemo = !CONFIG.supabaseUrl || !CONFIG.supabaseAnonKey;

  const Brussels = {
    parts(date=new Date()) { const f=new Intl.DateTimeFormat('en-GB',{timeZone:CONFIG.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}); const p=Object.fromEntries(f.formatToParts(date).map(x=>[x.type,x.value])); return `${p.year}-${p.month}-${p.day}`; },
    shift(day,amount) { const [y,m,d]=day.split('-').map(Number); return new Date(Date.UTC(y,m-1,d+amount,12)).toISOString().slice(0,10); },
    label(day) { const [y,m,d]=day.split('-').map(Number); return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,d,12))); }
  };
  const today=Brussels.parts();
  const params=new URLSearchParams(location.search);
  const requestedDay=/^\d{4}-\d{2}-\d{2}$/.test(params.get('day')||'')?params.get('day'):today;
  const DISPLAY_WORDS={MEP:'MEP',ATTACHE:'Attaché'};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const normaliseIdentity=v=>String(v||'').trim().toUpperCase().replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ');
  const looksModernIdentity=v=>/^[A-Z]+ [A-Z]+$/.test(normaliseIdentity(v)) && !/\d/.test(v||'');
  const prettyIdentity=v=>normaliseIdentity(v).split(' ').filter(Boolean).map(w=>DISPLAY_WORDS[w]||(w[0]+w.slice(1).toLowerCase())).join(' ');
  const identityMarkup=code=>`<button class="code-chip" id="codeChip" type="button" title="Copy your Brussels identity"><span class="code-dot"></span>${esc(prettyIdentity(code))}</button>`;
  const shellTop=(code,day=requestedDay)=>`<div class="dayline"><time datetime="${esc(day)}">${esc(Brussels.label(day))}</time>${identityMarkup(code)}</div>`;
  function toast(message){document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),1800);}

  class SupabaseClient {
    constructor(url,key){this.url=String(url).replace(/\/$/,'');this.key=key;}
    async rpc(name,payload={}){
      const r=await fetch(`${this.url}/rest/v1/rpc/${name}`,{method:'POST',headers:{'Content-Type':'application/json','apikey':this.key,'Authorization':`Bearer ${this.key}`},body:JSON.stringify(payload)});
      const text=await r.text(); let data={}; try{data=text?JSON.parse(text):{};}catch(_){throw new Error(text||'Invalid backend response');}
      if(!r.ok) throw new Error(data.message||data.error||`Backend error ${r.status}`);
      return data;
    }
    newCode(){return this.rpc('tt_new_identity');}
    validateCode(code){return this.rpc('tt_validate_identity',{p_identity:code});}
    question(day){return this.rpc('tt_question',{p_day:day});}
    status(day,code){return this.rpc('tt_status',{p_day:day,p_identity:code});}
    summary(day,code){return this.rpc('tt_summary',{p_day:day,p_identity:code||null});}
    answer(p){return this.rpc('tt_submit_answer',{p_day:p.day,p_identity:p.code,p_prediction:Number(p.prediction),p_vote:p.vote});}
  }

  class DemoClient {
    constructor(){this.adjectives=['SLEEPY','RESTLESS','SHARP','SCEPTICAL','FEDERALIST','FRUGAL','QUIET','LOUD','POLITE','BLUNT','CURIOUS','CAUTIOUS','WITTY','DRY','CYNICAL','OPTIMISTIC','PRAGMATIC','TACTICAL','SECRET','JUNIOR','RELUCTANT','DIPLOMATIC','AMBITIOUS','CAFFEINATED','MIDNIGHT','POLISHED','OBSCURE','RADICAL','PROCEDURAL'];this.characters=['ATTACHE','RAPPORTEUR','LOBBYIST','COMMISSIONER','SHERPA','DIPLOMAT','AMBASSADOR','MEP','CORRESPONDENT','SPOKESPERSON','OFFICIAL','NEGOTIATOR','REGULATOR','WONK','BUREAUCRAT','TECHNOCRAT','ADVISER','MINISTER','DELEGATE','ANALYST','JOURNALIST','INTERN','STAFFER'];}
    async newCode(){return{ok:true,code:`${this.adjectives[Math.floor(Math.random()*this.adjectives.length)]} ${this.characters[Math.floor(Math.random()*this.characters.length)]}`};}
    async validateCode(code){const p=normaliseIdentity(code).split(' ');return{ok:true,valid:p.length===2&&this.adjectives.includes(p[0])&&this.characters.includes(p[1])};}
    q(day){return{ok:true,state:day>today?'future':(day<today?'closed':'open'),day,question:'Will the EU have more than 30 member states by 2035?',option_a:'Yes',option_b:'No'};}
    async question(day){return this.q(day);}
    async status(day,code){const raw=localStorage.getItem(`${DEMO_PREFIX}${day}_${normaliseIdentity(code)}`);return raw?Object.assign({ok:true,answered:true},JSON.parse(raw)):{ok:true,answered:false};}
    async answer(p){localStorage.setItem(`${DEMO_PREFIX}${p.day}_${normaliseIdentity(p.code)}`,JSON.stringify({prediction:Number(p.prediction),vote:p.vote}));return this.status(p.day,p.code);}
    async summary(day,code){const q=this.q(day),s=await this.status(day,code),actual=68,mean=61;return{ok:true,state:day<today?'closed':q.state,day,question:q.question,option_a:q.option_a,option_b:q.option_b,responses:1247,option_a_pct:actual,mean_prediction_a:mean,user:s.answered?{prediction:s.prediction,vote:s.vote,error:Math.abs(s.prediction-actual),beat_pct:73}:null};}
  }

  const client=isDemo?new DemoClient():new SupabaseClient(CONFIG.supabaseUrl,CONFIG.supabaseAnonKey);

  async function getCode(){
    let code=normaliseIdentity(localStorage.getItem(CODE_KEY));
    if(code && looksModernIdentity(code)){
      const check=await client.validateCode(code).catch(()=>({valid:false}));
      if(check?.valid) return code;
    }
    localStorage.removeItem(CODE_KEY);
    const res=await client.newCode(); if(!res?.ok||!res.code) throw new Error('Could not create a Brussels identity.');
    code=normaliseIdentity(res.code); localStorage.setItem(CODE_KEY,code); return code;
  }

  async function changeCode(){const current=localStorage.getItem(CODE_KEY)||'';const entered=prompt('Enter your two-word Brussels identity from another device:',prettyIdentity(current));if(!entered)return;const code=normaliseIdentity(entered);if(code===normaliseIdentity(current))return;const check=await client.validateCode(code);if(!check?.valid)return toast('That Brussels identity was not found.');localStorage.setItem(CODE_KEY,code);toast('Identity restored');setTimeout(()=>location.reload(),350);}
  function attachCodeChip(code){document.getElementById('codeChip')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(prettyIdentity(code));toast('Identity copied');}catch(_){toast(prettyIdentity(code));}});}
  function yesterdayMarkup(s){if(!s?.ok||s.state!=='closed'||!s.question)return'';const result=Math.round(s.option_a_pct);const personal=s.user?`You were ${Math.round(s.user.error)} points off${s.user.beat_pct==null?'.':` and beat ${Math.round(s.user.beat_pct)}% of players.`}`:`${s.responses||0} people played.`;return`<section class="yesterday-card"><div><span class="label">Yesterday’s result</span><h2>${esc(s.question)}</h2><p>${esc(personal)}</p></div><div class="yesterday-score"><strong>${result}%</strong><span>chose ${esc(s.option_a)}</span></div></section>`;}

  async function renderToday(question,code){
    const yesterday=await client.summary(Brussels.shift(today,-1),code).catch(()=>null);const status=await client.status(today,code).catch(()=>({ok:true,answered:false}));
    app.innerHTML=`<section class="screen">${shellTop(code,today)}<span class="eyebrow">EUobserver Think Tank</span><h1 class="hero-title">Guess what <em>Europe</em> thinks.</h1><p class="hero-sub">Predict how other EUobserver readers will answer today’s question. Then answer it yourself. Tomorrow, see who read the room best.</p>${yesterdayMarkup(yesterday)}<div id="todayStage"></div></section>`;attachCodeChip(code);
    const stage=document.getElementById('todayStage');if(status?.answered){stage.innerHTML=lockedMarkup(question,status,code);attachLockedActions();return;}
    let prediction=50,vote='';
    stage.innerHTML=`<section class="question-block"><span class="question-number">Today’s question</span><h2 class="question-title">${esc(question.question)}</h2><div class="step"><div class="step-label">1 · Read the room</div><div class="step-question">What percentage of players will choose <strong>${esc(question.option_a)}</strong>?</div><div class="prediction-wrap"><div class="prediction-readout"><strong id="predictionValue">50%</strong><span>of players</span></div><input class="range" id="prediction" type="range" min="0" max="100" value="50" step="1"><div class="range-labels"><span>0%</span><span>50%</span><span>100%</span></div></div></div><div class="step"><div class="step-label">2 · Your vote</div><div class="step-question">And what do <em>you</em> think?</div><div class="vote-grid"><button class="vote-btn" type="button" data-vote="A"><strong>${esc(question.option_a)}</strong><span>Choose this answer</span></button><button class="vote-btn" type="button" data-vote="B"><strong>${esc(question.option_b)}</strong><span>Choose this answer</span></button></div></div><div class="action-row"><button class="eo-btn" id="submit" type="button" disabled>Lock in my answer</button><span class="action-hint">Results unlock tomorrow.</span></div></section>`;
    const range=document.getElementById('prediction'),value=document.getElementById('predictionValue'),submit=document.getElementById('submit');range.oninput=()=>{prediction=Number(range.value);value.textContent=`${prediction}%`;};document.querySelectorAll('.vote-btn').forEach(btn=>btn.onclick=()=>{vote=btn.dataset.vote;document.querySelectorAll('.vote-btn').forEach(x=>x.classList.toggle('selected',x===btn));submit.disabled=false;});
    submit.onclick=async()=>{submit.disabled=true;submit.textContent='Saving…';try{const saved=await client.answer({day:today,code,prediction,vote});if(!saved?.ok)throw new Error(saved?.error||'Could not save your answer');stage.innerHTML=lockedMarkup(question,saved,code);attachLockedActions();}catch(err){submit.disabled=false;submit.textContent='Lock in my answer';toast(err.message||'Could not save your answer');}};
  }

  function lockedMarkup(q,s,code){const prediction=Number(s.prediction),option=s.vote==='A'?q.option_a:q.option_b;return`<section class="locked-card"><div class="big-check">✓</div><h2>You’re locked in.</h2><p>You predicted <strong>${Math.round(prediction)}%</strong> of players will choose <strong>${esc(q.option_a)}</strong>. Your own answer: <strong>${esc(option)}</strong>.</p><div class="code-panel"><h3>Your Brussels identity</h3><p>No login. Remember these two words to check your Think Tank history on another device.</p><div class="code-value">${esc(prettyIdentity(code))}</div><div class="action-row"><button class="eo-btn secondary" id="copyCode" type="button">Copy identity</button><button class="text-link" id="restoreCode" type="button">Use a different identity</button></div></div><p style="margin-top:20px"><strong>Come back tomorrow</strong> to see the crowd result, the average prediction and how many players you beat.</p></section>`;}
  function attachLockedActions(){document.getElementById('copyCode')?.addEventListener('click',async()=>{const code=localStorage.getItem(CODE_KEY)||'';try{await navigator.clipboard.writeText(prettyIdentity(code));toast('Identity copied');}catch(_){toast(prettyIdentity(code));}});document.getElementById('restoreCode')?.addEventListener('click',()=>changeCode().catch(()=>{}));}

  function renderResult(s,code){if(!s?.ok||s.state!=='closed')return renderError(code,'This result is not available yet.');const a=clamp(Math.round(s.option_a_pct),0,100),b=100-a,mean=s.mean_prediction_a==null?null:Math.round(s.mean_prediction_a),u=s.user;const rank=u&&u.beat_pct!=null?`<section class="rank-card"><span class="eyebrow">Your read of the room</span><strong>You beat ${Math.round(u.beat_pct)}% of players.</strong><p>Your prediction was ${Math.round(u.error)} percentage points from the final crowd result.</p></section>`:u?`<section class="rank-card"><span class="eyebrow">Your read of the room</span><strong>${Math.round(u.error)} points off.</strong><p>We’ll show a player percentile once enough people have played.</p></section>`:'';app.innerHTML=`<section class="screen">${shellTop(code,s.day)}<div class="result-hero"><span class="eyebrow">Think Tank result · ${s.responses||0} players</span><h1 class="result-title">${esc(s.question)}</h1><p class="result-dek">Here’s what the crowd thought — and how well people predicted one another.</p></div><div class="result-grid"><div class="metric primary"><span class="metric-label">Crowd chose ${esc(s.option_a)}</span><strong>${a}%</strong><small>${b}% chose ${esc(s.option_b)}</small></div><div class="metric"><span class="metric-label">Average prediction</span><strong>${mean==null?'—':`${mean}%`}</strong><small>predicted ${esc(s.option_a)}</small></div><div class="metric"><span class="metric-label">Your prediction</span><strong>${u?`${Math.round(u.prediction)}%`:'—'}</strong><small>${u?`${Math.round(u.error)} points off`:'No response under this identity'}</small></div></div>${rank}<section class="result-breakdown"><span class="eyebrow">How people voted</span><div class="bar-row"><div class="bar-meta"><strong>${esc(s.option_a)}</strong><span>${a}%</span></div><div class="bar"><i style="width:${a}%"></i></div></div><div class="bar-row"><div class="bar-meta"><strong>${esc(s.option_b)}</strong><span>${b}%</span></div><div class="bar alt"><i style="width:${b}%"></i></div></div></section><div class="action-row"><a class="eo-btn" href="${esc(CONFIG.siteUrl)}">Play today’s Think Tank</a><button class="text-link" id="restoreCode" type="button">Restore another identity</button></div></section>`;attachCodeChip(code);document.getElementById('restoreCode')?.addEventListener('click',()=>changeCode().catch(()=>{}));}
  function renderFuture(code,day){app.innerHTML=`<section class="screen">${shellTop(code,day)}<span class="eyebrow">EUobserver Think Tank</span><h1 class="hero-title">You’re early.</h1><p class="hero-sub">This Think Tank opens on ${esc(Brussels.label(day))}. The question stays hidden until then.</p><div class="action-row"><a class="eo-btn" href="${esc(CONFIG.siteUrl)}">Play today’s Think Tank</a></div></section>`;attachCodeChip(code);}
  function renderMissing(code,day){app.innerHTML=`<section class="screen">${shellTop(code,day)}<span class="eyebrow">EUobserver Think Tank</span><h1 class="hero-title">No Think Tank today.</h1><p class="hero-sub">There isn’t a published question for ${esc(Brussels.label(day))}.</p><div class="action-row"><a class="eo-btn" href="${esc(CONFIG.siteUrl)}">Go to today</a></div></section>`;attachCodeChip(code);}
  function renderError(code,message){app.innerHTML=`<section class="screen">${code?shellTop(code):''}<span class="eyebrow">EUobserver Think Tank</span><h1 class="hero-title">Something went wrong.</h1><p class="hero-sub">${esc(message)}</p><div class="action-row"><button class="eo-btn" onclick="location.reload()">Try again</button></div></section>`;if(code)attachCodeChip(code);}

  async function boot(){let code='';try{code=await getCode();if(requestedDay>today)return renderFuture(code,requestedDay);if(requestedDay<today){const s=await client.summary(requestedDay,code);return s?.state==='missing'?renderMissing(code,requestedDay):renderResult(s,code);}const q=await client.question(today);if(!q?.ok)throw new Error(q?.error||'Could not load today’s question.');if(q.state==='missing')return renderMissing(code,today);return renderToday(q,code);}catch(err){renderError(code,err.message||'Could not load Think Tank.');}}
  boot();
})();