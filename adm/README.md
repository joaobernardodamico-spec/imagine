# IMAGINE Hub · `/adm`

Organizador interno da IMAGINE: projetos, processos, CRM, financeiro, metas, agenda e gamificação.
É HTML, CSS e JS puros (módulos ES), sem build. Funciona em `www.imagineconcept.com.br/adm`.

## Como está organizado

```
adm/
├── index.html
├── assets/
│   ├── css/app.css          sistema visual (Helvetica, navy/sky/cream, claro e escuro)
│   ├── img/                 logos extraídas do site
│   └── js/
│       ├── config.js        ← chaves, papéis, as 9 etapas, XP, metas (edite aqui)
│       ├── store.js         dados: Supabase ou modo demo (localStorage)
│       ├── ops.js           regras: permissões, etapas, CRM, metas
│       ├── game.js          XP, níveis, conquistas, ranking
│       ├── google.js        Google Agenda
│       ├── seed.js          dados de exemplo do modo demo
│       └── views/           uma tela por arquivo
└── supabase/schema.sql      banco + segurança por papel (RLS)
```

## Modo demo (agora)

Sem configurar nada, o Hub roda com dados de exemplo salvos **só no seu navegador**.
Na tela de login dá pra entrar como cada papel (sócio, comercial, produção, freela) e ver a visão de cada um.

Para testar local: `node .claude/serve.mjs` e abra `http://localhost:5510/adm/`.

## Colocar pra valer (Supabase, grátis)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → cole e rode todo o `supabase/schema.sql`.
3. **Authentication → Providers**: deixe Email ligado. Em **URL Configuration**, adicione
   `https://www.imagineconcept.com.br/adm/` em *Site URL* e *Redirect URLs*.
4. **Authentication → Users → Invite user**: convide seu e-mail e o da equipe.
5. Entre no Hub uma vez. Depois, no SQL Editor:
   ```sql
   update profiles set role = 'socio', name = 'João Bernardo' where email = 'seu@email';
   ```
   Todo mundo entra como `freela` (menor acesso). Você ajusta os papéis em **Equipe**.
6. **Project Settings → API**: copie *Project URL* e *anon public key* para `assets/js/config.js`.

A anon key pode ficar no código: ela é pública por design. Quem protege os dados é o RLS.
Freela não lê CRM nem financeiro nem projetos alheios **no banco**, e não só na interface.

## Google Agenda

1. [console.cloud.google.com](https://console.cloud.google.com) → crie um projeto.
2. **APIs & Services → Library** → ative **Google Calendar API**.
3. **OAuth consent screen** → tipo *External*, adicione os e-mails da equipe como *test users*.
4. **Credentials → Create credentials → OAuth client ID** → *Web application*.
   *Authorized JavaScript origins*: `https://www.imagineconcept.com.br` (e `http://localhost:5510` para testes).
5. Cole o Client ID em `GOOGLE_CLIENT_ID` no `config.js`.

Na Agenda, clique em **Conectar Google Agenda**. O Hub lê seus eventos e cria novos direto no Google.
O token fica só na sessão do navegador.

## Hospedar no seu próprio servidor

Dá, e sem mudar código:

- **Front (este `/adm`)**: são arquivos estáticos. Qualquer servidor serve: Nginx, Apache, Caddy, ou o GitHub Pages atual.
- **Banco**: o Supabase é open source. Num VPS (Hetzner, DigitalOcean, Contabo; 4 GB de RAM já roda)
  você sobe com Docker (`supabase/docker` no repositório oficial) e troca só a `SUPABASE_URL` no `config.js`.
- Caminho recomendado: começar no Supabase Cloud (grátis) e migrar quando fizer sentido. É o mesmo Postgres; exporta e importa com `pg_dump`.

Exemplo Nginx servindo o site + `/adm`:

```nginx
server {
  server_name www.imagineconcept.com.br;
  root /var/www/imagine;
  location /adm/ { try_files $uri $uri/ /adm/index.html; add_header X-Robots-Tag "noindex"; }
}
```

## Personalizar

Tudo que é regra de negócio está em `config.js`:

- `STAGES`: as 9 etapas do processo e o checklist de cada uma por trilha (branding, web, social…)
- `ACCESS`: quais módulos cada papel vê
- `XP` e `LEVELS`: quanto vale cada ação e os níveis (Aprendiz → Lendário)
- `LEAD_STAGES`, `GOAL_METRICS`, `TRACKS`

## Próximas fases sugeridas

- Formulário público de NPS e de briefing (cliente preenche por link)
- Portal do cliente (papel `cliente`, só leitura do próprio projeto)
- Upload de arquivos (Supabase Storage) para contrato e briefing em PDF
- Tempo real entre a equipe (Supabase Realtime)
- XP calculado por trigger no banco (hoje é gravado pelo navegador, o que basta para uma equipe interna)
