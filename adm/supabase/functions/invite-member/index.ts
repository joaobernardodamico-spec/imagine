// Convida uma pessoa para o ATLAS. Só sócios podem chamar.
//
// Gera um LINK de convite (não depende do e-mail do Supabase: o SMTP padrão do plano grátis
// só entrega para o próprio time da conta). O sócio manda o link por WhatsApp ou e-mail;
// no primeiro acesso a pessoa entra e o ATLAS pede para ela criar a senha.
//
// body: { email, name, role, title?, color?, avatar_url?, redirectTo?, action?: 'invite' | 'link' }
//   invite (padrão): cria a conta (ou reaproveita um convite pendente), grava o perfil e devolve o link
//   link: só gera um link novo para alguém já convidado (o anterior deixa de valer)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const ROLES = ['socio', 'comercial', 'producao', 'freela'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // quem está chamando?
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user: caller } } = await admin.auth.getUser(token);
    if (!caller) return json({ error: 'Faça login de novo.' }, 401);
    const { data: me } = await admin.from('profiles').select('role').eq('id', caller.id).single();
    if (me?.role !== 'socio') return json({ error: 'Só sócios adicionam pessoas.' }, 403);

    const b = await req.json();
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'E-mail inválido.' }, 400);
    const redirectTo = typeof b.redirectTo === 'string' && /^https?:\/\//.test(b.redirectTo) ? b.redirectTo : undefined;

    // Já tem conta ativa? Então não é convite: é só ajustar o papel na lista.
    const { data: existing } = await admin.from('profiles').select('id, joined_at, invited_at').eq('email', email).maybeSingle();
    if (existing?.joined_at || (existing && !existing.invited_at)) {
      const { data: u } = await admin.auth.admin.getUserById(existing.id);
      if (u?.user?.last_sign_in_at) return json({ error: 'Esse e-mail já tem conta ativa no ATLAS. Ajuste o papel dele na lista.' }, 400);
    }

    // Link de convite (cria a conta se ainda não existir; para convite pendente, gera um link novo)
    let { data: gen, error } = await admin.auth.admin.generateLink({
      type: 'invite', email, options: { data: { name: b.name || '' }, redirectTo },
    });
    if (error && /already|registered|exists/i.test(error.message)) {
      // conta criada mas nunca acessada: um link de acesso direto resolve
      ({ data: gen, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email, options: { redirectTo } }));
    }
    if (error || !gen?.user) return json({ error: error?.message || 'Não consegui gerar o convite.' }, 400);

    const link = gen.properties?.action_link;
    if (b.action === 'link') return json({ link, profile: null });

    // o gatilho handle_new_user cria o perfil como freela; completa com os dados do formulário
    const role = ROLES.includes(b.role) ? b.role : 'freela';
    const profile = {
      id: gen.user.id, email, role, active: true,
      name: b.name || email.split('@')[0],
      title: b.title || '', color: b.color || '#12328C', avatar_url: b.avatar_url || null,
      invited_at: new Date().toISOString(), joined_at: null,
    };
    const { data: saved, error: upErr } = await admin.from('profiles').upsert(profile).select().single();
    if (upErr) return json({ error: upErr.message }, 400);
    return json({ profile: saved, link });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
