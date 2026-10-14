# Documentação do Comandinha

O [README da raiz](../README.md) explica como iniciar o monorepo local. As páginas abaixo detalham os fluxos já disponíveis e as decisões de arquitetura.

## Funcionalidades

- [Sessões de mesa](funcionalidades/sessoes-de-mesa.md): abertura, conta parcial, encerramento, reabertura e comportamento do QR.

## Decisões de arquitetura

- [ADR 0001 — Monorepo TypeScript](adr/0001-typescript-monorepo.md): organização do workspace e responsabilidades dos pacotes.
- [ADR 0002 — Sessões administrativas e contexto multi-tenant](adr/0002-admin-sessions-and-tenant-context.md): autenticação, escopo do restaurante e gateway web/API.

## Especificações e planos de implementação

Estes arquivos registram escopo aprovado e passos de desenvolvimento. A documentação de funcionalidades e o código atual descrevem o comportamento implementado.

### Especificações

- [Modernização do monorepo](superpowers/specs/2026-10-12-comandinha-modernization-design.md)
- [Organização da documentação técnica](superpowers/specs/2026-10-13-comandinha-documentation-design.md)
- [Demonstração local, QR e pedidos](superpowers/specs/2026-10-13-comandinha-local-demo-qr-orders-design.md)
- [MVP mobile](superpowers/specs/2026-10-13-comandinha-mobile-mvp-design.md)
- [Painel e catálogo em paralelo ao legado](superpowers/specs/2026-10-13-comandinha-parallel-admin-catalog-design.md)
- [Sessões e encerramento de mesa](superpowers/specs/2026-10-14-comandinha-table-session-closure-design.md)

### Planos

- [Fundação do monorepo](superpowers/plans/2026-10-13-comandinha-foundation.md)
- [Autenticação e multi-tenancy](superpowers/plans/2026-10-13-comandinha-auth-tenant.md)
- [Demonstração local, QR e pedidos](superpowers/plans/2026-10-13-comandinha-local-demo-qr-orders.md)
- [MVP mobile](superpowers/plans/2026-10-13-comandinha-mobile-mvp.md)
- [Painel e catálogo em paralelo ao legado](superpowers/plans/2026-10-13-comandinha-parallel-admin-catalog.md)
- [Refatoração de interface](superpowers/plans/2026-10-13-comandinha-refactoring-ui.md)
- [Sessões e encerramento de mesa](superpowers/plans/2026-10-14-comandinha-table-session-closure.md)
