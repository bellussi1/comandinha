# Fechamento de atendimento por sessão de mesa

- Status: proposta detalhada para revisão do usuário
- Data: 2026-10-14
- Base: `origin/master` em `4fa09a6`
- Escopo: encerrar e reabrir atendimentos no painel local novo, sem integrar pagamentos

## Objetivo

Completar o ciclo local já disponível — QR, cardápio, pedido e acompanhamento — permitindo que a equipe confira o total de uma mesa e encerre o atendimento. Cada uso da mesa deve ter seu próprio histórico; pedidos anteriores não podem reaparecer na próxima conta.

A experiência continua mobile-first, acessível e coerente com a interface coral/ameixa. A nova implementação permanece no monorepo Next.js/NestJS/Prisma/PostgreSQL. A área `/admin` legada continua disponível durante a migração. Este marco não torna o produto pronto para produção.

## Contexto atual

- `RestaurantTable.isActive` indica se o QR da mesa está disponível; não representa ocupação ou atendimento aberto.
- `Order` pertence diretamente a uma mesa e guarda os valores do pedido, sem uma entidade que agrupe pedidos de um atendimento.
- O QR permite pedidos públicos e acompanhamento, mas não impede novos pedidos após uma conta ser encerrada, pois esse estado ainda não existe.
- A API já valida restaurante, mesa, produtos ativos e preços no servidor. As sessões de atendimento devem respeitar os mesmos limites de tenant.

## Decisão

Adicionar `DiningSession` como entidade histórica para representar cada atendimento de uma mesa. Uma mesa poderá ter várias sessões encerradas ao longo do tempo e no máximo uma sessão aberta por vez. A abertura concorrente deve ser protegida no banco/transação, não apenas pelo estado do botão.

A sessão terá identificador UUID, `restaurantId`, `tableId`, estado `OPEN` ou `CLOSED`, horário de abertura, horário de encerramento e `closedTotalInCents` preenchido pelo servidor ao fechar e nulo enquanto aberta. Os valores de pedidos continuam sendo snapshots no pedido; o total de encerramento será a soma em centavos dos pedidos `DELIVERED` daquela sessão, excluindo `CANCELLED`.

Adicionar `diningSessionId` opcional aos pedidos somente para preservar registros que já existam antes da migração. Pedidos criados pelo fluxo QR após a mudança sempre terão uma sessão. Pedidos antigos sem sessão permanecem intactos e não serão associados artificialmente a uma conta nova.

## Fluxo e regras de negócio

1. O seed local abre uma sessão inicial para cada mesa de demonstração que ainda não tenha histórico de sessões. Reexecutar o seed não cria sessões duplicadas e não reabre uma mesa já encerrada.
2. Em `/painel/mesas`, OWNER/ADMIN podem abrir um atendimento quando não houver sessão aberta e consultar a conta da sessão atual. STAFF pode consultar o resumo, conforme o modelo de permissões existente.
3. O detalhe da conta mostra pedidos e estados, total projetado dos pedidos não cancelados e pedidos ainda em preparo. Itens cancelados aparecem separados e não entram no total.
4. Uma sessão pode ser encerrada quando todos os pedidos estiverem `DELIVERED` ou `CANCELLED`. Uma sessão sem pedidos também pode ser encerrada.
5. O servidor recalcula e persiste `closedTotalInCents` e `closedAt` na mesma transação que troca o estado para `CLOSED`. Como o fechamento só é permitido com todos os pedidos em estado terminal, esse total é a soma dos pedidos `DELIVERED`. Repetir uma solicitação de encerramento retorna o resultado já persistido e não recalcula uma sessão fechada.
6. Ao abrir novamente, a mesa recebe uma sessão nova. Os pedidos da sessão anterior continuam históricos e não aparecem na conta ou listagem pública da sessão atual.
7. O código QR continua estável por mesa. O cardápio indica quando a mesa não tem atendimento aberto e impede a criação de pedidos nesse estado. Uma página de acompanhamento de pedido já criado continua acessível pelo identificador daquele pedido, mesmo depois do encerramento.
8. Uma mesa inativa não pode abrir atendimento nem receber pedidos pelo QR. Tentar desativar uma mesa enquanto houver sessão aberta retorna `409`; a equipe deve encerrar o atendimento primeiro.

O encerramento confirma o total do atendimento, mas não confirma que o cliente pagou. Não há captura de pagamento, método de pagamento, divisão de conta, gorjeta, desconto ou integração financeira neste marco.

## API e persistência

As novas rotas administrativas ficam sob a sessão autenticada e usam `AdminPrincipal.restaurantId`; não aceitam tenant informado pelo navegador:

- `POST /tables/:id/session` abre uma sessão. OWNER/ADMIN podem abrir; a primeira chamada retorna `201` e uma repetição retorna a sessão aberta existente com `200`, sem criar outra.
- `GET /tables/:id/session` retorna `200` com `{ "session": null }` quando não há sessão aberta ou `{ "session": ... }` com o resumo detalhado da sessão atual.
- `POST /sessions/:id/close` encerra a sessão atual e retorna totais persistidos. STAFF não pode abrir nem encerrar.
- `GET /tables` acrescenta `currentSession: null` ou um resumo da sessão atual (`id`, `openedAt`, total projetado e quantidade de pedidos não terminais) para evitar uma chamada extra por mesa.

Os endpoints públicos existentes continuam usando o código da mesa. `GET .../menu` informa `acceptingOrders` e pode exibir o catálogo mesmo sem sessão aberta; `POST .../orders` retorna `409` nesse estado e grava o `diningSessionId` junto com o pedido na transação existente. A listagem de pedidos públicos mostra apenas a sessão aberta atual, ou uma lista vazia se não houver sessão. A consulta de um pedido específico permanece limitada ao código público da mesma mesa e pode mostrar o pedido histórico correspondente.

As respostas e erros novos serão documentados em Nest Swagger e refletidos no cliente OpenAPI gerado. A migração não apaga mesas, pedidos ou itens. O serviço deve impedir duas sessões abertas por mesa mesmo quando duas requisições concorrentes tentam abrir atendimento. A criação de pedidos públicos e o fechamento devem sincronizar sobre a sessão no banco dentro de transações, impedindo que um pedido seja anexado depois do encerramento.

## Interface

- `/painel/mesas` apresenta estados “Em atendimento” e “Livre”, total atual e acesso direto a “Ver conta” ou “Abrir atendimento”.
- A conta abre em uma superfície acessível que funciona em tela estreita, com total, pedidos entregues, pendências e uma confirmação clara para encerrar.
- Enquanto houver pedido `PENDING`, `PREPARING` ou `READY`, a ação de encerrar fica indisponível e explica o que falta.
- `/q/[code]` mantém o catálogo visível quando útil, comunica que a mesa não está aceitando pedidos e desativa carrinho/checkout até a equipe abrir uma sessão.
- Manter navegação por teclado, foco visível, rótulos acessíveis, contraste, alvos de toque adequados e `prefers-reduced-motion`. Não adicionar dependências visuais sem necessidade.

## Falhas e consistência

- Mesa ou sessão de outro restaurante responde como não encontrada, sem revelar que o recurso existe.
- Usuário sem papel autorizado recebe `403` ao abrir ou encerrar sessão.
- Pedido público em sessão encerrada ou ausente recebe `409` e não grava pedido.
- Tentativa de fechar com pedidos pendentes, em preparo ou prontos recebe `409` com estado legível para a interface.
- Fechamento e soma são atômicos; concorrência entre pedidos e encerramento não pode deixar pedido novo ligado a uma sessão já encerrada.
- Retries de abertura e fechamento não duplicam sessões nem alteram totais já encerrados.

## Verificação e critérios de aceite

- Migração Prisma preserva todos os dados existentes; pedidos sem sessão continuam consultáveis.
- Integração PostgreSQL prova que uma mesa não recebe duas sessões abertas, inclusive sob concorrência, uma mesa inativa não abre sessão e tabelas compostas impedem associação entre restaurantes.
- Testes cobrem OWNER/ADMIN/STAFF, mesa sem sessão, abrir, consultar, fechar, fechar duas vezes, reabrir, pedidos em todos os estados, total sem pedidos e isolamento por tenant.
- Testes públicos cobrem QR em sessão aberta/fechada, criação vinculada à sessão atual e separação de pedidos após reabertura.
- O seed pode rodar mais de uma vez sem duplicar nem reabrir sessões encerradas.
- Playwright cobre o caminho completo no painel e no QR, incluindo estado bloqueado por pedido pendente, em 320, 360, 768 e 1440 CSS px; testar navegação por teclado e layout sem overflow horizontal.
- Lint, typecheck, testes unitários, testes de integração PostgreSQL, suíte Playwright, validação OpenAPI e builds passam.
- Nenhum deploy, pagamento real, importação de dados legados ou alteração destrutiva faz parte do marco.

## Fora do escopo

Processamento ou confirmação financeira, divisão de conta, gorjeta, descontos, chamadas de garçom, migração de dados/código do backend legado, substituição integral de `/admin`, deploy, infraestrutura de produção e alegações de prontidão operacional.
