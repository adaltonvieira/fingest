# Fingest — Sistema de Gestão Financeira

Fase 0 + Fase 1 do roadmap: fundação do projeto + core financeiro (contas, categorias, transações, dashboard).

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL + Redis, autenticação JWT (access + refresh token com rotação)
- **Frontend**: React + Vite + TypeScript + Tailwind + React Query + Zustand
- **Infra**: Docker Compose (banco, cache, backend, frontend)

## Como rodar (Docker)

Na raiz do projeto:

```bash
docker compose up --build
```

Isso vai subir:
- PostgreSQL em `localhost:5432`
- Redis em `localhost:6379`
- Backend (API) em `http://localhost:3333` — documentação Swagger em `http://localhost:3333/docs`
- Frontend em `http://localhost:5173`

Na primeira vez, o backend roda `prisma migrate deploy` automaticamente ao subir o container. Se for a primeiríssima execução (banco vazio), gere a migration inicial antes de subir tudo:

```bash
cd backend
npm install
npx prisma migrate dev --name init
cd ..
docker compose up --build
```

### Popular dados de exemplo (opcional)

```bash
docker compose exec backend npm run prisma:seed
```
Cria o usuário `admin@fingest.local` / senha `MudarSenha123!` com contas e categorias padrão.

## Estrutura do projeto

```
fingest/
├── docker-compose.yml
├── backend/
│   ├── prisma/schema.prisma      # modelo de dados
│   ├── prisma/seed.ts            # dados iniciais
│   └── src/
│       ├── auth/                 # registro, login, refresh token
│       ├── accounts/             # contas bancárias/carteiras
│       ├── categories/           # categorias e subcategorias
│       ├── transactions/         # receitas e despesas (com parcelamento)
│       ├── dashboard/            # KPIs agregados
│       └── common/               # guards, filtros, decorators
└── frontend/
    └── src/
        ├── pages/                # Login, Register, Dashboard, Transactions, Accounts, Categories
        ├── components/           # Layout, KpiCard, Modal
        ├── store/                # estado de autenticação (Zustand)
        └── api/                  # cliente HTTP com refresh automático
```

## O que já funciona nesta fase

- Cadastro e login com JWT (access token de 15 min + refresh token de 7 dias, rotacionado a cada uso)
- CRUD de contas (corrente, poupança, carteira, dinheiro, PIX, investimento, cripto)
- CRUD de categorias com subcategorias, cor e ícone
- Lançamento de receitas/despesas com **parcelamento automático** (gera N transações vinculadas por `installmentGroupId`)
- Atualização automática de saldo da conta quando um lançamento é marcado como pago/recebido
- Dashboard com saldo atual, receitas/despesas do mês, lucro, contas a pagar/receber, saldo previsto, últimas movimentações e gráfico de despesas por categoria
- Filtros de transações por tipo/categoria/conta/status/período
- Documentação automática da API via Swagger (`/docs`)

## Deploy no Railway (quando for a hora)

1. Suba o repositório para o GitHub.
2. No Railway, crie um projeto e adicione:
   - Um serviço PostgreSQL (plugin gerenciado do Railway)
   - Um serviço a partir do `backend/Dockerfile`, com `DATABASE_URL` apontando para o Postgres do Railway e as demais variáveis de `.env.example`
   - Um serviço a partir do `frontend/Dockerfile`, com `VITE_API_URL` apontando para a URL pública do backend
3. Rode `npx prisma migrate deploy` no serviço do backend (Railway permite rodar comandos via shell do serviço, ou você adiciona isso ao comando de start, como já está no `Dockerfile`).

## Próximas fases (roadmap)

| Fase | Conteúdo |
|---|---|
| 2 | Cartões de crédito, faturas |
| 3 | Contas a pagar/receber avançado + automações recorrentes |
| 4 | Investimentos e metas |
| 5 | Relatórios avançados (DRE, comparativos) |
| 6 | Importação/exportação (CSV, OFX, QIF, JSON) |
| 7 | 2FA, auditoria, backup, tema escuro, polimento final |
