# Comandinha

Monorepo TypeScript para a evolução do Comandinha. Reúne a interface Next.js, uma API NestJS e o PostgreSQL local para catálogo, mesas com QR, pedidos e atendimentos por sessão. **O produto segue em migração e não está pronto para produção.**

## Estado do projeto

O monorepo possui uma base NestJS/PostgreSQL, identidade administrativa com memberships, sessões opacas revogáveis, gateway same-origin no Next.js e um novo catálogo isolado para produtos e categorias. **Ainda não é uma versão pronta para produção:** a migração do restante da operação continua em andamento.

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
nvm use 24.21.0
Copy-Item .env.example .env
pnpm install --frozen-lockfile
```

Antes de iniciar, defina `API_INTERNAL_URL` para a porta configurada em `API_PORT`, mantenha `APP_ORIGIN` em `http://localhost:3000` e substitua `AUTH_GATEWAY_SECRET` por um valor aleatório exclusivo com pelo menos 32 caracteres. Gere um segredo local com:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

O Turbo repassa essas variáveis apenas às tarefas de desenvolvimento.

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
| Readiness | http://localhost:3001/health/ready | Confirma que a API consegue consultar o PostgreSQL com timeout de 2 segundos |

Liveness e readiness verificam a infraestrutura; não são funcionalidades do produto. A porta do teste Playwright é `3100` e só é usada durante os testes.

## Painel administrativo em transição

- `http://localhost:3000/painel/login` usa as sessões administrativas do NestJS. Em desenvolvimento local, entre com o e-mail e a senha configurados em `DEMO_OWNER_EMAIL` e `DEMO_OWNER_PASSWORD` no `.env`, após aplicar as migrações e executar o seed local.
- `http://localhost:3000/painel/catalogo` gerencia categorias e produtos no PostgreSQL novo. `OWNER` e `ADMIN` podem alterar o catálogo; `STAFF` pode consultá-lo.
- `http://localhost:3000/painel/mesas` gerencia mesas, ativa/desativa o acesso, abre atendimentos, consulta contas e encerra sessões depois que os pedidos forem finalizados. Também exibe o QR e o link público de cada mesa.
- `http://localhost:3000/painel/pedidos` acompanha os pedidos recebidos pelo QR e permite avançar o status de preparo e entrega.
- O catálogo local abastece o cardápio QR novo. Os dados do sistema legado não foram copiados ou migrados para o PostgreSQL novo.
- `/admin` permanece como área administrativa legada durante a migração. Seus fluxos continuam usando a autenticação e a API existentes até serem substituídos por novas áreas do painel.

### Fluxo local de demonstração

O seed local cria ou atualiza o restaurante e o proprietário configurados no `.env`, além de três mesas, quatro categorias e oito produtos de demonstração. Para executar o fluxo completo:

1. Copie `.env.example` para `.env` e preencha `DEMO_OWNER_NAME`, `DEMO_OWNER_EMAIL`, `DEMO_OWNER_PASSWORD` (mínimo de 12 caracteres), `DEMO_RESTAURANT_NAME` e `DEMO_RESTAURANT_SLUG`. Defina `ALLOW_LOCAL_DEMO_SEED=true` somente para esse banco local.
2. Inicie o ambiente com `pnpm dev`. Em outro terminal, aplique a migração e crie os dados de demonstração:

   ```powershell
   pnpm --filter @comandinha/api prisma:migrate
   pnpm --filter @comandinha/api seed
   ```

3. Entre em `http://localhost:3000/painel/login` com `DEMO_OWNER_EMAIL` e `DEMO_OWNER_PASSWORD`.
4. Abra `/painel/mesas`, escolha **Ver QR** e abra o link público exibido. O seed cria uma sessão inicial para cada mesa de demonstração sem histórico; a rota `/q/{code}` mostra o cardápio da mesa, permite adicionar produtos e enviar pedidos.
5. Abra `/painel/pedidos` e avance o pedido por **Iniciar preparo**, **Marcar como pronto** e **Entregar**. O cardápio público acompanha o status do pedido enquanto a página está aberta.
6. Em `/painel/mesas`, abra **Ver conta**, confira os pedidos e encerre o atendimento. O total final é calculado pela API com os pedidos entregues. Para receber novos pedidos na mesma mesa, abra um novo atendimento; o QR permanece igual e o histórico anterior continua preservado.

O fluxo de demonstração cobre catálogo, QR, carrinho, pedidos e encerramento local de atendimento. Encerrar registra o total da sessão; não confirma nem processa pagamento. Pagamento e chamada de garçom estão fora deste fluxo.

## Comandos

| Comando | Uso |
| --- | --- |
| `pnpm lint` | Executa os linters dos pacotes |
| `pnpm typecheck` | Verifica os tipos do monorepo |
| `pnpm test` | Executa testes unitários e dos scripts do workspace |
| `pnpm --filter @comandinha/api test:e2e` | Executa os testes HTTP de saúde e do contrato OpenAPI |
| `pnpm --filter @comandinha/web exec playwright install chromium` | Instala o navegador usado pelo smoke test |
| `pnpm --filter @comandinha/web exec playwright test e2e/painel-catalog.spec.ts` | Valida login, catálogo, arquivamento/restauração e logout do painel novo |
| `pnpm --filter @comandinha/web test:e2e` | Executa toda a suíte Playwright, incluindo QR, carrinho, pedido, acompanhamento e compatibilidade com as rotas legadas |
| `pnpm test:integration` | Executa integração com PostgreSQL e smoke test Playwright |
| `pnpm build` | Gera os builds de produção para validação local |
| `pnpm api:client:generate` | Atualiza o contrato e os tipos TypeScript do cliente |
| `pnpm api:client:check` | Falha se OpenAPI ou tipos gerados estiverem desatualizados |
| `pnpm --filter @comandinha/api prisma:migrate` | Aplica as migrações PostgreSQL pendentes |
| `pnpm --filter @comandinha/api seed` | Cria ou atualiza o proprietário e restaurante locais e insere 3 mesas, 4 categorias e 8 produtos de demonstração; requer `ALLOW_LOCAL_DEMO_SEED=true`, PostgreSQL de loopback e variáveis `DEMO_*` |
| `pnpm infra:down` | Para o banco local iniciado pelo Compose |

O CI executa instalação congelada, migração, lint, verificação de tipos, testes unitários, E2E HTTP da API, integração com PostgreSQL, smoke test Playwright, validação do cliente OpenAPI e build. Ele usa credenciais descartáveis de teste e não publica ou implanta aplicações.

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
| `API_INTERNAL_URL` | `http://127.0.0.1:3001` | Origem da API usada apenas no servidor Next.js |
| `APP_ORIGIN` | `http://localhost:3000` | Origem exata aceita nas mutações do gateway de sessão |
| `AUTH_GATEWAY_SECRET` | Substitua pelo seu próprio valor aleatório | Segredo server-only compartilhado entre Next.js e NestJS; exige pelo menos 32 caracteres e nunca deve usar o prefixo `NEXT_PUBLIC_` |
| `TRUSTED_CLIENT_IP_HEADER` | Não usado na Vercel | Em outros hosts de produção, nome do cabeçalho de IP que um proxy confiável sobrescreve antes de encaminhar a requisição |
| `ALLOW_LOCAL_DEMO_SEED` | `false` | Opt-in explícito para executar o seed local; a URL do banco também precisa apontar para loopback |
| `DEMO_OWNER_NAME` | Vazio | Nome usado pelo seed explícito de desenvolvimento |
| `DEMO_OWNER_EMAIL` | Vazio | E-mail normalizado do proprietário local |
| `DEMO_OWNER_PASSWORD` | Vazio | Senha local com pelo menos 12 caracteres; escolha uma antes de executar o seed |
| `DEMO_RESTAURANT_NAME` | Vazio | Nome do restaurante local |
| `DEMO_RESTAURANT_SLUG` | Vazio | Slug único do restaurante local |

Se a porta 5432 já estiver ocupada, escolha outra em `POSTGRES_PORT` e atualize a porta em `DATABASE_URL` para o mesmo valor. As portas publicadas pelo Compose ficam vinculadas a `127.0.0.1`.

Para habilitar o gateway local, gere um segredo aleatório com `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"` e use o mesmo valor em `AUTH_GATEWAY_SECRET`. Configure também `APP_ORIGIN` para a origem exata do navegador, sem caminho. Em produção, `API_INTERNAL_URL` precisa usar HTTPS. Depois de aplicar a migração, defina `ALLOW_LOCAL_DEMO_SEED=true`, preencha as cinco variáveis `DEMO_*` no `.env` local e execute o seed. Ele só aceita PostgreSQL em `localhost`, `127.0.0.0/8` ou `::1` e recusa `NODE_ENV=production`. O seed cria três mesas com códigos QR estáveis, quatro categorias e oito produtos de exemplo para o catálogo local; pode ser executado novamente sem duplicá-los e preserva produtos existentes e registros personalizados. Cada QR usa o código público da mesa na rota `/q/{code}`. Nenhum dado é apagado.

O Next.js expõe `POST /api/auth/login`, `GET /api/auth/session` e `DELETE /api/auth/session`. O segredo opaco da sessão fica em cookie HttpOnly, SameSite=Lax e Path=/; em produção o cookie também usa Secure e o prefixo `__Host-`. A resposta do navegador contém somente metadados seguros. O Next envia o segredo de gateway e o token ao Nest no servidor; o navegador nunca recebe nenhum deles. `GET /api/auth/session` valida a sessão a cada chamada e remove cookies inválidos. Login e logout exigem um cabeçalho Origin igual a `APP_ORIGIN`.

Senhas novas usam hashes scrypt versionados no custo OWASP `N=2^17, r=8, p=1`. Hashes locais da versão anterior continuam válidos e são atualizados no próximo login bem-sucedido.

O login limita cinco tentativas por combinação de conta e origem confiável no NestJS, mais vinte tentativas totais por origem no NestJS e no gateway Next.js. Essa segunda barreira limita o trabalho scrypt mesmo quando requisições passam por instâncias diferentes do BFF. O gateway agrupa IPv6 pelo prefixo `/64`, usa o IP completo em IPv4 e encaminha ao Nest somente um hash da origem confiável; um navegador não consegue definir esse identificador. Na Vercel, o gateway lê `x-forwarded-for`, que a plataforma substitui na borda ([documentação](https://vercel.com/docs/headers/request-headers)); em outro host de produção, configure `TRUSTED_CLIENT_IP_HEADER` somente se o proxy confiável sobrescrever esse cabeçalho. O gateway falha fechado em produção quando não encontra uma identidade confiável. Cada contador é local à instância: antes de escalar horizontalmente a API, use armazenamento compartilhado ou limite distribuído na borda. A cota por origem pode agrupar usuários atrás do mesmo NAT. Se uma instância do BFF atingir 10.000 origens ativas, novas origens recebem `503` com `Retry-After: 60` até a próxima limpeza do contador.

## Limitações atuais

- A nova API oferece autenticação multi-tenant, catálogo, mesas, pedidos e sessões de atendimento; pagamento e chamada de garçom ainda dependem dos fluxos legados.
- A tela nova de login está em `/painel/login`; o login e os fluxos em `/admin` permanecem ligados à API legada enquanto a migração acontece.
- O cardápio em `/q/{code}` usa o catálogo e o banco novos. Os dados do legado não são sincronizados automaticamente.
- Nenhuma conta, categoria, produto ou outro dado legado foi importado para o novo banco PostgreSQL.
- O backend legado é apenas referência: seu código e seu banco de dados não foram incorporados. O repositório legado não declara licença.
- Não há deploy, infraestrutura de produção, dados de clientes ou alegação de prontidão operacional neste marco.

Consulte o [índice da documentação](docs/README.md), o guia de [sessões de mesa](docs/funcionalidades/sessoes-de-mesa.md), [ADR 0001](docs/adr/0001-typescript-monorepo.md) para a decisão do monorepo e [ADR 0002](docs/adr/0002-admin-sessions-and-tenant-context.md) para sessões administrativas e contexto multi-tenant.
