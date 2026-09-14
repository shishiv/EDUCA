# Histórico de bloqueios: todos resolvidos

2026-09-14. Branch `fm/educa-contracts-integrator`, base `dev`. Código em `6a534024f0f664df151e4c050451b07d529530b3`.

Este arquivo conserva a referência dos checkpoints usados durante a execução. O resultado final e os comandos estão em [`README.md`](README.md), não nos logs de tentativas anteriores.

## Resoluções

- **`educa-contracts-manifest-timeout`**: startup de pnpm por coleta removido, usando CLI local travada; ExcelJS carregado apenas dentro dos testes de exportação. Nenhum aumento de timeout ou remoção de expectativa. Full unit final: 1333 passaram, 20 skips preexistentes.
- **`educa-contracts-pdf-tool`**: coordenação provisionou `pdftotext` 26.01.0 neste host. Extração real do PDF e assertions passaram; nenhuma dependência do projeto ou imagem de produção foi alterada.
- **`educa-contracts-download-diagnostics`**: incompatibilidade `pageId` do wrapper manual impediu diagnóstico inicial. Instrução 005 autorizou reprodução focada instrumentada no Playwright existente, sem upgrade global nem controle manual paralelo.
- **`educa-contracts-frequency-download`**: metadados reais provaram mesmo blob, XLSX válido, chunk atualizado e atributo correto. Contrafactual isolado mostrou Chromium 152 preservando nome ASCII, mas substituindo nome com `º` por `download`. Normalização apenas de nomes resolveu; regressão real Excel/PDF e depois recorte browser completo passaram com expectativas originais. A troca candidata anterior de FileSaver por link nativo, sozinha, não resolveu e não é apresentada como a causa.
- **`educa-contracts-lavish-verification`**: instrução 006 autorizou `agent-browser` 0.37.1 já instalado. Export portátil verificado em claro/escuro, 1440 px e 390 px, com fontes/imagens reais, sem overflow da página e sem recursos externos. Namespace/sessão próprios, sem perfil, provider cloud ou auto-connect; cleanup confirmado. Sessão Lavish própria aberta e encerrada, sem share ou polling em background.

## Encerramento do recorte

- Typecheck, complexidade máxima 10, anti-slop e ESLint sem warnings aprovados.
- Unitários completos: 1333 aprovados, 20 skips preexistentes.
- SQL completo, incluindo 60 fontes, legado realmente pré-migração e concorrência: aprovado.
- Browser geral focado: 27/27.
- Piloto narrativo: 6/6, PDF real de 1.613.691 bytes com texto/fingerprint/IDs conferidos.
- Builds de produção locais e cleanup aprovados.
- Documentação durável em `docs/NARRATIVE-SOURCES-AND-SCHOOL-PERIODS.md`, referenciada por `CONTEXT.md`.
- Export local em `review.html`, verificação em `visual/`.

Mensagens `001.msg` até `006.msg` foram lidas e arquivadas em `handled/` no estado externo de coordenação. Não houve ampliação de acesso, uso de dados reais, banco compartilhado, promoção, deploy, merge ou alteração de branches históricos preservados.

Nenhum bloqueio permanece aberto. A entrega consiste na branch própria e PR explicitamente contra `dev`; integração/deploy exigem ação separada.
