# Phase 4: Turmas & Chamada - Context

**Gathered:** 2026-01-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Refatorar as telas de gestão de turmas (listagem em cards) e registro de frequência (chamada) seguindo o design system estabelecido. Crítico para compliance (imutabilidade, auto-lock 18h, Bolsa Família).

**Não inclui:** Painel de monitoramento para gestores (escopo separado se necessário).

</domain>

<decisions>
## Implementation Decisions

### Turma Card Design
- Duas ações diretas no card: "Fazer Chamada" + "Ver Diário"
- Faixa colorida no topo identifica série (gradiente: pink-500 Infantil, orange-500 Fund I, violet-500 Fund II)
- Clique no card (fora dos botões) abre detalhes da turma
- Hover com shadow + translate (já definido no roadmap)

### Interação de Chamada
- Botões P/F/J funcionam como toggle com feedback visual
- Salva em lote no final (não auto-save por clique)
- Clicar novamente no mesmo botão desmarca (retorna a neutro)
- Indicador "Alterações não salvas" + botão Salvar destacado quando há mudanças
- **Justificada (J): Motivo obrigatório** — ao marcar J, abre campo para informar motivo

### Indicadores de Frequência
- Percentual de frequência visível na linha do aluno (coluna dedicada)
- Alunos em risco: ícone ⚠️ + cor de fundo na linha (amarelo 60-75%, vermelho <60%)
- **Permissões diferenciadas:**
  - Professor: Visão simplificada (Claude decide detalhes, sem dados sensíveis)
  - Supervisores/Diretores/Secretaria: Veem % completo + badges Bolsa Família
- Bolsa Família: Badge "BF" sempre visível para gestores + alerta reforçado quando risco
- Resumo da turma (presentes/faltas/%) aparece **só após salvar** a chamada

### Navegação de Datas
- Setas < > para navegar dia anterior/próximo + clique na data abre calendário
- Botão "Hoje" sempre visível para retorno rápido
- **Futuro:** Pode navegar e ver, mas campos desabilitados (não pode preencher)
- **Passado após lock 18h:**
  - Visualização liberada para todos
  - Edição apenas para Secretaria de Educação e Admin (permissão específica)
- Calendário com indicadores: dias com chamada (verde), pendentes (cinza/vermelho)
- Lista separada de "Chamadas pendentes" além do calendário colorido
- **Nova chamada começa com todos Presentes** — professor marca as faltas
- Finais de semana e feriados aparecem desabilitados no calendário
- **Alternância de visualização:** Botões para mensal/semanal/diário

### Claude's Discretion
- Stats exibidos no card de turma (prioridade e formato)
- Detalhes da visão do professor durante chamada (quais dados mostrar sem revelar BF/%)
- Layout exato do formulário de motivo para Justificada
- Animações e transições de feedback

</decisions>

<specifics>
## Specific Ideas

- Calendário escolar será disponibilizado pelo usuário (usar para determinar dias letivos)
- Fluxo otimizado para professor: abrir chamada → ver todos como Presentes → marcar apenas as faltas
- Visão de gestor precisa funcionar tanto na tela de chamada (mais dados) quanto em painel separado de monitoramento

</specifics>

<deferred>
## Deferred Ideas

- Painel de monitoramento de frequência para gestores (escopo próprio se necessário)
- Relatórios Bolsa Família / Educacenso (Phase 5 ou posterior)

</deferred>

---

*Phase: 04-turmas-chamada*
*Context gathered: 2026-01-17*
