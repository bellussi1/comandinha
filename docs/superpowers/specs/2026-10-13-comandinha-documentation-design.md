# Especificação: documentação técnica do Comandinha

- **Status:** aguardando revisão
- **Data:** 2026-10-13
- **Escopo:** documentação do monorepo atual, sem alterar funcionalidades do produto

## Objetivo

Organizar a documentação do Comandinha para que alguém que chega ao repositório consiga iniciar o ambiente, entender quais fluxos estão implementados, localizar as fronteiras entre web, API e banco e contribuir com segurança. O material deve refletir o código que existe hoje, distinguir a área nova do legado e identificar o que continua planejado.

O README da raiz continuará sendo a entrada rápida. A documentação detalhada ficará em páginas temáticas em `docs/`, escritas em português do Brasil, com links entre si e para os arquivos de configuração e código que servem como fonte de verdade.

## Contexto e restrições

- O repositório é um monorepo TypeScript com `apps/web`, `apps/api` e `packages/api-client`, coordenado por pnpm e Turborepo.
- A web usa Next.js App Router. O painel novo está em `/painel`; o catálogo QR público usa `/q/[code]`. `/admin` e `/mesa/[token]` ainda contêm fluxos legados.
- A API NestJS tem módulos de autenticação, catálogo, mesas, pedidos, atendimento público e saúde. PostgreSQL e Prisma atendem o conjunto novo de dados.
- O cliente HTTP tipado é derivado do contrato OpenAPI da API. O Next mantém o gateway same-origin para autenticação e encaminhamento de chamadas administrativas.
- A migração não está pronta para produção. Fluxos antigos, dados sem migração, pagamentos, fechamento de conta e chamada de garçom devem ser descritos conforme o estado real do código; nenhuma página pode sugerir que esses itens já foram migrados.
- `.env`, credenciais locais, tokens, códigos públicos de QR de demonstração e dados pessoais não devem aparecer nos documentos. Usar somente nomes de variáveis e valores fictícios já publicados em `.env.example`.
- As ADRs e os planos existentes são registros de decisões anteriores. A documentação nova deve apontar para eles quando forem úteis, sem tratá-los como descrição automaticamente atualizada da implementação.

## Estrutura proposta

1. `README.md` — visão curta do produto e do estado da migração, pré-requisitos, caminho mínimo para executar localmente e links para os guias.
2. `docs/README.md` — índice por público e assunto, com estado de cada fluxo e links para guias e ADRs.
3. `docs/funcionalidades.md` — mapa de funcionalidades e rotas, agrupado em implementado na plataforma nova, legado mantido e futuro/não disponível. Cada linha informa onde testar ou qual dependência ainda falta.
4. `docs/arquitetura.md` — estrutura do monorepo, responsabilidades dos pacotes, limites entre Next e Nest, fluxo navegador → gateway → API → PostgreSQL, cliente OpenAPI e referência às decisões arquiteturais.
5. `docs/frontend.md` — App Router, organização de páginas e componentes, componentes server/client, comunicação com a API, gateway local, estilos e limites do painel novo versus telas legadas.
6. `docs/backend.md` — módulos Nest, controller/DTO/service, guards, validação, erros, contrato OpenAPI e convenções para adicionar endpoints sem duplicar regras de negócio.
7. `docs/banco-de-dados.md` — modelos Prisma existentes, relações e isolamento por restaurante, migrations, snapshots de pedidos, comandos locais e política segura do seed. Não incluir dumps nem credenciais.
8. `docs/seguranca.md` — hash de senhas, sessões opacas, cookies, validação de Origin, segredo do gateway, contexto tenant, rate limits e limites conhecidos de contadores em memória e confiança no proxy.
9. `docs/infraestrutura.md` — versões fixadas, workspace, Compose/PostgreSQL local, scripts, variáveis de ambiente por propósito, GitHub Actions e estado/limites de deploy.
10. `docs/testes-e-contribuicao.md` — comandos por camada, escopo de testes unitários, integração e Playwright, geração/verificação do cliente OpenAPI, fluxo para contribuir e critérios para atualizar documentação.

As ADRs em `docs/adr/` permanecem separadas por decisão. A implementação deverá acrescentar uma seção curta de estado atual às ADRs 0001 e 0002 para corrigir conclusões de marco que ficaram desatualizadas, preservando o contexto e a decisão originais.

## Estado que a documentação deve comunicar

Usar exatamente três categorias, explicadas no índice:

- **Implementado na plataforma nova:** autenticação administrativa com sessão, contexto de restaurante por membership, overview do painel, gestão de categorias/produtos, gestão de mesas e QR, cardápio público, carrinho/pedido e acompanhamento/atualização de status.
- **Legado em operação durante a migração:** rotas e integrações da interface anterior, incluindo `/admin` e `/mesa/[token]`, somente nos limites confirmados pelo código e pelo README atual.
- **Futuro ou indisponível:** pagamento e fechamento de conta no fluxo novo, chamada de garçom migrada, importação/sincronização automática de dados legados e operação/deploy de produção.

Cada tópico deve indicar a data da última revisão ou amarrar seu estado a uma revisão/commit e explicar que o estado muda com o código. Evitar um rótulo global de “concluído” para o produto.

## Requisitos de conteúdo e qualidade

- Todo comando deve ser copiável do Windows PowerShell e usar os scripts existentes. Comandos destrutivos, em especial remoção de volumes, devem explicar o efeito antes do bloco.
- Diagramas devem ser pequenos e representar somente chamadas e limites comprovados no código. Usar Mermaid quando simplificar uma fronteira ou fluxo.
- Variáveis devem ser explicadas por nome e finalidade, com referência a `.env.example`; nunca colar valores secretos.
- Rotas e comandos devem ser verificados contra o código e os `package.json` do workspace antes de publicar.
- Não duplicar guias longos no README da raiz. Cada detalhe deve ter uma página canônica e os outros documentos devem apontar para ela.
- Diferenciar comportamentos cobertos por testes dos comportamentos ainda não garantidos. Documentação de segurança deve registrar limitações, não fazer promessas de produção.
- Todo documento de implementação deve ter título, propósito, links de navegação e referências à fonte de verdade relevante.

## Fora de escopo

- Alterar comportamento, arquitetura ou dependências do monorepo.
- Completar a migração de telas, APIs, pagamentos ou qualquer integração.
- Criar deploy, ambiente de produção, domínio, dados de demonstração públicos ou credenciais compartilhadas.
- Reescrever histórico de ADRs, planos e especificações anteriores.
- Criar um site de documentação ou pipeline separado para publicar os Markdown.

## Validação prevista para a implementação

- Executar os validadores existentes de README e CI para detectar comandos, links ou afirmações inválidas.
- Executar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm api:client:check` se os documentos exigirem ajustes nos validadores; caso contrário, usar ao menos os validadores de documentação e testes já existentes.
- Conferir todos os links relativos da raiz e de `docs/` e validar que os comandos documentados existem nos manifests ou scripts.
- Revisar manualmente as três categorias de status, nomes de rotas, variáveis e limitações contra o estado atual do código.

## Critérios de aceite

- README da raiz orienta a primeira execução e encaminha para `docs/README.md` sem contradizer a plataforma atual.
- O índice apresenta todos os guias e deixa claro o estado de cada parte do produto.
- Cada área solicitada — funcionalidades, arquitetura, frontend, backend, banco de dados, segurança, infraestrutura e testes/contribuição — tem uma página independente e navegável.
- Uma pessoa consegue localizar de onde vem uma tela, qual API atende o fluxo e qual tabela persiste os dados, sem confundir o legado com a implementação nova.
- Não há credenciais, códigos de QR locais, dados pessoais ou alegações não comprovadas de produção.
- Os validadores e testes previstos passam, e o diff contém somente documentação e, se necessário, validadores de documentação.
