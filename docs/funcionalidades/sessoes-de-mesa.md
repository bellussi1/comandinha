# Sessões de mesa

**Status:** implementado no painel e no cardápio QR do monorepo local. O fluxo `/admin` continua legado. O encerramento registra a conta da sessão e não processa pagamento.

## Conceito e estados

Uma mesa mantém um QR estável e pode receber vários atendimentos ao longo do tempo. Cada atendimento é uma `DiningSession` com estado `OPEN` ou `CLOSED`. Só pode haver uma sessão aberta por mesa; encerrar e abrir novamente cria um novo histórico, sem misturar pedidos de sessões diferentes.

O seed local abre uma sessão inicial para cada mesa de demonstração que ainda não tenha histórico. A reexecução não cria sessões duplicadas e não reabre uma sessão encerrada.

Pedidos anteriores à migração podem ter `diningSessionId` nulo. Eles são preservados e não são atribuídos retroativamente à sessão atual. Pedidos feitos pelo QR após a migração ficam vinculados à sessão aberta no momento da criação.

## Conta e encerramento

O painel calcula o valor parcial somando os pedidos da sessão que não estão cancelados. Esse valor é uma previsão da conta e pode incluir pedidos ainda em preparo.

O fechamento só é permitido quando não há pedidos `PENDING`, `PREPARING` ou `READY`. Pedidos sem atendimento pendente devem estar `DELIVERED` ou `CANCELLED`. A API calcula e persiste o total final, em centavos, somando somente pedidos `DELIVERED`; pedidos cancelados ficam fora. Uma sessão sem pedidos pode ser encerrada com total zero.

O fechamento persiste `closedAt` e `closedTotalInCents` na mesma transação que muda o estado para `CLOSED`. Repetir a chamada de encerramento retorna o total persistido. O painel pede confirmação antes de fechar e atualiza a mesa após a resposta do servidor.

`OWNER` e `ADMIN` podem abrir e encerrar atendimentos. `STAFF` pode consultar o atendimento atual, mas não realizar essas alterações. A API sempre aplica o restaurante associado à sessão administrativa; o cliente não informa o tenant.

## Rotas da API NestJS

| Método e rota | Acesso | Comportamento |
| --- | --- | --- |
| `GET /tables` | Sessão administrativa | Inclui `currentSession` com valor parcial e quantidade de pedidos não terminais, ou `null`. |
| `POST /tables/:id/session` | `OWNER` ou `ADMIN` | Abre atendimento; criação nova retorna `201`, repetição enquanto aberto retorna `200` com a sessão existente. |
| `GET /tables/:id/session` | Sessão administrativa | Retorna a conta detalhada aberta ou `{ "session": null }`. |
| `POST /sessions/:id/close` | `OWNER` ou `ADMIN` | Fecha o atendimento após a finalização dos pedidos; uma repetição retorna o fechamento já registrado. |
| `GET /public/tables/:code/menu` | Público, pelo QR | Retorna o catálogo mesmo sem atendimento e informa `acceptingOrders`. |
| `POST /public/tables/:code/orders` | Público, pelo QR | Aceita pedido somente com mesa ativa e sessão aberta; o preço é calculado no servidor. Sem sessão aberta retorna `409`. |
| `GET /public/tables/:code/orders` | Público, pelo QR | Lista pedidos da sessão aberta atual; retorna lista vazia quando ela não existe. |
| `GET /public/tables/:code/orders/:orderId` | Público, pelo QR | Mantém o acompanhamento do pedido histórico associado ao código público daquela mesa. |

O Next.js expõe essas operações ao navegador em rotas same-origin `/api/admin/...` e `/api/public/...`. Credenciais administrativas permanecem no servidor.

## Experiência do QR

Com a mesa aberta, o cardápio permite adicionar produtos, editar o carrinho e enviar pedidos. Quando não há sessão aberta, o cardápio continua visível, mas os controles de pedido ficam desativados e explicam que a equipe precisa abrir a mesa. O botão **Atualizar cardápio** verifica se a equipe reabriu o atendimento.

Se a sessão for encerrada entre o carregamento do cardápio e o envio, a API responde `409`. A interface preserva o carrinho, bloqueia novos pedidos e oferece a atualização do cardápio. Após a reabertura, a mesma URL QR passa a aceitar novos pedidos na nova sessão; os pedidos da conta encerrada permanecem no histórico.

## Limites deste fluxo

O total registrado não significa que o cliente pagou. Não há integração ou confirmação financeira, escolha ou divisão de pagamento, gorjeta, desconto ou chamada de garçom neste fluxo. A área administrativa `/admin` segue em migração separada.

## Verificação local

Na raiz do monorepo, os testes focados deste fluxo podem ser executados assim:

```powershell
pnpm --filter @comandinha/api exec vitest run --config vitest.config.integration.ts test/tables.integration-spec.ts test/public-dining.integration-spec.ts
pnpm --filter @comandinha/web exec jest --runInBand --runTestsByPath src/components/painel/mesas/__tests__/TablesWorkspace.test.tsx src/components/painel/mesas/__tests__/TableSessionDialog.test.tsx src/components/public-menu/__tests__/PublicMenu.test.tsx
pnpm --filter @comandinha/web exec playwright test e2e/painel-dining.spec.ts
```
