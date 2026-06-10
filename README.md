# Desafio Técnico — Dev Hotfix | Sistema de Pagamentos

## Contexto

Você foi chamado às 2h da manhã. O sistema de pagamentos está em produção com bugs críticos reportados por usuários reais. Seu trabalho é diagnosticar e corrigir **todos** os problemas.

Não existe documentação de bugs. Você recebe apenas os relatos dos usuários e o código.

---

## Sintomas reportados pelos usuários

1. *"Às vezes quando me cadastro dá erro, mas quando entro de novo minha conta existe. Aí não consigo ver meu saldo."*

2. *"Fiz vários saques rápidos e meu saldo ficou negativo. Como isso é possível?"*

3. *"Tentei fazer login, a tela travou no carregamento e não sai mais. Só recarregando a página."*

4. *"Fiz um pagamento, deu erro de saldo insuficiente e fui redirecionado para o login. Por quê?"*

5. *"O valor do saldo no topo da página fica diferente do valor na tela do checkout depois de um pagamento falhar."*

---

## Estrutura do projeto

```
/
├── docker-compose.yml
├── package.json                  (bun workspaces)
├── packages/
│   └── db/                       (schema Drizzle + client PostgreSQL)
└── apps/
    ├── api/                      (Hono, porta 3001)
    └── web/                      (Next.js 15, porta 3000)
```

---

## Pré-requisitos

Instale antes de começar:

| Ferramenta | Versão mínima | Link |
|------------|---------------|------|
| [Bun](https://bun.sh) | 1.1+ | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker](https://www.docker.com/get-started) | qualquer | — |
| Docker Compose | v2+ | incluso no Docker Desktop |

Verifique:

```bash
bun --version     # deve mostrar 1.x.x
docker --version
docker compose version
```

---

## Setup passo a passo

Execute os comandos abaixo **na ordem exata**, a partir da raiz do repositório:

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd hypercash-teste

# 2. Suba o banco de dados PostgreSQL
docker compose up -d

# 3. Aguarde o banco ficar saudável (~5 segundos) e confirme:
docker ps   # deve mostrar "healthy" na coluna STATUS

# 4. Configure as variáveis de ambiente
cp apps/api/.env.example        apps/api/.env
cp apps/web/.env.example        apps/web/.env
cp packages/db/.env.example     packages/db/.env

# 5. Instale as dependências (todos os workspaces de uma vez)
bun install

# 6. Crie as tabelas no banco
bun run db:push

# 7. Popule o banco com dados de demonstração
bun run db:seed

# 8. Inicie API + frontend simultaneamente
bun run dev
```

> **Conta demo criada pelo seed:**
> - Email: `demo@hypercash.com`
> - Senha: `Demo@1234`
> - Saldo inicial: R$ 1.000,00 (com histórico de transações)

**Portas após o `bun run dev`:**

| Serviço | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| API (Hono) | http://localhost:3001 |

> Se a porta 3000 ou 3001 já estiver em uso, pare o processo que a ocupa antes de rodar `bun run dev`.

---

## Comandos úteis

```bash
# Rodar só a API
cd apps/api && bun run dev

# Rodar só o frontend
cd apps/web && bun run dev

# Recriar tabelas após alterar o schema
bun run db:push

# Ver logs do banco
docker compose logs postgres

# Parar o banco
docker compose down
```

---

## Variáveis de ambiente

Cada `.env.example` já tem os valores corretos para desenvolvimento local. Copie-os sem modificar a não ser que tenha alterado as configurações do `docker-compose.yml`.

**`apps/api/.env`**
```
DATABASE_URL=postgres://hypercash:hypercash@localhost:5432/hypercash
JWT_SECRET=change-me-in-production-use-a-long-random-string
PORT=3001
```

**`apps/web/.env`**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**`packages/db/.env`**
```
DATABASE_URL=postgres://hypercash:hypercash@localhost:5432/hypercash
```

---

## Entregável

Abra um Pull Request neste repositório com todas as correções aplicadas.

No corpo do PR, descreva **para cada bug encontrado**:

- O sintoma observado
- A causa raiz (qual linha / qual decisão de design causou o problema)
- Como você corrigiu

**Bônus:** adicione um teste automatizado para o endpoint `POST /api/withdraw` cobrindo a condição de race condition.

---

## Critérios de avaliação

| Critério | Peso |
|----------|------|
| Identificação correta dos bugs | Alto |
| Qualidade e corretude das correções | Alto |
| Clareza na descrição das causas raiz | Médio |
| Não introduzir novos bugs ao corrigir os existentes | Alto |
| Teste bônus | Bônus |

---

> **Tempo estimado:** 2–4 horas  
> Dúvidas sobre o setup? Abra uma issue no repositório.
