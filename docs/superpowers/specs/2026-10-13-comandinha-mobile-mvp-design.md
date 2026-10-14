# Especificação: Comandinha MVP local, utilizável no celular

- **Status:** aguardando revisão
- **Data:** 2026-10-13
- **Escopo:** qualidade de uso, responsividade, desempenho percebido e validação do fluxo novo em ambiente local

## Objetivo

Deixar o fluxo novo do Comandinha confiável e confortável para uma demonstração local completa, em especial no celular: proprietário entra, organiza o catálogo, cria mesas e seus QRs; cliente abre o cardápio pelo QR, monta o carrinho e envia um pedido; a equipe acompanha e avança o pedido no painel. O resultado deve ser simples de iniciar, rápido nas ações frequentes, acessível e visualmente coerente com a identidade coral e ameixa.

Este marco é um **MVP local com dados de demonstração**. Não representa prontidão para receber restaurantes reais ou tráfego de produção.

## Contexto confirmado

- O monorepo contém Next.js, NestJS, Prisma e PostgreSQL local.
- O fluxo novo usa `/painel/login`, `/painel`, `/painel/catalogo`, `/painel/mesas`, `/painel/pedidos` e `/q/[code]`.
- O seed local documentado cria um proprietário configurado por variáveis de ambiente, um restaurante, 3 mesas, 4 categorias e 8 produtos. Ele é opt-in, idempotente, limitado a banco local e preserva dados alheios à demonstração.
- A API valida produtos ativos, calcula os preços e persiste snapshots no pedido. O QR consulta os pedidos associados à mesa.
- `/admin` e `/mesa/[token]` continuam disponíveis como legado durante a migração.
- Testes existentes cobrem a jornada de pedido, viewports de 320, 360, 768 e 1440 px, foco, contraste e `prefers-reduced-motion`. No baseline desta auditoria, `pnpm lint`, `pnpm typecheck` e `pnpm test` passaram; lint registrou avisos de hooks, principalmente em telas antigas. A execução de Playwright não iniciou porque uma instância Next existente na mesma pasta manteve o bloqueio de desenvolvimento.

## Usuários e jornadas

### Proprietário ou equipe

1. Entra com as credenciais locais do seed.
2. A partir do painel, encontra sem busca prolongada os atalhos para catálogo, mesas e pedidos.
3. Cria/edita ou arquiva/restaura categorias e produtos, com validação e confirmação claras.
4. Cria, renomeia, ativa ou desativa mesas e consegue abrir, copiar ou baixar o QR adequado.
5. Vê pedidos recentes e pendentes, entende mesa, itens, quantidades, observações e total, e executa a próxima ação válida com poucos toques.

### Cliente da mesa

1. Abre o link/QR em navegador móvel sem instalar aplicativo ou criar conta.
2. Identifica o restaurante e a mesa, navega pelas categorias e entende os itens e preços.
3. Adiciona e ajusta itens no carrinho, informa observações e revisa o total antes de enviar.
4. Recebe confirmação e consegue acompanhar o estado do pedido enquanto a página estiver aberta.

## Direção de experiência

- Mobile-first em cardápio, login e operação cotidiana do painel. Em telas grandes, o painel pode ampliar a densidade; nenhuma ação principal pode depender de hover.
- Preservar a identidade coral/ameixa e o padrão visual aprovado para o produto: interface acolhedora, organizada, clara e sem aparência genérica de template.
- Manter ações frequentes expostas e próximas do conteúdo; evitar etapas redundantes, diálogos para decisões reversíveis e navegação que esconda o estado atual.
- Garantir alvos de toque confortáveis, hierarquia de títulos, labels persistentes nos formulários, foco visível, contraste legível e ordem de teclado previsível.
- Usar animações curtas para feedback e transição de estado. Respeitar `prefers-reduced-motion` e evitar animações contínuas ou que bloqueiem interação.
- Exibir estado de carregamento, vazio, sucesso e erro com texto acionável. Em falha de rede, permitir tentar novamente sem perder o rascunho do formulário/carrinho.

## Escopo funcional

### Incluído

- Tornar o caminho local de configuração, migração e seed reproduzível a partir das instruções versionadas, sem credenciais padrão no código.
- Revisar e completar a experiência móvel das páginas novas de login, visão geral, catálogo, mesas, pedidos e menu QR, corrigindo overflow, densidade, navegação e ações de toque conforme a jornada.
- Verificar formulários do catálogo e das mesas em largura móvel, incluindo validação inline, estado de envio, erros recuperáveis e confirmação de sucesso.
- Evitar envio duplicado de pedido e alterações duplicadas durante latência; preservar o carrinho em navegação e em falhas recuperáveis.
- Garantir que listas longas, imagens e chamadas de API não façam a interface saltar ou bloqueiem interações. Carregar imagens de forma preguiçosa quando fora da área visível, reservar dimensões e reduzir trabalho/re-renderizações sem benefício observável.
- Validar o fluxo com a API e PostgreSQL locais, além dos testes de interface existentes, para que a jornada principal não dependa somente de respostas mockadas.
- Manter as rotas legadas acessíveis e sem regressão causada pela nova interface.

### Fora de escopo

- Deploy, domínio, dados de restaurantes reais, operação multi-restaurante pública ou afirmação de prontidão de produção.
- Pagamento, fechamento de conta, gorjeta, chamado de garçom migrado, impressão de cozinha ou importação/sincronização dos dados legados.
- Reescrever `/admin` e `/mesa/[token]`; essas rotas permanecem como legado até um plano próprio.
- Nova biblioteca de animação ou de UI sem uma necessidade demonstrada que não possa ser atendida pelas dependências existentes.
- Promessas de operação offline ou notificações em tempo real fora da página aberta.

## Desempenho e confiabilidade

- Priorizar o caminho visível inicial e as ações do fluxo, evitando dependências client-side e transferências que não sejam necessárias à tela atual.
- Reservar espaço de imagens e conteúdo assíncrono para reduzir mudanças de layout; evitar carregar em lote imagens grandes que ainda não estão próximas da viewport.
- Atualizações devem mostrar feedback imediato e impedir repetição enquanto a requisição está pendente; erros precisam manter o usuário em contexto e disponibilizar nova tentativa.
- O painel e o QR devem continuar funcionais nas larguras de 320, 360 e 768 px, sem rolagem horizontal da página. A largura de 1440 px continua coberta para verificar a composição desktop.
- Ações primárias do cliente e da equipe devem poder ser concluídas por teclado e toque. Testes devem cobrir foco, contraste e redução de movimento nas superfícies novas.

## Segurança e dados de demonstração

- Usar o seed existente com `ALLOW_LOCAL_DEMO_SEED=true`, credenciais definidas pelo desenvolvedor em `.env` ignorado e validação de banco em loopback. Não versionar senha, token, URL pública de QR nem dado pessoal.
- Não enfraquecer autenticação, isolamento por restaurante, validação server-side de produtos/preço ou snapshots de pedido para simplificar a UX.
- Repetir seed não pode apagar dados customizados nem tabelas fora do conjunto de demonstração.
- O código público do QR continua sendo o meio de consulta do pedido de demonstração, sem retornar dados pessoais do cliente.

## Critérios de aceite

1. Uma pessoa consegue seguir a configuração publicada, entrar no painel novo e concluir localmente uma jornada completa: administrar catálogo/mesa, abrir QR, enviar pedido e avançar seu estado.
2. Cliente e equipe executam as ações principais em viewport móvel de 320 px sem overflow horizontal, controles cortados ou ação principal inacessível.
3. Nenhuma mutação permite duplo envio acidental; erros de rede e submissões inválidas são identificáveis e recuperáveis sem apagar dados digitados sem necessidade.
4. Telas novas têm estados claros de carregamento, vazio, sucesso e falha; ações e estados são anunciados de forma apropriada a tecnologia assistiva.
5. Foco visível, contraste, navegação por teclado e `prefers-reduced-motion` permanecem verificados por testes automatizados.
6. O caminho principal é testado com API e PostgreSQL locais, e não somente com mocks de navegador; os testes de jornada continuam verificando a integração visual do painel e QR.
7. Não há regressão nas rotas `/admin` e `/mesa/[token]`; nenhum pagamento, garçom ou importação é insinuado como implementado no fluxo novo.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`, testes de integração/E2E disponíveis e builds aplicáveis passam. Avisos preexistentes do legado são registrados e não ampliados pelo código novo.

## Verificação

- Executar o fluxo de instalação, migração e seed a partir de banco local limpo criado pelo Compose, respeitando o guardrail de não apagar volumes existentes do usuário.
- Executar testes de API com PostgreSQL, suíte Playwright de painel/QR nas larguras móveis e desktop e verificação de acessibilidade/redução de movimento.
- Fazer build de produção da web e da API somente em condição que não conflite com servidores de desenvolvimento ativos.
- Revisar bundle, carregamento de imagens e chamadas feitas no fluxo principal; priorizar medição repetível, sem usar apenas uma pontuação agregada como aceite.
- Comparar o diff visual das telas novas em mobile e desktop antes de concluir.

## Auto-revisão da proposta

- **Fronteiras:** o escopo está limitado às rotas novas e ao setup local; preserva explicitamente o legado.
- **Dados e segurança:** mantém validação do servidor e guardrails do seed; não introduz credenciais padrão nem operação pública.
- **UX:** define jornadas de cliente e equipe, estados de interface, teclado, toque e movimento reduzido.
- **Validação:** cobre API, PostgreSQL, browser, acessibilidade e build; registra a limitação do baseline E2E bloqueado pela instância ativa.
- **Termos ambíguos:** “minimamente utilizável” é convertido em jornadas e critérios verificáveis, com alvo local explicitado.

## Pontos para revisão

1. O marco entrega uma demonstração local completa e confiável, mas não declara o Comandinha pronto para operação real.
2. Melhorias serão feitas sobre o fluxo novo existente; o legado permanece acessível até uma migração planejada.
3. Os critérios de desempenho se concentram em carregamento, estabilidade visual e resposta às ações principais; números de laboratório serão registrados como evidência, não como promessa de produção.
