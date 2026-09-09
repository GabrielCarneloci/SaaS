# Radar de Leads

Encontra empresas locais sem site no Google Maps.

## Rodar local

```bash
npm install
```

Crie `.env.local`:
```
GOOGLE_PLACES_API_KEY=sua_chave_do_google
```

```bash
npm run dev
```

Abre `http://localhost:3000`. Os leads ficam salvos em `data/leads.json`.

## Colocar no ar (Railway)

1. Suba o código pro GitHub (sem `.next` e `node_modules` — já estão no `.gitignore`)
2. Acesse **railway.app** → login com GitHub
3. "New Project" → "Deploy from GitHub repo" → selecione o repositório
4. Em "Variables", adicione:
   - `GOOGLE_PLACES_API_KEY` → sua chave do Google
   - `DATA_DIR` → `/data`
5. Adicione um **Volume** ao serviço (aba "Settings" → "Volumes"):
   - Mount path: `/data`
   - Isso garante que os leads não se percam a cada novo deploy
6. Railway detecta automaticamente que é Next.js e faz o build/deploy

Ele te dá uma URL pública (tipo `radar-de-leads.up.railway.app`), com plano
pago (tem trial grátis com créditos pra testar).

## Estrutura
- `app/dashboard` — busca e resultados
- `app/api/leads/search` — busca no Google Places, filtra sem site, salva no arquivo
- `app/api/leads/list` — lista leads salvos
- `lib/localStorage.ts` — leitura/escrita do arquivo JSON (usa `DATA_DIR` se definido)
- `data/leads.json` — onde os leads ficam salvos localmente
