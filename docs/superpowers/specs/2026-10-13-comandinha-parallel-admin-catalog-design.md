# Comandinha: painel paralelo e catálogo — especificação

**Status:** Aprovada para planejamento em 2026-10-13
**Data:** 2026-10-13
**Base aprovada:** `docs/superpowers/specs/2026-10-12-comandinha-modernization-design.md` e ADR 0002.

## Objetivo

Entregar o primeiro fluxo administrativo completo sobre a nova API NestJS sem interromper o painel legado. A nova área permitirá que um proprietário autenticado gerencie categorias e produtos no PostgreSQL do monorepo. Ela usa a sessão administrativa same-origin já construída, o contrato OpenAPI gerado e a identidade visual do Comandinha.

## Público e sucesso

O fluxo é para proprietários e administradores de restaurante. O usuário deve conseguir entrar com a conta criada pelo seed local, visualizar e manter o catálogo do restaurante associado à sua membership, e concluir as tarefas no desktop, tablet e celular. O painel legado e seus dados continuam acessíveis durante a migração.

## Caminho recomendado

Criar uma área paralela em `/painel`, sem herdar o layout nem o `AuthGuard` legado de `/admin`. `/painel/login` usa `POST /api/auth/login`; as páginas protegidas consultam `GET /api/auth/session` e o logout revoga a sessão por `DELETE /api/auth/session`. O token opaco permanece exclusivamente no cookie HttpOnly e no servidor.

O catálogo usa endpoints NestJS autenticados e escopados pelo `restaurantId` derivado de `AdminSessionGuard`. O navegador chama Route Handlers same-origin em `/api/admin/catalog/*`; esses handlers leem o cookie no servidor, encaminham somente o bearer de sessão e os dados previstos no contrato, e verificam Origin em mutações. A autorização e as regras de domínio permanecem na API.

O painel existente em `/admin` continua com seu login, token, serviços e dados legados durante esta etapa. Não haverá troca automática de rota, conversão de token, leitura do banco legado nem cópia de dados. Categorias e produtos criados em `/painel` não aparecem no cardápio público legado até uma etapa futura migrar esse fluxo e planejar a carga de dados.

## Modelo e regras de domínio

- `CatalogCategory`: UUID, `restaurantId`, nome, nome normalizado, descrição opcional, URL de imagem HTTPS opcional, ordem não negativa e timestamps. O nome normalizado é único por restaurante.
- `CatalogProduct`: UUID, `restaurantId`, `categoryId`, nome, descrição opcional, preço em centavos inteiros positivos, URL de imagem HTTPS opcional, disponibilidade, destaque, restrições alimentares, tempo de preparo opcional, estado ativo/arquivado e timestamps.
- Uma categoria só pode ser referenciada por produtos do mesmo restaurante. Toda consulta e mutação administrativa filtra pelo tenant da sessão; identificadores de outro restaurante respondem como recurso inexistente.
- `OWNER` e `ADMIN` podem criar, editar e arquivar itens. `STAFF` tem leitura do catálogo. Nenhum papel pode escolher ou substituir o tenant pelo corpo, query string ou cabeçalho.
- A exclusão de categoria é recusada com `409 Conflict` enquanto houver produtos associados; a tela informa a quantidade e mantém os dados. Produtos são arquivados, não apagados, para preservar referências de pedidos futuros.
- O preço usa centavos na API e no banco. A interface formata e converte valores em reais sem usar `Float` como persistência.
- Upload de arquivos e armazenamento de mídia ficam fora desta etapa. A UI aceita uma URL HTTPS opcional; data URLs e protocolos diferentes são recusados.

## Contrato HTTP

Adicionar ao NestJS, sob `/catalog`:

- `GET /catalog/categories` — lista categorias ativas e contagem de produtos.
- `POST /catalog/categories` — cria categoria.
- `GET /catalog/categories/{id}` e `PATCH /catalog/categories/{id}` — lê e atualiza categoria.
- `DELETE /catalog/categories/{id}` — remove somente se não tiver produtos.
- `GET /catalog/products` — lista produtos ativos, com filtro opcional por categoria.
- `POST /catalog/products` — cria produto.
- `GET /catalog/products/{id}` e `PATCH /catalog/products/{id}` — lê e atualiza produto.
- `DELETE /catalog/products/{id}` — arquiva o produto de forma reversível por atualização explícita.

DTOs são validados no servidor e documentados em OpenAPI; `apps/api/openapi.json` e `packages/api-client` são regenerados. Respostas nunca incluem hash de senha ou segredo de sessão. Erros esperados usam códigos estáveis: `400` para validação, `401` para sessão inválida, `403` para papel sem permissão, `404` para recurso ausente ou de outro tenant e `409` para categoria com produtos.

Em `PATCH`, campo opcional omitido mantém o valor atual. Descrição, imagem e tempo de preparo aceitam `null` para limpar; etiquetas são limpas com `[]`. Os demais campos opcionais rejeitam `null` com `400`. Campos com padrão no banco continuam opcionais nos tipos de criação, e `displayOrder` respeita o limite de `Int` do PostgreSQL (`2_147_483_647`). O proxy só repassa mensagens de erro da API explicitamente permitidas; mensagens desconhecidas retornam um texto genérico.

## Interface

- `/painel/login` não oferece cadastro público; criação de proprietário continua pelo seed local protegido.
- O shell do painel mostra restaurante e usuário da sessão, navegação para visão geral e catálogo, estado de sessão e ação de sair. Nesta etapa, visão geral pode indicar que só o catálogo está disponível na área nova.
- `/painel/catalogo` oferece alternância entre Produtos e Categorias, pesquisa simples, criação/edição, disponibilidade/destaque e arquivamento de produto, além de edição e remoção segura de categorias.
- Ao editar, limpar campos opcionais remove o valor salvo; enquanto uma gravação estiver pendente, os botões de envio e cancelamento ficam desativados e envios duplicados são bloqueados.
- Admin é desktop-first: no desktop, usar tabela/lista densa e formulários em diálogo ou painel; em tablet e celular, ações e formulários permanecem acessíveis sem rolagem horizontal da página. Categorias e produtos podem virar cartões em telas estreitas.
- Usar componentes e tokens atuais do Comandinha, ícones Lucide e estados claros de carregamento, vazio, erro, sucesso e permissão. Transições CSS são breves, reduzem-se com `prefers-reduced-motion` e não escondem conteúdo essencial.
- Os formulários validam feedback no cliente e no servidor. Imagem é informada por URL HTTPS nesta fatia; não reutilizar o uploader legado.

## Segurança e compatibilidade

- Sessões e principal continuam sendo validados no Nest. O Next não confia em `userId`, papel ou `restaurantId` enviados pelo navegador.
- Route Handlers aceitam somente os caminhos, métodos, parâmetros e campos previstos; limitam o corpo, não encaminham cabeçalhos arbitrários e validam Origin para mutações.
- O novo painel usa a sessão HttpOnly; nenhum segredo é lido ou escrito no `localStorage`.
- `/admin` não muda e segue autenticando na API legada. Não migrar a tela de login legada, `AuthGuard`, serviços legados ou rotas de mesas, pedidos, chamados e fechamento nesta etapa.
- Não alterar produção, DNS, deploy, banco legado ou contas reais. O fluxo novo é local/testável até uma etapa de deploy aprovada.

## Testes e critérios de aceite

- Testes de integração PostgreSQL cobrem CRUD, unicidade dentro do tenant, associação produto-categoria, limites de papel, arquivamento, remoção bloqueada de categoria e tentativas de leitura/escrita cruzadas entre dois restaurantes.
- Testes das Route Handlers cobrem sessão ausente/expirada, Origin inválida, método/caminho inválido, corpo excessivo, filtragem de cabeçalhos e encaminhamento do bearer sem retorno ao navegador.
- Testes de UI cobrem login/logout, validação de formulário, estados de carregamento/vazio/erro, edição e conflitos de exclusão.
- E2E no novo painel cobre login por sessão, criar categoria, criar produto, editar disponibilidade, arquivar e logout; a tela legado `/admin/login` continua disponível.
- Verificar manualmente ou via Playwright nos viewports 360×800, 768×1024 e 1440×900; testar navegação por teclado e `prefers-reduced-motion`.
- OpenAPI/client gerados estão atualizados; testes, integração PostgreSQL, lint, typecheck e builds do workspace passam.
- README explica o caminho `/painel`, seed de desenvolvimento, separação temporária dos dados e limite de que o menu legado ainda não consome o catálogo novo.

## Fora de escopo e próximas etapas

Este marco não sincroniza usuários, categorias, produtos ou imagens existentes; não muda o menu público/QR; não migra mesas, pedidos, cozinha, chamados, fechamento, relatórios ou o login legado; e não promove `/painel` para `/admin`. Cada fluxo será migrado depois em uma etapa própria, com estratégia de dados e verificações responsivas. A promoção só deve ocorrer quando os fluxos administrativos necessários estiverem disponíveis no painel novo.

## Revisão da especificação

- **Escopo:** a fatia encerra no CRUD administrativo de catálogo e no novo shell autenticado. Isso mantém o painel existente funcional sem alegar que o sistema completo já usa a API nova.
- **Tenant:** todas as operações vêm da membership da sessão e há aceite explícito de isolamento entre dois restaurantes.
- **Compatibilidade de dados:** não existe migração implícita; preço, imagens e remoção são definidos para a nova persistência.
- **Limites operacionais:** sem deploy, upload externo ou chamadas browser-to-Nest; login e sessão usam os Route Handlers existentes.
