# Phase 5: Aluno & Diário Infantil - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Completar perfil do aluno com layout moderno e implementar módulo Diário Infantil seguindo BNCC. O diário registra vivências descritivas por Campo de Experiência — nunca notas ou conceitos. Foco em educação infantil (0-5 anos) com faixas etárias definidas pela BNCC.

</domain>

<decisions>
## Implementation Decisions

### Apresentação do Perfil
- Layout do header: avatar grande (~120px) à esquerda, nome + info ao lado
- Organização: duas colunas no desktop (dados pessoais | histórico), empilha no mobile
- Tags: lista de chips coloridos abaixo do nome (turma, turno, Bolsa Família)
- Stats no header: Claude's discretion baseado no contexto

### Seletor Campo de Experiência
- Apresentação: cards coloridos em grid (5 cards, um por campo)
- Seleção múltipla permitida (uma vivência pode trabalhar vários campos)
- Faixa etária: automática pela data de nascimento (Bebês 0-1a6m, Crianças bem pequenas 1a7m-3a11m, Crianças pequenas 4a-5a11m)
- Cores: usar cores oficiais do MEC/BNCC (confirmar na pesquisa)

### Fluxo de Vivência
- Formulário: modal/página completa com todos os campos visíveis
- Escopo: individual por padrão + opção "aplicar a vários alunos"
- Data: assume hoje por padrão, permite alterar
- Mídia: apenas texto descritivo (fotos adiadas — ver Deferred Ideas)

### Observações & Timeline
- Organização: agrupado por data (seções por dia/semana)
- Cards mostram: data, campo(s) de experiência, descrição

### Relatório de Desenvolvimento
- Tom: equilibrar linguagem acolhedora + termos técnicos BNCC
- Formato: texto corrido organizado por Campo de Experiência
- Geração: professor escreve manualmente, sistema mostra vivências como referência
- Exportação: PDF para impressão + visualização online
- NUNCA notas, conceitos ou indicadores numéricos

### Claude's Discretion
- Stats exibidos no header do perfil do aluno
- Exato layout dos cards de observação
- Formatação do PDF de relatório
- Tratamento de alunos sem vivências registradas

</decisions>

<specifics>
## Specific Ideas

- Cores dos Campos de Experiência devem seguir padrão oficial MEC (pesquisar documentos BNCC)
- Relatório deve ser adequado para entrega aos pais — linguagem acessível mas pedagogicamente fundamentada
- Sistema de referência: ao escrever relatório, professor vê lista das vivências do período para consulta

</specifics>

<deferred>
## Deferred Ideas

- **Anexo de fotos/vídeos às vivências** — requer análise jurídica LGPD para imagens de menores, termo de consentimento dos responsáveis, controle de acesso. Implementar em fase futura após definição legal.
- **Geração automática de relatório** — rascunho por IA baseado nas vivências. Pode ser útil mas requer validação pedagógica.

</deferred>

---

*Phase: 05-aluno-diario-infantil*
*Context gathered: 2026-01-17*
