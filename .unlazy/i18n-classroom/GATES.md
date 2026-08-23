# Classroom i18n gates — issue #18

## Escopo

- Esta branch cobre exclusivamente as telas e componentes de turmas, calendário, notas, sessões, diário, chamada e frequência.
- Os catálogos reservados são `app/messages/pt-BR/classroom.json` e `app/messages/en/classroom.json`; as estruturas permanecem idênticas.
- `pt-BR` continua o idioma padrão. `en` é opt-in pelo seletor da fundação; não há prefixo de locale nas rotas.
- Nenhum payload, valor de banco, código de status, data ISO, URL, autorização de frequência, RLS, Pilot Gate ou middleware foi alterado.

## Arquitetura e acessibilidade

- Componentes Client usam `useTranslations('classroom')`; conteúdo exibido permanece em catálogos, com labels e mensagens acessíveis também traduzidos.
- Nomes de turma, aluno, escola, professor, códigos BNCC e valores de domínio são dados e não são traduzidos.
- Regras de presença, bloqueio e reabertura continuam nos adapters/policies existentes; somente a apresentação foi localizada.
- Português e inglês têm paridade estrutural testada.

## Quatro passes

1. **Contrato:** fundação `b28dc6a1`, handoff e `.unlazy/i18n-foundation/GATES.md` lidos; escopo e gates de segurança congelados.
2. **Implementação:** catálogos por feature preenchidos e superfícies principais de classes, diário, calendário, notas, sessões e chamada conectadas ao namespace `classroom`.
3. **Revisão:** diff limitado aos caminhos de ownership; sem alterações em package/lock, layout, proxy, catálogos comuns, schema ou runtime de autorização.
4. **Verificação:** paridade de catálogo, traduções essenciais, typecheck e lint focado executados; `git diff --check` sem erros.

## Gate de parada

Pare se a mudança exigir schema, RLS, Pilot Gate, mudança de rota, payload, middleware/proxy ou catálogo fora de `classroom`. Não fazer push, merge, deploy, banco compartilhado ou produção.
