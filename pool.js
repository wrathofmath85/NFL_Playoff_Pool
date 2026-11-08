/* ===== Playoff Pick'em — shared site code =====
 * THE ONLY THING YOU EDIT: paste your Apps Script web-app URL (ends in /exec).
 * Leave it blank to run the site in demo mode with sample data.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbwSXDps3vPV4hfiFp7EOd9F6BtGmF1-Bz-VTlmNrwYto__nWHJkreXbiRDDYy7dS2gUsg/exec';

/* Payment methods shown on the register page (fee amount comes from Settings ▸ EntryFee). */
const PAYMENT_METHODS = [
  { name: 'Apple Pay', handle: '(708) 542-5972' },
  { name: 'Venmo',     handle: '@Foxy-Lady85', note: 'If asked, last 4 of phone: 5972' },
  { name: 'PayPal',    handle: '@FOXYLADY85' },
  { name: 'Zelle',     handle: '(708) 542-5972' }
];

/* ------------------------------------------------------------------ */
const Pool = (() => {
  const DEMO = !API_URL;
  const ROUND_ORDER = ['WC', 'DIV', 'CONF', 'SB'];
  let shift = 0;
  if (DEMO && window.POOL_DEMO) shift = Date.now() - Date.parse(window.POOL_DEMO.fixtureNow);

  /* ---- data ---- */
  function shiftDates(o) {
    if (!shift || o == null || typeof o !== 'object') return o;
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && /^(deadline|kickoff|serverTime)$/.test(k)) o[k] = new Date(Date.parse(v) + shift).toISOString();
      else if (typeof v === 'object') shiftDates(v);
    }
    return o;
  }
  async function get(action, params = {}) {
    if (DEMO) {
      await new Promise(r => setTimeout(r, 200));
      const d = window.POOL_DEMO;
      const src = action === 'state' ? d.state : d.rounds[params.round];
      if (!src) throw new Error('Unknown round');
      return shiftDates(JSON.parse(JSON.stringify(src)));
    }
    const qs = new URLSearchParams({ action, ...params, t: Date.now() });
    const res = await fetch(API_URL + '?' + qs);
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Server error');
    return j;
  }
  async function post(payload) {
    if (DEMO) {
      await new Promise(r => setTimeout(r, 500));
      if (payload.action === 'submit') return { ok: true, conf: 'DEMO42', count: payload.picks.length,
        wagered: payload.picks.reduce((s, p) => s + p.wager, 0) };
      if (payload.action === 'register') return { ok: true, name: payload.name, message: 'Demo mode — nothing was saved.' };
      if (payload.action === 'mine') throw new Error('Demo mode: there are no saved picks to load.');
    }
    // text/plain body = "simple" request, so no CORS preflight against Apps Script
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || 'Server error');
    return j;
  }

  /* ---- formatting ---- */
  const money = (n, opt = {}) => {
    const v = Number(n) || 0, cents = Math.abs(v % 1) > 0.004 && !opt.round;
    const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
    return (v < 0 ? '−$' : (opt.sign && v > 0 ? '+$' : '$')) + s;
  };
  const odds = o => { const n = Number(o); return !n ? '' : n > 0 ? '+' + n : String(n).replace('-', '−'); };
  const payout = (w, o) => { w = +w || 0; o = +o || 0; if (!w || !o) return 0; return Math.round((o < 0 ? w + w * 100 / -o : w + w * o / 100) * 100) / 100; };
  const et = (iso, o = {}) => {
    if (!iso) return 'TBD';
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', ...o });
    return f.format(new Date(iso)) + ' ET';
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const statusLabel = { upcoming: 'Coming soon', open: 'Picks open', locked: 'Live', final: 'Final' };
  const badge = st => `<span class="badge ${st}">${statusLabel[st] || st}</span>`;

  function countdownHTML(iso) {
    const ms = Math.max(0, Date.parse(iso) - Date.now());
    const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
    const box = (v, l) => `<div><b>${String(v).padStart(l === 'days' ? 1 : 2, '0')}</b><span>${l}</span></div>`;
    return `<div class="countdown">${box(d, 'days')}${box(h, 'hrs')}${box(m, 'min')}${box(s, 'sec')}</div>`;
  }
  /** Keeps every [data-countdown] element ticking; calls onZero once when one hits 0. */
  let cdTimer;
  function startCountdowns(onZero) {
    clearInterval(cdTimer);
    let fired = false;
    const tick = () => document.querySelectorAll('[data-countdown]').forEach(el => {
      el.innerHTML = countdownHTML(el.dataset.countdown);
      if (!fired && Date.parse(el.dataset.countdown) <= Date.now()) { fired = true; onZero && setTimeout(onZero, 1500); }
    });
    tick();
    return (cdTimer = setInterval(tick, 1000));
  }

  /* ---- chrome ---- */
  function nav(active) {
    const links = [['index.html', 'Home', 'home'], ['picks.html', 'Make Picks', 'picks'], ['board.html', 'Picks & Standings', 'board'],
      ['register.html', 'Register', 'register']];
    const el = document.createElement('div');
    el.innerHTML = `<nav class="topnav"><div class="in">
        <a class="brand" href="index.html"><i class="ball"></i><span><b>Playoff</b> Pick'em</span></a>
        <div class="links">${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? 'on' : ''}">${t}</a>`).join('')}</div>
      </div></nav>${DEMO ? '<div class="demoBar">Demo mode — sample data. Paste your Apps Script URL at the top of <b>pool.js</b> to go live.</div>' : ''}`;
    document.body.prepend(...el.children);
  }
  let toastT;
  function toast(msg, err) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); document.body.append(t); }
    t.className = 'toast' + (err ? ' err' : '');
    t.textContent = msg;
    clearTimeout(toastT);
    toastT = setTimeout(() => t.remove(), 4200);
  }
  function modal(html) {
    const bg = document.createElement('div');
    bg.className = 'modalBg';
    bg.innerHTML = `<div class="card modal">${html}</div>`;
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('[data-close]')) bg.remove(); });
    document.body.append(bg);
    return bg;
  }
  /** Fee banner + clickable payment cards (click copies the handle). */
  function payHTML(fee) {
    return `<div class="payFee"><div class="amt">${money(fee)}</div><div>The entry fee is <b>${money(fee)}</b>. Send it using any of the methods below — pick whichever is easiest for you.</div></div>
      <div class="payGrid">${PAYMENT_METHODS.map(m => `<button type="button" class="payCard" data-copy="${esc(m.handle)}">
        <i class="radio"></i><div><div class="pm">${esc(m.name)}</div><div class="ph">${esc(m.handle)}</div>
        ${m.note ? `<div class="pn">${esc(m.note)}</div>` : ''}</div></button>`).join('')}</div>
      <p class="dim" style="font-size:.8rem;margin:10px 0 0">Tap a method to copy it.</p>`;
  }
  document.addEventListener('click', async e => {
    const c = e.target.closest('.payCard'); if (!c) return;
    document.querySelectorAll('.payCard').forEach(x => x.classList.toggle('on', x === c));
    try { await navigator.clipboard.writeText(c.dataset.copy); toast('Copied ' + c.dataset.copy); } catch (err) {}
  });

  const param = k => new URLSearchParams(location.search).get(k);
  const remember = (k, v) => { try { v === undefined ? (v = localStorage.getItem('pool_' + k)) : localStorage.setItem('pool_' + k, v); } catch (e) {} return v; };

  return { DEMO, ROUND_ORDER, get, post, money, odds, payout, et, esc, badge, statusLabel, countdownHTML, startCountdowns,
    nav, toast, modal, param, remember, payHTML };
})();
