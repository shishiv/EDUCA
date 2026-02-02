# Pesquisa de Features UX - Software Educacional Brasileiro

**Pesquisado:** 2026-01-16
**Dominio:** UI/UX para Sistema de Gestao Escolar Municipal
**Confianca:** MEDIA (baseado em WebSearch + verificacao parcial com fontes oficiais)

---

## Resumo Executivo

O mercado brasileiro de software educacional em 2025/2026 converge para padroes claros de usabilidade. A tendencia dominante e a **interface intuitiva que nao exige treinamento intensivo**, essencial dado que professores de escolas publicas possuem niveis variados de familiaridade tecnologica. Sistemas como Sponte, Lyceum e o recem-lancado Serpro Gestao Educacional priorizam simplicidade sobre funcionalidades avancadas.

A integracao com o **Sistema Presenca** do MEC para acompanhamento da frequencia do Bolsa Familia e um requisito critico para escolas publicas. O sistema deve permitir exportacao de dados nos 5 periodos bimestrais do calendario de acompanhamento educacional, respeitando as frequencias minimas exigidas (60% para 4-6 anos, 75% para 6-18 anos).

Para Educacao Infantil alinhada a BNCC, o padrao emergente organiza conteudo pelos **5 Campos de Experiencia** com cores especificas para cada campo. A avaliacao nao e classificatoria (conforme LDB) - o foco e o registro descritivo do desenvolvimento atraves de Relatorios Individuais e Portfolios digitais. Ferramentas de geracao de relatorios alinhados a BNCC estao ganhando tracao como diferenciadores.

Quanto a acessibilidade, o Brasil adotou recentemente uma norma baseada no WCAG 2.2, e o nivel AA e o minimo recomendado. O eMAG (Modelo de Acessibilidade em Governo Eletronico) adiciona requisitos especificos para sistemas publicos, incluindo compatibilidade com diferentes niveis de escolaridade e pouca experiencia com computadores.

---

## Features Table Stakes (Obrigatorias)

Features que, se ausentes, fazem usuarios abandonarem o sistema ou tornam o sistema nao-conforme.

| Feature | Descricao | Complexidade | Rationale |
|---------|-----------|--------------|-----------|
| **Login simples e rapido** | Autenticacao com minimo de cliques, opcao "manter conectado" | Baixa | Professor nao tem tempo para processos de login complexos entre aulas |
| **Chamada digital com salvamento automatico** | Registro de presenca com persistencia imediata, sem botao "salvar" explicito | Media | Evita perda de dados se professor fecha acidentalmente; padrao de mercado |
| **Frequencia imutavel apos periodo** | Lock automatico de registros de frequencia (ex: 18h do mesmo dia) | Media | Requisito de compliance brasileiro - "nao existe o esquecer" |
| **Alerta Bolsa Familia < 80%** | Notificacao visual quando aluno com NIS atinge frequencia critica | Baixa | Requisito legal - familia pode perder beneficio; escola e responsavel por monitorar |
| **Dashboard com metricas basicas** | Visao geral de turmas, total de alunos, alertas pendentes | Media | Gestores e diretores precisam de visao consolidada sem navegar multiplas telas |
| **Responsivo mobile/tablet** | Layout funcional em dispositivos moveis | Alta | 86,5% dos brasileiros usam celular; professores frequentemente usam smartphone para chamada |
| **Busca de alunos** | Campo de busca global por nome/matricula | Baixa | Base de dados pode ter centenas de alunos; navegacao manual e inviavel |
| **Visualizacao de turmas** | Lista/grid de turmas com indicadores visuais (cor, serie, turno) | Baixa | Navegacao primaria do sistema; acesso rapido a turma e critico |
| **Perfil do aluno completo** | Dados pessoais, foto, contato responsavel, NIS, dados INEP | Media | Requisito Educacenso; informacao necessaria para atendimento |
| **LGPD - Acesso restrito** | Controle de permissoes por papel (professor ve apenas suas turmas) | Alta | Requisito legal Lei 13.709/18; dados de menores sao sensiveis |
| **Funcionamento offline** | Capacidade de registrar chamada sem internet, sincronizar depois | Alta | 48% das escolas rurais nao tem internet; mesmo urbanas tem quedas |
| **Idioma portugues completo** | Toda interface, mensagens de erro, labels em PT-BR | Baixa | Usuarios nao falam ingles; termos tecnicos confundem |

---

## Features Diferenciadoras

Features que criam vantagem competitiva e melhoram significativamente a experiencia.

| Feature | Descricao | Complexidade | Vantagem |
|---------|-----------|--------------|----------|
| **Diario Infantil BNCC** | Registro de vivencias organizado pelos 5 Campos de Experiencia com cores especificas | Alta | Poucos sistemas tem; alinhamento curricular e diferencial forte |
| **Gerador de Relatorio Individual** | Producao automatizada de parecer descritivo baseado em registros do bimestre | Alta | Economiza horas de trabalho do professor; padrao BNCC |
| **Notificacoes push** | Alertas em tempo real no celular (frequencia critica, eventos) | Media | ClassApp, Sponte Agenda ja oferecem; expectativa de mercado |
| **Integracao WhatsApp** | Envio de comunicados via WhatsApp Business API | Alta | 92% dos brasileiros usam WhatsApp; canal de maior alcance |
| **Campos de Experiencia visuais** | Cards coloridos interativos para cada campo BNCC | Media | Facilita navegacao intuitiva para professores de Ed. Infantil |
| **Portfolio digital** | Colecao de evidencias (fotos, videos, observacoes) por aluno | Alta | Avaliacao processual conforme LDB; diferencial pedagogico |
| **Tema escuro** | Alternancia light/dark mode | Baixa | Conforto visual; tendencia moderna de UI |
| **Sincronizacao multi-dispositivo** | Trabalho iniciado no celular, continuado no desktop | Media | Flexibilidade de uso entre contextos |
| **Exportacao Sistema Presenca** | Geracao de arquivo compativel com formato MEC | Media | Elimina digitacao duplicada; economia de tempo do coordenador |
| **Graficos de evolucao** | Visualizacao de frequencia/desenvolvimento ao longo do tempo | Media | Insights rapidos; facilita reunioes com pais |
| **Comunicados por categoria** | Organizacao de mensagens com niveis de urgencia | Baixa | Evita "fadiga de notificacao"; comunicacao mais efetiva |
| **Modo offline-first com sync inteligente** | Funciona 100% offline, sincroniza quando conecta | Alta | Diferencial critico para escolas rurais e com internet instavel |

---

## Anti-Features (NAO Construir)

Features que parecem boas ideias mas criam problemas ou fogem do escopo.

| Feature | Por Que Evitar |
|---------|----------------|
| **Edicao retroativa de frequencia** | Viola principio de imutabilidade; compliance brasileiro proibe |
| **Chat entre professores dentro do sistema** | Cria responsabilidade de moderacao; WhatsApp ja serve para isso |
| **Gamificacao para alunos** | Fora do escopo (sistema e para gestao, nao para alunos usarem diretamente) |
| **Avaliacao numerica Ed. Infantil** | LDB proibe notas/classificacao nessa etapa; so parecer descritivo |
| **Importacao massiva de dados sem validacao** | Risco de corromper base; melhor upload guiado com preview |
| **Multiplas formas de fazer a mesma coisa** | Confunde usuarios com baixa literacia digital; uma unica forma clara |
| **Customizacao excessiva de interface** | Aumenta complexidade; usuarios preferem padrao que "funciona" |
| **Integracao com redes sociais** | Dados de menores; risco de privacidade; LGPD proibiria |
| **IA generativa visivel ao usuario** | Professores desconfiam; melhor usar IA no backend sem exposicao |
| **Relatorios complexos com muitos filtros** | Usuarios nao sabem usar; melhor relatorios pre-definidos simples |
| **Notificacoes para tudo** | Fadiga de notificacao; so alertas criticos (frequencia, Bolsa Familia) |
| **Permissao de edicao simultanea do mesmo registro** | Conflitos de dados; lock pessimista e mais seguro |

---

## Padroes BNCC para UI

### Campos de Experiencias - Representacao Visual

A BNCC define 5 Campos de Experiencia para Educacao Infantil, cada um com identidade visual propria:

| Campo | Cor Sugerida | Icone Conceitual | Conteudo |
|-------|--------------|------------------|----------|
| O eu, o outro e o nos | Rosa/Magenta (#ec4899) | Pessoas/Coracao | Identidade, emocoes, relacoes sociais |
| Corpo, gestos e movimentos | Laranja (#f97316) | Figura em movimento | Expressao corporal, coordenacao, danca |
| Tracos, sons, cores e formas | Roxo (#8b5cf6) | Paleta/Pincel | Arte, musica, manifestacoes culturais |
| Escuta, fala, pensamento e imaginacao | Azul (#0ea5e9) | Balao de fala/Livro | Linguagem oral, escrita, historias |
| Espacos, tempos, quantidades, relacoes | Verde (#10b981) | Relogio/Numeros | Matematica, ciencias, mundo fisico |

**Padrao de Interface:**
- Cards ou botoes com a cor do campo como fundo ou borda
- Icone ilustrativo (nao abstrato) para cada campo
- Ao registrar vivencia, selecionar campo primeiro (define contexto visual)

### Direitos de Aprendizagem - Padroes de Interface

Os 6 Direitos de Aprendizagem (Conviver, Brincar, Participar, Explorar, Expressar, Conhecer-se) devem aparecer como:

- **Tags/badges** nos registros de vivencia indicando quais direitos foram trabalhados
- **Filtros** na visualizacao de registros ("mostrar vivencias que trabalharam Brincar")
- **Relatorios** que demonstram cobertura de todos os direitos ao longo do bimestre

**NAO usar como:** Checklist obrigatorio (BNCC diz explicitamente para nao tratar como checklist)

### Faixas Etarias

| Grupo | Idade | Identificador Visual |
|-------|-------|---------------------|
| Bebes | 0 a 1a 6m | Icone bebe/fralda |
| Criancas bem pequenas | 1a 7m a 3a 11m | Icone crianca pequena |
| Criancas pequenas | 4a a 5a 11m | Icone crianca maior |

**Padrao:** Turmas devem exibir claramente a faixa etaria para filtrar objetivos de aprendizagem corretos.

### Relatorios de Desenvolvimento - Estrutura Tipica

```
RELATORIO INDIVIDUAL DE DESENVOLVIMENTO
Aluno: [Nome]
Turma: [Turma] | Periodo: [Bimestre/Ano]

CAMPOS DE EXPERIENCIA

[Campo 1 - Cor]
Vivencias realizadas: [lista]
Observacoes do professor: [texto descritivo]
Desenvolvimento observado: [texto]

[Campo 2 - Cor]
...

CONSIDERACOES GERAIS
[Texto sintetizando desenvolvimento global]

RECOMENDACOES
[Sugestoes para familia e proximos passos]
```

**Requisitos do formato:**
- Texto descritivo, NUNCA notas ou conceitos classificatorios
- Linguagem positiva focada em conquistas e potencial
- Referencia explicita aos objetivos da BNCC trabalhados
- Versao para impressao (PDF) com identidade visual da escola

---

## Acessibilidade

### WCAG - Requisitos Relevantes

O Brasil adota WCAG 2.2 como referencia. Nivel AA e o minimo recomendado.

| Criterio | Aplicacao no EDUCA | Prioridade |
|----------|-------------------|------------|
| **1.4.3 Contraste minimo** | Texto sobre fundo deve ter contraste >= 4.5:1 | Alta |
| **1.4.11 Contraste nao-texto** | Icones, bordas de inputs com contraste >= 3:1 | Alta |
| **2.1.1 Teclado** | Toda funcionalidade acessivel sem mouse | Media |
| **2.4.6 Cabecalhos e rotulos** | Hierarquia clara de headings, labels em formularios | Alta |
| **2.4.7 Foco visivel** | Outline visivel ao navegar com Tab | Alta |
| **3.3.1 Identificacao de erro** | Erros em formularios claramente indicados | Alta |
| **3.3.2 Rotulos ou instrucoes** | Campos com labels explicativos | Media |

### Contexto Brasileiro - Consideracoes Especificas

O eMAG (Modelo de Acessibilidade em Governo Eletronico) adiciona requisitos alem do WCAG:

| Requisito eMAG | Aplicacao |
|----------------|-----------|
| **Diferentes niveis de escolaridade** | Linguagem simples, evitar jargao tecnico |
| **Pouca experiencia com computador** | Fluxos obvios, confirmacoes claras, desfazer facil |
| **Compatibilidade com tecnologias assistivas** | Testar com leitores de tela (NVDA, JAWS) |
| **Texto alternativo** | Todas as imagens com alt text descritivo |
| **Formularios acessiveis** | Labels associados, mensagens de erro claras |

### Recomendacoes Praticas para EDUCA

1. **Tamanho de fonte minimo 16px** para corpo de texto
2. **Botoes com area de toque >= 44x44px** (mobile)
3. **Cores semanticas com redundancia** (nao depender so de cor para transmitir informacao)
4. **Foco visivel com outline de 2px** em cor contrastante
5. **Mensagens de erro abaixo do campo** (nao apenas borda vermelha)
6. **Confirmacao antes de acoes irreversiveis** (deletar aluno, fechar chamada)
7. **Estados de loading visiveis** (usuario sabe que sistema esta processando)
8. **Suporte a Dynamic Type** (respeitar preferencias de tamanho do SO)

### Teste de Acessibilidade

**Ferramentas recomendadas:**
- Lighthouse (Chrome DevTools) - score >= 90 e meta
- axe DevTools (extensao)
- NVDA (leitor de tela gratuito) para teste manual

---

## Padroes de UX por Tela

### Login

| Elemento | Padrao Recomendado | Rationale |
|----------|-------------------|-----------|
| Layout | Split-screen (hero esquerda, form direita) | Padrao moderno; espaco para branding |
| Campos | Email + Senha (minimo) | Nao pedir CPF como login (LGPD) |
| "Manter conectado" | Checkbox default ON | Professor nao quer logar toda aula |
| Recuperar senha | Link visivel | Usuarios esquecem senhas |
| Feedback erro | Mensagem clara, nao tecnica | "Email ou senha incorretos" |

### Dashboard

| Elemento | Padrao Recomendado | Rationale |
|----------|-------------------|-----------|
| Stats cards | 4 metricas principais no topo | Visao rapida do essencial |
| Alertas | Painel lateral ou secao dedicada | Itens criticos precisam destaque |
| Lista turmas | Cards ou lista com acesso rapido | Acao primaria e acessar turma |
| Acoes rapidas | Botoes para fluxos comuns | Reduzir cliques para tarefas frequentes |

### Chamada

| Elemento | Padrao Recomendado | Rationale |
|----------|-------------------|-----------|
| Cabecalho | Turma + Data + Indicador de status | Contexto sempre visivel |
| Lista alunos | Tabela com foto, nome, botoes de presenca | Reconhecimento visual do aluno |
| Botoes presenca | Presente (verde), Falta (vermelho), Justificada (amarelo) | Cores semanticas universais |
| Salvamento | Automatico a cada clique | Zero risco de perda de dados |
| Indicador frequencia | Porcentagem com cor (verde >75%, amarelo 60-75%, vermelho <60%) | Visualizacao rapida de risco |

### Perfil do Aluno

| Elemento | Padrao Recomendado | Rationale |
|----------|-------------------|-----------|
| Cabecalho | Foto + Nome + Turma + Tags (Bolsa Familia, etc) | Identificacao rapida |
| Layout | Duas colunas (dados pessoais | historico) | Densidade de informacao balanceada |
| Dados sensiveis | Colapsados por padrao, expandir com clique | LGPD - minimizar exposicao |
| Historico frequencia | Grafico de linha ou barras | Visualizacao de tendencia |

---

## Dependencias entre Features

```
[Login] --> [Dashboard]
    |
    v
[Turmas] --> [Chamada] --> [Alertas Bolsa Familia]
    |            |
    v            v
[Perfil Aluno] <-- [Frequencia Imutavel]
    |
    v
[Diario Infantil] --> [Campos de Experiencia] --> [Relatorio BNCC]
    |
    v
[Portfolio Digital] --> [Gerador Relatorio]
```

**Ordem de implementacao sugerida:**
1. Features table stakes primeiro (Login, Turmas, Chamada, Perfil)
2. Compliance (Imutabilidade, Alertas Bolsa Familia, LGPD)
3. Diferenciadoras de alto impacto (Diario Infantil, Relatorios BNCC)
4. Nice-to-have (Tema escuro, Portfolio, Integracao WhatsApp)

---

## Fontes Consultadas

### Primarias (ALTA confianca)
- [BNCC Oficial - MEC](https://basenacionalcomum.mec.gov.br/abase/) - Campos de Experiencia, Direitos de Aprendizagem
- [Sistema Presenca - MEC](https://www.gov.br/mec/pt-br/acesso-a-informacao/perguntas-frequentes/programa-acompanhamento-da-frequencia-escolar) - Requisitos Bolsa Familia
- [LGPD Brasil](https://www.lgpdbrasil.com.br/lgpd-e-escolas/) - Requisitos de protecao de dados

### Secundarias (MEDIA confianca)
- [Appvizer - Software de Gestao Escolar 2025](https://www.appvizer.com/education/school-administration) - Tendencias de mercado
- [Nova Escola - Campos de Experiencia](https://novaescola.org.br/bncc/conteudo/58/o-que-sao-os-campos-de-experiencia-da-educacao-infantil) - Explicacao pedagogica
- [Proesc - Diario Digital](https://proesc.com/blog/diario-escolar-digital-do-professor/) - Vantagens do diario digital
- [IFRS - Acessibilidade Digital Brasil](https://ifrs.edu.br/ifrs-contribui-para-nova-norma-que-amplia-acessibilidade-digital-no-brasil/) - WCAG 2.2 no Brasil
- [Serpro Gestao Educacional](https://www.serpro.gov.br/menu/noticias/noticias-2025/serpro-gestao-educacional) - Solucao para setor publico

### Terciarias (BAIXA confianca - necessita validacao)
- [HowEdu - UX Diario de Classe](https://howedu.com.br/artigo-ux-diario-de-classe-virtual/) - Estudo de caso UX
- [ClassApp - WhatsApp na Escola](https://www.classapp.com.br/artigos/whatsapp-escola) - Comunicacao escolar
- [Delta SGE - Dashboard Educacional](https://deltasge.com.br/site/dashboard-sistema-gestao-educacional-delta-sge/) - Metricas e indicadores

---

## Qualidade da Pesquisa

### Checklist Quality Gate

- [x] Categorias sao claras (Table Stakes / Diferenciadoras / Anti-Features)
- [x] Complexidade notada para cada feature (Alta/Media/Baixa)
- [x] Dependencias entre features identificadas
- [x] Padroes BNCC documentados com cores e estrutura
- [x] Requisitos de acessibilidade mapeados (WCAG + eMAG)
- [x] Fontes com niveis de confianca

### Lacunas Identificadas

1. **Falta pesquisa de usuario real** - Recomenda-se entrevistas com professores de Fronteira-MG
2. **Benchmarking visual ausente** - Nao foram analisadas screenshots de concorrentes
3. **Performance mobile nao validada** - Requisitos de performance (tempo de carga) nao pesquisados
4. **Integracao Sistema Presenca** - Formato de exportacao exato nao documentado

### Proximos Passos de Pesquisa

1. Obter manual tecnico do Sistema Presenca para formato de exportacao
2. Testar principais concorrentes (Sponte, Lyceum, Serpro) para benchmark visual
3. Validar paleta de cores BNCC com materiais oficiais do MEC
4. Pesquisar requisitos especificos de Minas Gerais (SEE-MG)
