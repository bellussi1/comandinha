# Comandinha: seed local, mesas, QR e pedidos

Data: 2026-10-13
Status: aguardando revisão do usuário

## Contexto

O monorepo está migrando para Next.js e NestJS com PostgreSQL. O catálogo e o painel novos já usam a API Nest, enquanto as rotas legadas de mesas e pedidos continuam usando a API de staging. Por isso, popular o banco local não torna os fluxos legados locais. Esta entrega adiciona um fluxo demonstrável completo sem quebrar as rotas legadas.

## Resultado esperado

Uma pessoa desenvolvedora consegue preparar o ambiente local com dados de demonstração, acessar o painel novo, abrir o QR de uma mesa, montar um pedido, enviá-lo e acompanhar seu estado. A equipe administra mesas e atualiza os pedidos pelo novo painel.

O seed cria um restaurante, um administrador configurado por variáveis locais, três mesas, quatro categorias e oito produtos. É idempotente e não apaga dados existentes.

## Decisões de arquitetura

- Persistência, autorização e regras de negócio ficam no NestJS e Prisma/PostgreSQL existentes.
- O painel novo terá uma visão geral com contagens, pendências e atalhos, a rota /painel/mesas e a rota /painel/pedidos.
- A experiência pública local será /q/[code]. Ela é separada de /mesa/[uuid], que permanece no fluxo legado.
- A página pública mostra apenas nome do restaurante, nome da mesa, catálogo e resumos de pedidos associados à mesa. Não expõe dados pessoais.
- Pagamento, chamados de garçom, operação de cozinha e migração das rotas legadas ficam fora do escopo.
- A primeira demonstração é local. Publicar a nova API ou migrar dados em produção não faz parte desta implementação.

## Dados e contratos da API

### Mesas

RestaurantTable pertence a um restaurante, tem nome único dentro do restaurante, código público aleatório e persistido para o QR, estado ativo/inativo e timestamps. O código público não deve ser previsível. Mesas com pedidos associados não podem ser removidas fisicamente pela API; podem ser desativadas.

### Pedidos e itens

Order pertence ao restaurante e à mesa. Armazena estado, observações permitidas, total calculado no servidor e timestamps. OrderItem guarda snapshots do nome do produto e do preço em centavos no momento do pedido, quantidade e observações do item.

Os estados são PENDING, PREPARING, READY, DELIVERED e CANCELLED. A API valida transições permitidas e rejeita transições inválidas.

### Rotas autenticadas

A API fornece operações tenant-scoped de listagem, criação, edição, ativação/desativação e consulta de QR para mesas, além de listagem, detalhe e atualização de estado para pedidos. OWNER e ADMIN podem gerenciar; STAFF pode consultar e operar pedidos conforme a autorização existente. Nenhum identificador fornecido pelo cliente pode escapar do restaurante do principal autenticado.

### Rotas públicas

- GET /public/tables/{code}/menu devolve a mesa ativa e os produtos ativos/disponíveis do mesmo restaurante.
- POST /public/tables/{code}/orders recebe itens, quantidades e observações; valida mesa e produtos no servidor e calcula os preços e totais usando valores do banco.
- GET /public/tables/{code}/orders devolve estados e resumos dos pedidos recentes daquela mesa, sem dados pessoais nem informação administrativa.

O servidor rejeita mesa desconhecida ou inativa, produtos de outro restaurante, produtos inativos/indisponíveis, quantidades e payloads fora dos limites configurados. Preço ou total enviado pelo cliente é ignorado ou rejeitado. As respostas incluem snapshots necessários para preservar o histórico do pedido.

Os contratos são documentados no OpenAPI e o cliente tipado é regenerado. O Next.js expõe as operações por rotas BFF same-origin com autenticação apropriada no painel, validação de origem/payload e limites de corpo; as operações públicas não recebem credenciais administrativas. A API aplica limites de requisição adequados ao pedido público.

## Seed local

O seed existente é estendido sem enfraquecer suas proteções: ambiente diferente de produção, opt-in explícito, PostgreSQL em loopback e credenciais locais explícitas. A senha do administrador vem de variável ignorada pelo Git e é armazenada usando o hash já adotado pelo projeto.

O seed é idempotente, atualiza apenas os registros pertencentes ao conjunto de demonstração e não trunca tabelas nem remove outros dados. Cria três mesas de exemplo, quatro categorias — Hambúrgueres, Porções, Bebidas e Sobremesas — e oito produtos. Não cria pedidos de demonstração; o primeiro pedido deve poder ser feito pelo próprio QR. Nenhuma senha padrão é incluída no código ou nos arquivos versionados.

README e .env.example documentam a preparação e execução, sem incluir valores secretos.

## Experiência e interface

- A visão geral do painel mostra contagens, pedidos pendentes e atalhos úteis para catálogo, mesas e pedidos.
- /painel/mesas lista e permite criar, renomear e ativar/desativar mesas. Para cada mesa ativa, mostra QR e link copiável ou baixável.
- /painel/pedidos apresenta estados vazios, carregando e erro, filtros úteis e ações claras para avançar ou cancelar pedidos dentro das transições válidas.
- /q/[code] é mobile-first: identifica restaurante e mesa, apresenta categorias e produtos, mantém o carrinho local durante a navegação, oferece CTA fixo para revisar/enviar o pedido e mostra confirmação e acompanhamento dos estados.
- A interface mantém a identidade coral/ameixa, tipografia e componentes coerentes com o painel novo, com foco visível, operação por teclado, alvos de toque adequados, rótulos acessíveis e respeito a prefers-reduced-motion.
- A solução reutiliza as dependências de UI existentes; uma nova biblioteca de animação não é necessária para este escopo.

## Compatibilidade e rollout

A mudança é aditiva. Migrações Prisma são aplicadas apenas ao banco de desenvolvimento local durante a implementação. /admin, /mesa/[uuid] e sua configuração da API permanecem intactos. O QR local aponta para /q/[code]; após eventual publicação, a URL base deverá vir de configuração apropriada ao ambiente.

## Verificação

- Testes de configuração, proteção e idempotência do seed, incluindo a garantia de que dados fora da demonstração não são removidos.
- Testes da API em PostgreSQL para isolamento por restaurante, mesa desconhecida/inativa, produtos de outro restaurante ou indisponíveis, alteração de preço no cliente, snapshots, limites e transições de estado.
- Testes de que as rotas públicas não retornam dados pessoais e de que o resumo de pedidos se limita ao código/mesa correspondente.
- Testes das rotas BFF e dos estados de interface.
- Fluxo Playwright: login no painel, abrir QR, montar e enviar um pedido, atualizar o estado no painel e acompanhar o estado pela rota pública. Verificação de que rotas legadas continuam disponíveis.
- Verificações de responsividade em viewport móvel e desktop, lint, tipos, cliente OpenAPI e builds de API e web.
- Nenhuma migração remota, publicação ou deploy é executado nesta entrega.

## Pontos de revisão

1. O pedido público fica consultável pelo código da mesa durante a demonstração local. Isso é necessário para acompanhar o pedido sem login, e a resposta não contém dados pessoais.
2. A implementação preserva o legado e mantém o novo fluxo isolado até que uma migração futura seja planejada.
3. Pagamentos e chamados de garçom podem ser acrescentados depois sem mudar o requisito atual de criar e acompanhar pedidos.
