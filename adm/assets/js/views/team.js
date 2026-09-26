// Equipe e configurações (só sócios).
import { store } from '../store.js';
import { ROLES, ACCESS, DEMO } from '../config.js';
import { me } from '../ops.js';
import { levelOf, xpOf } from '../game.js';
import { esc, icon, avatar, modal, toast } from '../util.js';
import { pageHead } from './components.js';
import { seed } from '../seed.js';
import { uid } from '../store.js';

const MODULE_LABEL = {
  dashboard: 'Hoje', projetos: 'Projetos', contas: 'Contas', processos: 'Processos', crm: 'CRM',
  financeiro: 'Financeiro', metas: 'Metas', agenda: 'Agenda', ranking: 'Ranking', equipe: 'Equipe', config: 'Config',
};

export default {
  title: () => 'Equipe',

  render() {
    const people = store.all('profiles');
    return `<div class="page">
      ${pageHead('Equipe', 'Quem faz parte, com qual papel. O papel define o que cada pessoa vê.',
        `<button class="btn btn-primary" data-act="newMember">${icon('plus')} Adicionar pessoa</button>`)}

      <section class="card">
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Pessoa</th><th>Função</th><th>Papel no Hub</th><th>Nível</th><th>Projetos</th><th></th></tr></thead>
          <tbody>${people.map(p => {
            const lv = levelOf(xpOf(p.id));
            const n = store.where('project_members', m => m.user_id === p.id).length;
            return `<tr class="${p.active === false ? 'inactive' : ''}">
              <td><span class="person">${avatar(p, 32)}<span><strong>${esc(p.name)}</strong><small class="muted">${esc(p.email)}</small></span></span></td>
              <td>${esc(p.title || '')}</td>
              <td><select class="mini" data-change="role" data-id="${esc(p.id)}" ${p.id === me().id ? 'disabled title="Você não pode mudar o próprio papel"' : ''}>
                ${Object.entries(ROLES).map(([k, r]) => `<option value="${k}" ${k === p.role ? 'selected' : ''}>${r.label}</option>`).join('')}</select></td>
              <td>Nv ${lv.n} · ${esc(lv.name)}</td>
              <td>${n}</td>
              <td><button class="icon-btn" data-act="editMember" data-id="${esc(p.id)}" title="Editar">${icon('edit', 16)}</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </section>

      <section class="card mt-24">
        <div class="card-head"><h2>O que cada papel vê</h2></div>
        <div class="table-wrap"><table class="table matrix">
          <thead><tr><th>Módulo</th>${Object.values(ROLES).map(r => `<th>${r.label}</th>`).join('')}</tr></thead>
          <tbody>${Object.entries(ACCESS).map(([mod, roles]) => `<tr><td>${MODULE_LABEL[mod] || mod}</td>${Object.keys(ROLES).map(k =>
            `<td>${roles.includes(k) ? icon('check', 16) : '<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>
        <p class="fine">Freela vê só os projetos em que foi escalado. No banco, isso é garantido por RLS, não só pela interface.</p>
      </section>

      <section class="card mt-24">
        <div class="card-head"><h2>Dados e configuração</h2><span class="tag">${DEMO ? 'Modo demo · localStorage' : 'Supabase conectado'}</span></div>
        ${DEMO ? `<p>Os dados estão só neste navegador. Para usar com a equipe, preencha <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> em <code>adm/assets/js/config.js</code> e rode <code>adm/supabase/schema.sql</code>. Passo a passo no <code>adm/README.md</code>.</p>` : '<p>Dados no Supabase com Row Level Security.</p>'}
        <div class="row gap-8 wrap mt-16">
          <button class="btn btn-ghost" data-act="exportData">${icon('file', 16)} Exportar backup (JSON)</button>
          ${DEMO ? `<label class="btn btn-ghost">${icon('refresh', 16)} Importar backup<input type="file" accept="application/json" data-change="importData" hidden></label>
          <button class="btn btn-danger-ghost" data-act="resetDemo">${icon('trash', 16)} Restaurar dados iniciais</button>` : `<button class="btn btn-primary" data-act="importSeed">${icon('refresh', 16)} Carregar dados iniciais</button>`}
        </div>
      </section>
    </div>`;
  },

  actions: {
    role(el) { store.update('profiles', el.dataset.id, { role: el.value }).then(() => toast('Papel atualizado')); },
    newMember() { memberModal(); },
    editMember(el) { memberModal(store.find('profiles', el.dataset.id)); },
    exportData() {
      const blob = new Blob([store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `imagine-hub-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    importData(el) {
      const f = el.files?.[0];
      if (!f) return;
      f.text().then(t => { store.importJSON(t); toast('Backup importado', { kind: 'success' }); }).catch(() => toast('Arquivo inválido', { kind: 'error' }));
    },
    resetDemo() { if (confirm('Apagar tudo deste navegador e voltar aos dados iniciais?')) store.resetDemo(); },
    async importSeed() { if (confirm('Carregar Outdoor Mídia, faturamento de R$ 10k e metas no banco? Use só uma vez.')) { try { await importSeed(); toast('Dados iniciais carregados', { kind: 'success' }); } catch (e) { toast(e.message, { kind: 'error' }); } } },
  },
};

function memberModal(p = {}) {
  const isNew = !p.id;
  modal({
    title: isNew ? 'Adicionar pessoa' : p.name,
    body: isNew && !DEMO ? '<p class="muted modal-lead">No Supabase: convide o e-mail em Authentication → Users → Invite. O perfil é criado sozinho no primeiro login; depois ajuste o papel aqui.</p>' : '',
    fields: [
      { name: 'name', label: 'Nome', required: true, value: p.name },
      { name: 'email', label: 'E-mail', type: 'email', required: true, value: p.email },
      { name: 'title', label: 'Função', value: p.title, placeholder: 'Ex.: Designer' },
      { name: 'role', label: 'Papel no Hub', type: 'select', value: p.role || 'producao', options: Object.entries(ROLES).map(([k, r]) => [k, `${r.label} — ${r.desc}`]) },
      { name: 'color', label: 'Cor', type: 'color', value: p.color || '#12328C' },
      ...(!isNew ? [{ name: 'active', label: 'Status', type: 'checkbox', checkLabel: 'Ativo', value: p.active !== false }] : []),
    ],
    async onSubmit(v) {
      if (isNew) {
        if (!DEMO) throw new Error('Convide pelo Supabase (Authentication → Invite). O perfil aparece aqui no primeiro login.');
        await store.insert('profiles', { ...v, active: true });
      } else await store.update('profiles', p.id, v);
    },
  });
}

// Sobe os dados reais do seed para o Supabase, trocando os ids de exemplo por UUIDs
async function importSeed() {
  const data = seed();
  const map = new Map([['u-joao', me().id]]);
  const accs = store.all('accounts');
  data.accounts.forEach(a => { const ex = accs.find(x => x.name === a.name); map.set(a.id, ex ? ex.id : uid()); });
  const fix = v => (typeof v === 'string' && map.has(v) ? map.get(v) : v);
  const idOf = v => { if (!map.has(v)) map.set(v, uid()); return map.get(v); };
  const conv = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, k === 'id' ? idOf(v) : fix(v)]));
  const newAccs = data.accounts.filter(a => !accs.some(x => x.name === a.name)).map(conv);
  await store.insertMany('accounts', newAccs);
  // refs (ref_id) apontam para ids convertidos depois de converter as tabelas-alvo
  for (const t of ['projects', 'project_members', 'stages', 'tasks', 'revenue', 'goals']) await store.insertMany(t, data[t].map(conv));
  await store.insertMany('xp_events', data.xp_events.map(r => ({ ...conv(r), ref_id: map.get(r.ref_id) || r.ref_id })));
}
