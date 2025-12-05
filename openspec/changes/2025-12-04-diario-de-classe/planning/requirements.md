# Diário de Classe - Requisitos Coletados

## Resumo Executivo

Sistema de diário de classe digital para a rede municipal de Fronteira/MG, permitindo que professores registrem frequência, conteúdo ministrado e avaliações de forma estruturada e em conformidade com a BNCC.

**Timeline:** Pronto para Fevereiro 2025 (início do ano letivo)
**Usuário Principal:** Professor
**Dispositivos:** Tablets, celulares, desktops (deve funcionar em todos)

---

## Estrutura da Rede Municipal

### Escolas (9 total)
| Tipo | Quantidade | Faixa Etária | Organização Curricular |
|------|------------|--------------|------------------------|
| Creches | 4 | 0-3 anos | Campos de Experiência (BNCC) |
| Pré-escolas | 2 | 4-5 anos | Campos de Experiência (BNCC) |
| Fundamental I | 3 | 6-10 anos (1º-5º) | Disciplinas tradicionais |

### Tamanho das Turmas
- Varia muito dependendo da escola e série
- Deve suportar desde turmas pequenas (10-15) até grandes (25-35)

---

## Design e UX

### Modelo Visual
- **Escolhido:** Modelo de cards (baseado em `mockups-html/diario.html`)
- **Referência:** Cada aula é um card com resumo, clicável para detalhes
- **Componentes existentes:** Usar `gestao_fronteira/` como base e refinar

---

## Sistema de Frequência

### Estados de Presença
| Código | Significado | Cor |
|--------|-------------|-----|
| P | Presente | Verde |
| F | Falta | Vermelho |
| A | Atestado (falta justificada) | Amarelo/Laranja |

### Contabilização para Bolsa Família
- **A definir:** Verificar se Atestado conta como presença ou falta no cálculo de 80%
- **Regra:** Alunos com NIS precisam manter >= 80% de frequência

### Bloqueio Automático
- **Horário:** 18:00
- **Comportamento:** Frequência do dia fica imutável após esse horário
- **Princípio:** "Não existe o esquecer" - conformidade legal brasileira

---

## Conteúdo da Aula (Estruturado - BNCC Completo)

### Campos Obrigatórios
1. **Tema/Conteúdo** - O que foi ensinado
2. **Objetivo** - O que os alunos devem aprender
3. **Habilidades BNCC** - Códigos das habilidades trabalhadas
4. **Metodologia** - Como foi ensinado
5. **Recursos** - Materiais utilizados
6. **Observações** - Notas adicionais do professor

### Diferença por Etapa
- **Ed. Infantil:** Campos de Experiência (não disciplinas)
- **Fundamental I:** Disciplinas tradicionais (Português, Matemática, etc.)

---

## Sistema de Avaliação (Misto)

### Fundamental I (1º ao 5º ano)
- **Sistema:** Bimestral (4 bimestres)
- **Notas:** 0 a 10
- **Professor:** Leciona UMA disciplina por turma

### Educação Infantil (Creches e Pré-escolas)
- **Sistema:** Relatório descritivo
- **Formato:** Professor escreve relatório sobre desenvolvimento da criança
- **Referência:** Campos de Experiência da BNCC:
  1. O eu, o outro e o nós
  2. Corpo, gestos e movimentos
  3. Traços, sons, cores e formas
  4. Escuta, fala, pensamento e imaginação
  5. Espaços, tempos, quantidades, relações e transformações

---

## Relatórios (MVP)

### Prioridade: TODOS os seguintes

1. **Frequência Básica**
   - % frequência por aluno
   - % frequência por turma
   - Lista de faltosos

2. **Bolsa Família**
   - Alunos com NIS abaixo de 80%
   - Alertas proativos
   - Exportação para programa social

3. **Conteúdo Ministrado**
   - Conteúdo por período
   - Habilidades BNCC trabalhadas
   - Comparativo com planejamento

4. **Notas/Avaliações**
   - Boletim por aluno
   - Média por turma/disciplina
   - Relatórios descritivos (Ed. Infantil)

---

## Funcionalidades Adiadas (Não MVP)

- [ ] Professor substituto (login próprio)
- [ ] Modo offline completo (bom ter, não bloqueante)
- [ ] App mobile nativo

---

## Materiais de Referência

### Mockups HTML
- `mockups-html/diario.html` - Design de cards (ESCOLHIDO)
- `mockups-html/diario-papel.html` - Visão planilha (referência)
- `mockups-html/frequencia.html` - Grade de frequência

### Código Existente
- `gestao_fronteira/components/attendance/` - Componentes de frequência
- `gestao_fronteira/components/diary/` - Componentes de diário
- `gestao_fronteira/lib/validation/` - Validação brasileira

### Documentação
- `docs/bncc.md` - Resumo da BNCC para Ed. Infantil e Fundamental I

---

## Perguntas Pendentes

1. **Atestado no Bolsa Família:** Verificar com a Secretaria se atestado médico conta como presença ou falta no cálculo de 80%

2. **Habilidades BNCC:** Precisamos de uma lista completa das habilidades para seleção no sistema? Ou texto livre?

3. **Relatório descritivo:** Existe um modelo/template que a rede usa atualmente para os relatórios da Ed. Infantil?
