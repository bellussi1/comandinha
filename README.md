# Comandinha

Fundação técnica para reconstruir o Comandinha como um monorepo TypeScript. O repositório reúne a interface web existente e uma API NestJS criada de forma independente para preparar a evolução dos fluxos do produto.

## Estado do projeto

Este marco cobre a estrutura local de desenvolvimento, a conexão da API com PostgreSQL, os endpoints de saúde, o contrato OpenAPI e a automação de CI. **Ainda não é uma versão pronta para produção.** A interface web foi migrada e atualizada, mas seus fluxos ainda não foram conectados à nova API.

## Stack

| Área | Tecnologia | Versão fixada |
| --- | --- | --- |
| Runtime | Node.js | 24.21.0 |
| Gerenciador de pacotes | pnpm | 12.11.2 |
| Workspace | Turborepo | 2.11.7 |
| Web | Next.js / React | 16.4.0 / 19.3.0 |
| API | NestJS | 12.1.3 |
| Linguagem | TypeScript | 6.0.3 |
| UI | Tailwind CSS / shadcn CLI / Base UI | 4.3.3 / 4.21.4 / 1.9.0 |
| Banco local | PostgreSQL | 18 (imagem `postgres:18-alpine`) |
| ORM | Prisma / adapter PostgreSQL | 7.10.0 |
| Contrato | Nest Swagger / openapi-typescript / openapi-fetch | 12.0.2 / 7.13.0 / 0.17.0 |

## Pré-requisitos

- Node.js 24.21.0 e pnpm 12.11.2.
- Docker Desktop ou Docker Engine em execução, com Docker Compose.
- Git.

## Desenvolvimento local

Na raiz do repositório, copie a configuração de exemplo e instale as dependências:

```powershell
Copy-Item .env.example .env
pnpm install --frozen-lockfile
```

Inicie o banco e as aplicações com um comando:

```powershell
pnpm dev
```

O comando espera o PostgreSQL ficar saudável antes de iniciar Next.js e NestJS. Para inicializar a tabela definida no schema Prisma, execute em outro terminal enquanto o ambiente está ligado:

```powershell
pnpm --filter @comandinha/api prisma:migrate
```

Ao encerrar o desenvolvimento, `Ctrl+C` finaliza os processos das aplicações. Para parar o contêiner local do banco:

```powershell
pnpm infra:down
```

O Compose mantém o volume local do PostgreSQL para a próxima execução. Use `docker compose down --volumes` somente se também quiser apagar os dados locais.

## Serviços e URLs

| Serviço | URL padrão | O que representa |
| --- | --- | --- |
| Aplicação web | http://localhost:3000 | Interface Next.js |
| API | http://localhost:3001 | API NestJS |
| Swagger | http://localhost:3001/docs | Documentação do contrato atual |
| OpenAPI JSON | http://localhost:3001/openapi.json | Contrato usado para gerar os tipos |
| Liveness | http://localhost:3001/health/live | Confirma que o processo da API responde |
| Readiness | http://localhost:3001/health/ready | Confirma que a API consegue consultar o PostgreSQL |

Liveness e readiness verificam a infraestrutura; não são funcionalidades do produto. A porta do teste Playwright é `3100` e só é usada durante os testes.

## Comandos

| Comando | Uso |
| --- | --- |
| `pnpm lint` | Executa os linters dos pacotes |
| `pnpm typecheck` | Verifica os tipos do monorepo |
| `pnpm test` | Executa testes unitários e dos scripts do workspace |
| `pnpm --filter @comandinha/web exec playwright install chromium` | Instala o navegador usado pelo smoke test |
| `pnpm test:integration` | Executa integração com PostgreSQL e smoke test Playwright |
| `pnpm build` | Gera os builds de produção para validação local |
| `pnpm api:client:generate` | Atualiza o contrato e os tipos TypeScript do cliente |
| `pnpm api:client:check` | Falha se OpenAPI ou tipos gerados estiverem desatualizados |
| `pnpm --filter @comandinha/api prisma:migrate` | Aplica as migrações PostgreSQL pendentes |
| `pnpm infra:down` | Para o banco local iniciado pelo Compose |

O CI executa instalação congelada, migração, lint, verificação de tipos, testes, integração, validação do cliente OpenAPI e build. Ele usa credenciais descartáveis de teste e não publica ou implanta aplicações.

## Variáveis de ambiente

O arquivo `.env.example` contém valores fictícios para desenvolvimento local. Copie-o para `.env`, que é ignorado pelo Git. Não use esses valores fora da máquina local.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `POSTGRES_USER` | `comandinha` | Usuário do PostgreSQL local |
| `POSTGRES_PASSWORD` | `change-me-local-only` | Senha fictícia local |
| `POSTGRES_DB` | `comandinha` | Banco local |
| `POSTGRES_PORT` | `5432` | Porta de loopback publicada pelo Compose |
| `DATABASE_URL` | URL local em `127.0.0.1:5432` | Conexão Prisma; mantenha usuário, senha, banco e porta alinhados com as variáveis acima |
| `API_PORT` | `3001` | Porta da API |

Se a porta 5432 já estiver ocupada, escolha outra em `POSTGRES_PORT` e atualize a porta em `DATABASE_URL` para o mesmo valor. As portas publicadas pelo Compose ficam vinculadas a `127.0.0.1`.

## Limitações atuais

- A API disponibiliza liveness, readiness e o schema inicial `Restaurant`; não possui autenticação, autorização, isolamento por restaurante ou endpoints de negócio.
- Cardápio, mesas, pedidos, divisão de conta e os fluxos administrativos ainda precisam ser reconstruídos e integrados à API.
- O backend legado é apenas referência: seu código e seu banco de dados não foram incorporados. O repositório legado não declara licença.
- Não há deploy, infraestrutura de produção, dados de clientes ou alegação de prontidão operacional neste marco.

Consulte [ADR 0001](docs/adr/0001-typescript-monorepo.md) para as decisões e os trade-offs desta fundação.
