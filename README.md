# PrecificaAPI

Aplicação web de precificação de salgados para a Donna Salgados, em Aparecida de Goiânia. Projeto individual de extensão de POO III da UNIFAN.

[Repositório no GitHub](https://github.com/thgcunha/PrecificaAPI)

Na Fase 0, a API disponibiliza `GET /health`, a interface apresenta a página inicial e a configuração do PostgreSQL local está em Docker Compose. A API inicia independentemente do banco nesta etapa.

## Estrutura

- `apps/api` contém a API NestJS e o teste de integração com Jest.
- `apps/web` contém o front-end React com Vite.
- `docs` reúne a documentação técnica e de extensão.
- `.github/workflows/ci.yml` verifica formatação, lint, build e testes em pushes e pull requests para `main`.

O npm gerencia os dois workspaces a partir da raiz. Ambos herdam `strict: true` de `tsconfig.base.json`.

## Rodar no Windows

Use Node.js 24 LTS, no patch mais recente da série, com o npm incluído. Os comandos abaixo usam PowerShell na raiz do projeto.

```powershell
npm ci
```

Em um terminal, inicie a API.

```powershell
npm run dev:api
```

Em outro terminal, inicie a interface.

```powershell
npm run dev:web
```

Por padrão, a interface abre em `http://localhost:5173/` e a API responde em `http://localhost:3000/health`. Em um terceiro terminal, confirme a resposta da API.

```powershell
Invoke-RestMethod http://localhost:3000/health | ConvertTo-Json -Compress
```

A resposta esperada é `{"status":"ok"}`.

## PostgreSQL local

Com o Docker Desktop iniciado, prepare o `.env` com os valores de exemplo locais. Se o arquivo já existir, preserve a sua configuração.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d --wait postgres
docker compose ps postgres
```

O banco fica disponível em `127.0.0.1:5432` e usa um volume persistente. Se o Windows recusar o uso da porta 5432, defina `POSTGRES_PORT=5433` no `.env` e repita `docker compose up -d --wait postgres`. Nesse caso, conecte pelo endereço `127.0.0.1:5433`. Para parar o banco e preservar o volume, rode `docker compose stop postgres`.

## Verificações

```powershell
npm run format:check
npm run lint
npm run build
npm test
```

Para rodar a API compilada após o build, use `npm run start --workspace "@precifica/api"`. Para servir o build web localmente, use `npm run preview --workspace "@precifica/web"`.

## Publicação prevista

O React será publicado no Netlify, a API NestJS no Render e o banco PostgreSQL no Neon. A URL de conexão do Neon será configurada como segredo no Render na fase de publicação. A versão local usa PostgreSQL em Docker Compose. A rotina de backup e restauração com `pg_dump` será entregue na fase de publicação.

## Próxima fase

O domínio de precificação será escrito em TypeScript puro. Os cálculos preservam a precisão em Decimal, e o preço sugerido é arredondado para cima ao centavo apenas no final. Com custo direto de R$ 2,00 e percentuais somando 67%, o preço sugerido no iFood é R$ 6,07.
