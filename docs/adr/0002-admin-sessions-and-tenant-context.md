# ADR 0002: Sessões administrativas e contexto multi-tenant

- **Status:** Aceita
- **Data:** 2026-10-13

## Contexto

O Comandinha precisa de uma identidade administrativa persistente e de contexto confiável de restaurante antes que os fluxos de negócio sejam migrados da API legada. O navegador não deve escolher a identidade, o papel ou o tenant por cabeçalhos, parâmetros ou armazenamento JavaScript.

## Decisão

- PostgreSQL mantém `User`, `Membership` e `AdminSession`. Uma membership ativa vincula usuário, restaurante e papel.
- O Nest cria segredos de sessão aleatórios com pelo menos 256 bits de entropia, devolve o valor uma vez ao gateway confiável e persiste somente o SHA-256 do segredo.
- Cada validação exige usuário e membership ativos, sessão não expirada e sem revogação. O restaurante e o papel vêm exclusivamente da membership persistida.
- O Next.js atua como gateway same-origin. Suas Route Handlers fazem login, validação e logout contra a API usando `API_INTERNAL_URL` e `AUTH_GATEWAY_SECRET`, ambos server-only.
- O token de sessão fica em cookie HttpOnly, SameSite=Lax e Path=/. Produção usa Secure e o nome `__Host-comandinha_admin_session`; desenvolvimento HTTP usa `comandinha_admin_session` sem Secure.
- Mutação no gateway exige Origin igual ao `APP_ORIGIN` configurado. O gateway valida tamanho e formato do corpo e nunca encaminha cabeçalhos arbitrários do navegador.
- A criação de sessão é limitada a cinco tentativas por conta e origem confiável por minuto no NestJS, além de vinte tentativas totais por origem no NestJS e no Next.js. O gateway agrupa IPv6 pelo prefixo `/64`, usa o IP completo em IPv4 e encaminha ao Nest um hash da origem. Na Vercel, usa `x-forwarded-for` reescrito pela plataforma; em outros hosts, produção exige `TRUSTED_CLIENT_IP_HEADER` apontando para um cabeçalho sobrescrito pelo proxy confiável. Os contadores são locais à instância e precisam de armazenamento compartilhado ou limite distribuído antes de escalar horizontalmente. Se uma instância do BFF atingir 10.000 origens ativas, novas origens recebem `503` com `Retry-After: 60` até a próxima limpeza.
- A criação inicial de um proprietário permanece em comando local, idempotente, com variáveis explícitas e bloqueio em `NODE_ENV=production`. Não há cadastro público.
- A interface de login existente permanece ligada à API legada neste marco. O gateway é uma base para a migração de uma futura fatia vertical, não uma declaração de que os fluxos do produto já foram migrados.

## Consequências

- Uma cópia do banco não autentica por si só, pois o segredo original não é persistido.
- Revogação e expiração são verificadas no backend, em vez de depender apenas do estado do navegador.
- O Next adiciona um salto HTTP entre navegador e Nest, mas mantém o token longe de JavaScript e centraliza a validação de Origin.
- Os novos endpoints de sessão podem ser testados sem mudar as telas atuais. Produtos, categorias, mesas, pedidos e demais fluxos ainda exigem planos e integrações próprios.
- O limitador em memória não coordena múltiplas réplicas. Isso deve ser resolvido antes de escalar ou anunciar prontidão de produção.

## Alternativas consideradas

- **JWT no `localStorage`:** rejeitada por expor o token ao JavaScript do navegador e dificultar revogação imediata.
- **Tenant enviado pelo cliente:** rejeitada porque um ID ou slug fornecido pelo cliente não prova membership.
- **Cadastro público administrativo:** rejeitado para este produto; proprietários são criados por bootstrap controlado.
- **Conectar o navegador diretamente ao Nest:** rejeitado para esta etapa; exigiria expor o serviço de sessão e ampliar a superfície CORS.
