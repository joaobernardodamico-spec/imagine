// ============================================================
// Camada de dados
// - Modo Supabase: auth real + Postgres com RLS (cada papel vê o que pode)
// - Modo demo: tudo no localStorage, com dados de exemplo
// As views leem do cache em memória (store.data) e escrevem via
// insert/update/remove, que persistem e notificam re-render.
// ============================================================
import { CONFIG, DEMO } from './config.js';
import { seed } from './seed.js';

export const TABLES = [
  'profiles', 'accounts', 'projects', 'project_members', 'stages', 'tasks',
  'notes', 'files', 'leads', 'revenue', 'goals', 'events', 'xp_events', 'nps',
];

const LS_DATA = 'imagine-hub:data:v2';
const LS_USER = 'imagine-hub:user';

let sb = null;
const listeners = new Set();

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

export const store = {
  demo: DEMO,
  data: Object.fromEntries(TABLES.map(t => [t, []])),
  user: null,

  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  emit(detail) { listeners.forEach(fn => fn(detail)); },

  // ---------- leitura (síncrona, do cache) ----------
  all(table) { return this.data[table] || []; },
  find(table, id) { return this.all(table).find(r => r.id === id) || null; },
  where(table, fn) { return this.all(table).filter(fn); },

  // ---------- boot ----------
  async init() {
    if (DEMO) {
      const raw = safeGet(LS_DATA);
      this.data = raw ? { ...this.data, ...JSON.parse(raw) } : seed();
      if (!raw) persist(this.data);
      const id = safeGet(LS_USER);
      this.user = id ? this.find('profiles', id) : null;
      return;
    }
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    const { data: { session } } = await sb.auth.getSession();
    if (session) await this.loadSession(session);
    sb.auth.onAuthStateChange(async (evt, s) => {
      if (evt === 'SIGNED_OUT') { this.user = null; this.emit({ auth: true }); }
      if (evt === 'SIGNED_IN' && s && !this.user) { await this.loadSession(s); this.emit({ auth: true }); }
    });
  },

  async loadSession(session) {
    const { data: prof } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
    this.user = prof;
    await this.loadAll();
  },

  async loadAll() {
    const results = await Promise.all(TABLES.map(t => sb.from(t).select('*')));
    results.forEach((r, i) => { this.data[TABLES[i]] = r.data || []; });
  },

  // ---------- auth ----------
  async signIn(email, password) {
    if (DEMO) {
      const u = this.all('profiles').find(p => p.email.toLowerCase() === email.toLowerCase());
      if (!u) throw new Error('Usuário não encontrado no modo demo.');
      this.user = u; safeSet(LS_USER, u.id); return u;
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await this.loadSession(data.session);
    return this.user;
  },

  async magicLink(email) {
    if (DEMO) throw new Error('Link mágico só funciona com Supabase configurado.');
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
  },

  async setPassword(password) {
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
  },

  async signOut() {
    if (DEMO) { this.user = null; safeDel(LS_USER); return; }
    await sb.auth.signOut();
    this.user = null;
  },

  // ---------- escrita ----------
  async insert(table, row) {
    const rec = { id: uid(), created_at: new Date().toISOString(), ...row };
    if (DEMO) {
      this.data[table].push(rec); persist(this.data);
    } else {
      const { data, error } = await sb.from(table).insert(rec).select().single();
      if (error) throw error;
      this.data[table].push(data);
      Object.assign(rec, data);
    }
    this.emit({ table, op: 'insert', row: rec });
    return rec;
  },

  async insertMany(table, rows) {
    const recs = rows.map(r => ({ id: uid(), created_at: new Date().toISOString(), ...r }));
    if (!recs.length) return [];
    if (DEMO) {
      this.data[table].push(...recs); persist(this.data);
    } else {
      const { data, error } = await sb.from(table).insert(recs).select();
      if (error) throw error;
      this.data[table].push(...data);
    }
    this.emit({ table, op: 'insertMany' });
    return recs;
  },

  async update(table, id, patch) {
    const row = this.find(table, id);
    if (!row) return null;
    if (!DEMO) {
      const { error } = await sb.from(table).update(patch).eq('id', id);
      if (error) throw error;
    }
    Object.assign(row, patch);
    if (DEMO) persist(this.data);
    this.emit({ table, op: 'update', row });
    return row;
  },

  async remove(table, id) {
    if (!DEMO) {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
    }
    this.data[table] = this.data[table].filter(r => r.id !== id);
    if (DEMO) persist(this.data);
    this.emit({ table, op: 'remove', id });
  },

  // ---------- utilidades do modo demo ----------
  resetDemo() {
    safeDel(LS_DATA);
    this.data = seed(); persist(this.data);
    this.emit({ reset: true });
  },

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    TABLES.forEach(t => { if (Array.isArray(parsed[t])) this.data[t] = parsed[t]; });
    if (DEMO) persist(this.data);
    this.emit({ reset: true });
  },
};

function persist(data) { safeSet(LS_DATA, JSON.stringify(data)); }
function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* storage cheio ou bloqueado */ } }
function safeDel(k) { try { localStorage.removeItem(k); } catch { /* noop */ } }
