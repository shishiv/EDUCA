# EDUCA - Missão do Produto

## Pitch

**EDUCA** é um sistema de gestão educacional municipal que elimina o caos do papel e dá visibilidade em tempo real para a Secretaria Municipal de Educação de Fronteira/MG, permitindo que professores foquem no ensino enquanto a conformidade governamental acontece automaticamente.

## Problema Central

### Prioridade dos Problemas (em ordem):

1. **Caos do Papel** - Registros perdidos, trabalho duplicado, documentos ilegíveis
2. **Sem Visibilidade em Tempo Real** - Secretaria só vê o que acontece no final do mês
3. **Ineficiência do Professor** - Escreve no papel, depois alguém digita
4. **Conformidade Atrasada** - Relatórios governamentais entregues tarde ou incompletos

### Situação Atual
- **Sistema Legado:** Misto de papel + planilhas, sem consistência
- **Escala:** 5-15 escolas, 1.000-5.000 alunos
- **Dor Principal:** Registros não são usados para melhorar o ensino - dados existem mas não informam decisões pedagógicas

### Impacto
- Frequência manual leva 10-15 minutos por turma diariamente
- Relatórios Educacenso exigem semanas de compilação manual
- Monitoramento do Bolsa Família é reativo, não proativo
- Professores fazem trabalho duplicado (papel → digitação)

## Usuários

### Usuário Principal: Professor

**O professor é o usuário que DEVE estar encantado para o projeto ter sucesso.**

Se a experiência do professor for dolorosa, a adoção falha. Todo o design deve priorizar a experiência do professor em sala de aula.

**Dispositivos:** Misto (tablets, celulares pessoais, computadores) - deve funcionar em todos

### Personas

**Professor (25-55 anos)** ⭐ PRIMÁRIO
- **Contexto:** Sala de aula, marcando frequência, gerenciando conteúdo
- **Dores:** Papel de frequência, tempo perdido em burocracia, sem ferramentas móveis
- **Objetivo:** Frequência rápida, registro de aulas, lançamento de notas
- **Sucesso:** Usa o sistema diariamente sem reclamar

**Secretário Municipal (40-60 anos)**
- **Contexto:** Secretaria de Educação, supervisiona toda a rede
- **Dores:** Sem visibilidade até o final do mês, relatórios atrasados
- **Objetivo:** Ver o que está acontecendo em tempo real, compliance automático
- **Sucesso:** Sabe o status de qualquer escola a qualquer momento

**Diretor (35-55 anos)**
- **Contexto:** Gerencia a escola, ponte entre professores e município
- **Dores:** Frequência em papel, relatórios atrasados, falta de visibilidade
- **Objetivo:** Dashboard da escola, gestão de funcionários

**Secretário Escolar (25-45 anos)**
- **Contexto:** Matrícula, registros, tarefas administrativas
- **Dores:** Entrada manual de dados, registros duplicados
- **Objetivo:** Cadastro eficiente, registros precisos

**Responsável (25-60 anos)**
- **Contexto:** Acompanha educação do filho
- **Dores:** Sem visibilidade, comunicação difícil com escola
- **Objetivo:** Alertas de frequência, acompanhamento do progresso

## Definição de Sucesso

O projeto é bem-sucedido quando **TODOS** estes critérios são atendidos:

1. **Professores usando diariamente** - Alta adoção, professores preferem ao papel
2. **Zero papel** - Eliminação completa de registros de frequência em papel
3. **Conformidade atendida** - INEP, Bolsa Família, todos os relatórios no prazo
4. **Secretária satisfeita** - Visibilidade e controle em tempo real

## Diferenciadores

### Design Brasileiro-Primeiro
Construído especificamente para requisitos educacionais brasileiros: validação de CPF, integração NIS, códigos INEP, interface em português.

### Imutabilidade da Frequência
Aplica o requisito legal de que registros de frequência não podem ser modificados após submissão ("não existe o esquecer").

### Arquitetura Municipal Multi-Escola
Isolamento completo de dados entre escolas via Row Level Security, com visibilidade unificada para a Secretaria.

### Experiência Mobile-First
Prioriza tablets e celulares para uso em sala de aula. Frequência em menos de 60 segundos.

## Escopo MVP

**Diário Completo:** Frequência + Conteúdo das Aulas + Notas

Este é o mínimo que deixará os professores satisfeitos. Não apenas frequência - eles precisam registrar o que ensinaram e avaliar os alunos.

## Timeline

**Meta:** Pronto para o ano letivo 2025 (Fevereiro 2025 - início das aulas no Brasil)

## Funcionalidades Principais

### Core
- **Cadastro de Alunos:** Perfis INEP-compliant com validação brasileira (CPF, telefone)
- **Marcação de Frequência:** Workflow "Abrir aula" otimizado para touch, suporte offline
- **Administração Multi-Escola:** Gestão municipal com isolamento de dados via RLS
- **Gestão de Usuários:** 5 papéis (Admin, Diretor, Secretário, Professor, Responsável)

### Diário de Classe
- **Registro de Aulas:** Conteúdo ministrado, observações
- **Lançamento de Notas:** Sistema bimestral com observações semestrais
- **Planejamento:** Conteúdo programático por disciplina

### Conformidade
- **INEP/Educacenso:** Exportação de dados para relatórios anuais
- **Bolsa Família:** Monitoramento automático do limiar de 80% com alertas
- **LGPD:** Gestão de consentimento, trilha de auditoria

### Analytics
- **Dashboard Executivo:** Métricas em tempo real
- **Relatórios de Frequência:** Por turma, aluno, período
- **Busca Ativa:** Identificação proativa de alunos abaixo do limiar
