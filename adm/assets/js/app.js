// Shell do Hub: login, menu, roteamento por hash e delegação de eventos.
import { store } from './store.js';
import { DEMO, ROLES } from './config.js';
import { can, me } from './ops.js';
import { xpOf, levelOf } from './game.js';
import { esc, icon, avatar, toast, modal } from './util.js';

import dashboard from './views/dashboard.js';
import projects from './views/projects.js';
import board from './views/board.js';
import project from './views/project.js';
import accounts from './views/accounts.js';
import process from './views/process.js';
import leads from './views/leads.js';
import lead from './views/lead.js';
import aftersales from './views/aftersales.js';
import alliances from './views/alliances.js';
import finance from './views/finance.js';
import goals from './views/goals.js';
import agenda from './views/agenda.js';
import ranking from './views/ranking.js';
import team from './views/team.js';

const NAV = [
  { group: 'Operação' },
  { path: '',           mod: 'dashboard',  label: 'Hoje',       icon: 'home',     view: dashboard },
  { path: 'painel',     mod: 'painel',     label: 'Painel',     icon: 'grid',     view: board },
  { path: 'projetos',   mod: 'projetos',   label: 'Projetos',   icon: 'folder',   view: projects },
  { path: 'contas',     mod: 'contas',     label: 'Contas',     icon: 'layers',   view: accounts },
  { path: 'leads',      mod: 'leads',      label: 'Leads',      icon: 'funnel',   view: leads },
  { path: 'posvenda',   mod: 'posvenda',   label: 'Pós-venda',  icon: 'heart',    view: aftersales },
  { path: 'aliancas',   mod: 'aliancas',   label: 'Alianças',   icon: 'handshake', view: alliances },
  { path: 'processos',  mod: 'processos',  label: 'Processos',  icon: 'flow',     view: process },
  { path: 'agenda',     mod: 'agenda',     label: 'Agenda',     icon: 'calendar', view: agenda },
  { group: 'Negócio' },
  { path: 'financeiro', mod: 'financeiro', label: 'Financeiro', icon: 'wallet',   view: finance },
  { path: 'metas',      mod: 'metas',      label: 'Metas',      icon: 'target',   view: goals },
  { group: 'Time' },
  { path: 'ranking',    mod: 'ranking',    label: 'Ranking',    icon: 'trophy',   view: ranking },
  { path: 'equipe',     mod: 'equipe',     label: 'Equipe',     icon: 'users',    view: team },
];

const $ = s => document.querySelector(s);
let current = null;   // { view, params }
let renderQueued = false;

// ------------------------------------------------------------
// Rotas
// ------------------------------------------------------------
function resolve() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head = '', ...rest] = parts;
  const PROJECT_FILTERS = ['todos', 'cliente', 'ecossistema', 'imagine'];
  if (head === 'projetos' && rest[0] && !PROJECT_FILTERS.includes(rest[0])) return { view: project, mod: 'projetos', params: { id: rest[0], tab: rest[1] || 'visao' } };
  if (head === 'leads' && rest[0]) return { view: lead, mod: 'leads', params: { id: rest[0], tab: rest[1] || 'resumo' } };
  if (head === 'contas' && rest[0]) return { view: accounts, mod: 'contas', params: { id: rest[0], tab: rest[1] || 'marca' } };
  const path = head === 'crm' ? 'leads' : head;   // link antigo do CRM
  const item = NAV.find(n => n.path === path) || NAV[1];
  return { view: item.view, mod: item.mod, params: { sub: rest[0] || null } };
}

export function go(path) { location.hash = '#/' + path; }

function renderView() {
  const view = $('#view');
  const r = resolve();
  if (!can(r.mod)) {
    view.innerHTML = `<div class="page"><div class="empty"><div class="empty-title">Sem acesso</div><p>Seu papel (${esc(ROLES[me().role]?.label)}) não vê este módulo.</p><a class="btn btn-primary" href="#/">Voltar</a></div></div>`;
    current = null; return;
  }
  const sameRoute = current && current.view === r.view && JSON.stringify(current.params) === JSON.stringify(r.params);
  const y = sameRoute ? window.scrollY : 0;
  current = r;
  view.innerHTML = r.view.render(r.params);
  r.view.after?.(view, r.params);
  document.title = `${r.view.title?.(r.params) || 'Hub'} · IMAGINE`;
  window.scrollTo(0, y);
  renderNav();
}

function queueRender() {
  if (renderQueued) return;
  renderQueued = true;
  queueMicrotask(() => { renderQueued = false; if (store.user) { renderView(); renderUserCard(); } });
}

// ------------------------------------------------------------
// Shell
// ------------------------------------------------------------
function renderNav() {
  const r = resolve();
  $('#nav').innerHTML = NAV.map((n, i) => {
    if (n.group) {
      const next = NAV.slice(i + 1);
      const end = next.findIndex(x => x.group);
      const hasItems = (end < 0 ? next : next.slice(0, end)).some(x => can(x.mod));
      return hasItems ? `<div class="nav-group">${esc(n.group)}</div>` : '';
    }
    if (!can(n.mod)) return '';
    const active = r.mod === n.mod;
    return `<a href="#/${n.path}" class="nav-item ${active ? 'active' : ''}">${icon(n.icon)}<span>${esc(n.label)}</span></a>`;
  }).join('');
}

function renderUserCard() {
  const u = me();
  const lv = levelOf(xpOf(u.id));
  $('#user-card').innerHTML = `
    <a href="#/ranking" class="user-card-main">
      ${avatar(u, 34)}
      <div class="user-meta">
        <strong>${esc(u.name)}</strong>
        <span>${esc(ROLES[u.role]?.label)} · Nv ${lv.n} ${esc(lv.name)}</span>
      </div>
    </a>
    <div class="xp-mini" title="${lv.xp} XP${lv.next ? ` · faltam ${lv.ceil - lv.xp} para ${lv.next}` : ''}">
      <span style="width:${Math.round(lv.progress * 100)}%"></span>
    </div>
    <div class="user-actions">
      <button class="icon-btn" data-shell="theme" title="Tema claro/escuro">${icon('moon')}</button>
      ${DEMO ? `<button class="icon-btn" data-shell="switch" title="Trocar usuário (demo)">${icon('users')}</button>` : ''}
      ${DEMO ? '' : `<button class="icon-btn" data-shell="password" title="Definir minha senha">${icon('eye')}</button>`}
      <button class="icon-btn" data-shell="logout" title="Sair">${icon('logout')}</button>
    </div>`;
}

function renderApp() {
  document.body.classList.remove('is-login');
  $('#app').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <a href="#/" class="brand">
        <span class="logo-chip"><img src="assets/img/logo.png" alt="IMAGINE Concept"></span>
        <span class="brand-tag">Hub</span>
      </a>
      ${DEMO ? '<div class="demo-pill" title="Dados salvos só neste navegador. Configure o Supabase para usar de verdade.">Modo demo</div>' : ''}
      <nav id="nav" class="nav"></nav>
      <div id="user-card" class="user-card"></div>
    </aside>
    <header class="topbar">
      <button class="icon-btn" data-shell="menu" aria-label="Menu">${icon('menu')}</button>
      <span class="logo-chip logo-chip-sm"><img src="assets/img/logo.png" alt="IMAGINE" class="topbar-logo"></span>
    </header>
    <main id="view" class="main"></main>
    <div class="scrim" data-shell="menu"></div>`;
  renderUserCard();
  renderView();
}

function renderLogin(error = '') {
  document.body.classList.add('is-login');
  const demoUsers = DEMO ? store.all('profiles') : [];
  $('#app').innerHTML = `
    <div class="login">
      <div class="login-art">
        <img src="assets/img/logo.png" alt="IMAGINE Concept">
        <div class="login-claim">
          <span>Hub interno</span>
          <h1>Projetos, processos e <em>propósito</em> num lugar só.</h1>
        </div>
      </div>
      <form class="login-form" id="login-form">
        <h2>Entrar</h2>
        ${DEMO ? `
          <p class="muted">Modo demo: escolha um perfil para ver a visão de cada papel. Nada sai do seu navegador.</p>
          <div class="demo-users">
            ${demoUsers.map(u => `<button type="button" class="demo-user" data-email="${esc(u.email)}">${avatar(u, 36)}<span><strong>${esc(u.name)}</strong><small>${esc(ROLES[u.role]?.label)} · ${esc(u.title || '')}</small></span></button>`).join('')}
          </div>` : `
          <div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="username" value="${esc(savedEmail())}" required></div>
          <div class="field"><label for="password">Senha</label><input id="password" name="password" type="password" autocomplete="current-password"></div>
          <label class="check"><input type="checkbox" name="remember" ${remembered() ? "checked" : ""}> Manter conectado neste computador</label>
          ${error ? `<p class="form-error">${esc(error)}</p>` : ''}
          <button class="btn btn-primary btn-block" type="submit">Entrar</button>
          <button class="btn btn-ghost btn-block" type="button" id="magic">Receber link de acesso por e-mail</button>`}
      </form>
    </div>`;

  const form = $('#login-form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try { await store.signIn(form.email.value, form.password.value); rememberLogin(form); renderApp(); }
    catch (err) { renderLogin(err.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : err.message); }
  });
  form.querySelectorAll('.demo-user').forEach(b => b.addEventListener('click', async () => {
    await store.signIn(b.dataset.email); renderApp();
  }));
  $('#magic')?.addEventListener('click', async () => {
    try { await store.magicLink(form.email.value); toast('Link enviado. Confira seu e-mail.', { kind: 'success' }); }
    catch (err) { toast(err.message, { kind: 'error' }); }
  });
}

// ------------------------------------------------------------
// Delegação de eventos: [data-act] chama view.actions[act](el, event)
// ------------------------------------------------------------
function delegate(type) {
  document.addEventListener(type, e => {
    const shell = e.target.closest?.('[data-shell]');
    if (shell && type === 'click') return shellAction(shell.dataset.shell);
    const attr = { click: 'act', change: 'change', input: 'input', submit: 'submit' }[type];
    const el = attr ? e.target.closest?.(`[data-${attr}]`) : null;
    const root = $('#view');
    if (!el || !current || !root || !root.contains(el)) return;
    // Clique em link/controle aninhado dentro de um card clicável: deixa o controle agir
    const inner = type === 'click' && e.target.closest('a[href], select, input, textarea');
    if (inner && inner !== el && el.contains(inner)) return;
    const fn = current.view.actions?.[el.dataset[attr]];
    if (!fn) return;
    if (type === 'submit' || (type === 'click' && !['INPUT', 'LABEL'].includes(el.tagName))) e.preventDefault();
    fn(el, e, current.params);
  });
}

function shellAction(a) {
  if (a === 'menu') document.body.classList.toggle('nav-open');
  if (a === 'logout') store.signOut().then(() => renderLogin());
  if (a === 'password') modal({
    title: 'Definir minha senha',
    body: '<p class="muted modal-lead">Depois disso você entra com e-mail e senha, sem precisar do link por e-mail.</p>',
    fields: [
      { name: 'password', label: 'Nova senha (mín. 8)', type: 'password', required: true },
      { name: 'confirm', label: 'Repetir senha', type: 'password', required: true },
    ],
    async onSubmit(v) {
      if (v.password.length < 8) throw new Error('Use pelo menos 8 caracteres.');
      if (v.password !== v.confirm) throw new Error('As senhas não conferem.');
      await store.setPassword(v.password);
      toast('Senha definida. Já pode entrar com e-mail e senha.', { kind: 'success' });
    },
  });
  if (a === 'switch') { store.user = null; renderLogin(); }
  if (a === 'theme') {
    const root = document.documentElement;
    const dark = root.dataset.theme === 'dark';
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('imagine-hub:theme', root.dataset.theme); } catch { /* noop */ }
  }
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
async function boot() {
  try { const t = localStorage.getItem('imagine-hub:theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* noop */ }
  ['click', 'change', 'input', 'submit'].forEach(delegate);
  window.addEventListener('hashchange', () => { document.body.classList.remove('nav-open'); if (store.user) renderView(); });
  store.on(d => { if (d?.auth) return store.user ? renderApp() : renderLogin(); queueRender(); });
  try { await store.init(); if (store.user && !remembered() && !sessionAlive()) await store.signOut(); }
  catch (err) { console.error(err); $('#app').innerHTML = `<div class="boot-error">Falha ao conectar: ${esc(err.message)}</div>`; return; }
  store.user ? renderApp() : renderLogin();
}

boot();

// ------------------------------------------------------------
// "Manter conectado": lembra o e-mail e mantém a sessão entre aberturas do navegador.
// Desmarcado, a sessão termina quando o navegador fecha. A senha fica com o
// gerenciador de senhas do navegador (os campos já pedem para salvar).
// ------------------------------------------------------------
function ls(k, v) { try { return v === undefined ? localStorage.getItem(k) : (v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v)); } catch { return null; } }
function savedEmail() { return ls('imagine-hub:email') || ''; }
function remembered() { return ls('imagine-hub:remember') !== '0'; }
function sessionAlive() { try { return sessionStorage.getItem('imagine-hub:alive') === '1'; } catch { return false; } }
function rememberLogin(form) {
  const keep = form.remember?.checked !== false;
  ls('imagine-hub:remember', keep ? '1' : '0');
  ls('imagine-hub:email', keep ? form.email.value : null);
  try { sessionStorage.setItem('imagine-hub:alive', '1'); } catch { /* noop */ }
}
