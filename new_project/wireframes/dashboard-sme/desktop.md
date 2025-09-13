# Wireframe: Dashboard da SME (Desktop 1440×900)

```
+--------------------------------------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]                                   |
+--------------------------------------------------------------------------------------+
| [Menu Lateral: Dashboard, Relatórios, Cadastro, ...] |                              |
|-----------------------------------------------------|------------------------------|
| [Banner de Filtros: Mês/Período, Escola/Turno]      |                              |
|-----------------------------------------------------|------------------------------|
| [Grid de Cards KPI]                                 |                              |
|  +-------------------+  +-----------------------+   |                              |
|  | Total de Alunos   |  | Total de Professores  |   |                              |
|  | Cadastrados       |  | Ativos                |   |                              |
|  +-------------------+  +-----------------------+   |                              |
|  +-------------------+  +-----------------------+   |                              |
|  | Chamadas          |  | Boletins Gerados      |   |                              |
|  | Pendentes         |  | no Período            |   |                              |
|  +-------------------+  +-----------------------+   |                              |
|-----------------------------------------------------|------------------------------|
| [Tabela Resumida por Escola/Turno]                  | [Gráfico Interativo]         |
| Escola | Turno | Nº Turmas | % Chamadas | Alunos    | [Barra/Linha: Frequência]    |
|        |       |           | Registradas | Presentes |                             |
|-----------------------------------------------------|------------------------------|
| [Sticky Footer: Botão Sair]                         |                              |
+--------------------------------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Lateral]**: Navegação principal sempre visível à esquerda.
- **[Banner de Filtros]**: Seletor de mês/período, dropdown de escola/turno.
- **[Grid de Cards KPI]**: Total de alunos, professores, chamadas pendentes, boletins gerados.
- **[Tabela Resumida]**: Colunas: Escola, Turno, Nº Turmas, % Chamadas Registradas, Alunos Presentes.
- **[Gráfico Interativo]**: Barra ou linha, frequência agregada (ex: média mensal por unidade).
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Cards em grid, tabela e gráfico lado a lado, menu lateral fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Áreas tocáveis ≥ 44×44 px, labels explícitos, contraste mínimo.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, filtros, cards, gráfico.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro em ações (“Dados exportados com sucesso”, “Erro ao carregar dados”).
- Ícone de nuvem sempre visível.
