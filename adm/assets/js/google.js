// Integração com Google (Agenda e planilha de respostas do briefing) via Google Identity Services.
// Precisa de CONFIG.GOOGLE_CLIENT_ID. O token fica só na sessão do navegador.
import { CONFIG } from './config.js';

// Um login cobre os dois usos. A planilha exige a Google Sheets API ativada no mesmo projeto do Google Cloud.
const SCOPE = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/spreadsheets.readonly';
const KEY = 'imagine-hub:gtoken';
const API = 'https://www.googleapis.com/calendar/v3';

let tokenClient = null;
let cache = { key: '', items: [] };

export const configured = () => !!CONFIG.GOOGLE_CLIENT_ID;

function readToken() {
  try {
    const t = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return t && t.exp > Date.now() ? t : null;
  } catch { return null; }
}
// scope: trecho do escopo exigido (ex.: 'spreadsheets'); tokens antigos só tinham a Agenda
export const connected = (scope = '') => { const t = readToken(); return !!t && (!scope || String(t.scope || '').includes(scope)); };

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = res; s.onerror = () => rej(new Error('Não foi possível carregar o Google.'));
    document.head.appendChild(s);
  });
}

export async function connect() {
  if (!configured()) throw new Error('Configure GOOGLE_CLIENT_ID em assets/js/config.js');
  await loadGis();
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: r => {
        if (r.error) return reject(new Error(r.error));
        try { sessionStorage.setItem(KEY, JSON.stringify({ token: r.access_token, scope: r.scope || '', exp: Date.now() + (r.expires_in - 60) * 1000 })); } catch { /* noop */ }
        cache = { key: '', items: [] };
        resolve();
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

export function disconnect() {
  const t = readToken()?.token;
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t);
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
  cache = { key: '', items: [] };
}

async function api(path, opts = {}) {
  const token = readToken()?.token;
  if (!token) throw new Error('Conecte o Google Agenda de novo.');
  const r = await fetch(API + path, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (r.status === 401) { disconnect(); throw new Error('Sessão do Google expirou.'); }
  if (!r.ok) throw new Error(`Google Agenda: ${r.status}`);
  return r.status === 204 ? null : r.json();
}

export async function listEvents(from, to) {
  const key = from + to;
  if (cache.key === key) return cache.items;
  const q = new URLSearchParams({ timeMin: new Date(from).toISOString(), timeMax: new Date(to).toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
  const data = await api(`/calendars/${encodeURIComponent(CONFIG.GOOGLE_CALENDAR_ID)}/events?${q}`);
  cache = {
    key,
    items: (data.items || []).map(e => ({
      id: 'g-' + e.id, title: e.summary || '(sem título)', source: 'google', url: e.htmlLink,
      start: e.start.dateTime || e.start.date, end: e.end?.dateTime || e.end?.date, allDay: !e.start.dateTime,
    })),
  };
  return cache.items;
}

export async function createEvent({ title, start, end, description = '' }) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = { summary: title, description, start: { dateTime: new Date(start).toISOString(), timeZone: tz }, end: { dateTime: new Date(end).toISOString(), timeZone: tz } };
  const r = await api(`/calendars/${encodeURIComponent(CONFIG.GOOGLE_CALENDAR_ID)}/events`, { method: 'POST', body: JSON.stringify(body) });
  cache = { key: '', items: [] };
  return r;
}

export async function deleteEvent(id) {
  await api(`/calendars/${encodeURIComponent(CONFIG.GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(id)}`, { method: 'DELETE' });
  cache = { key: '', items: [] };
}

// Respostas do Forms: lê a planilha ligada ao formulário (linha 1 = perguntas)
export async function sheetValues(id, range) {
  const token = readToken()?.token;
  if (!token) throw new Error('Conecte sua conta Google.');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) { disconnect(); throw new Error('Sessão do Google expirou. Tente de novo.'); }
  if (r.status === 403) throw new Error('Sem acesso à planilha. Ative a Google Sheets API no Google Cloud e entre com a conta dona do Forms.');
  if (!r.ok) throw new Error(`Planilha: erro ${r.status}`);
  return (await r.json()).values || [];
}
