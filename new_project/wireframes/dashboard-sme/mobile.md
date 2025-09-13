# Wireframe: Dashboard da SME (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Menu Hamburger]                                     |
+------------------------------------------------------+
| [Banner de Filtros: Mês/Período, Escola/Turno]       |
+------------------------------------------------------+
| [Cards KPI - Empilhados]                             |
| +-------------------+                                |
| | Total de Alunos   |                                |
| | Cadastrados       |                                |
| +-------------------+                                |
| +-------------------+                                |
| | Total de Professores|                              |
| | Ativos            |                                |
| +-------------------+                                |
| +-------------------+                                |
| | Chamadas Pendentes|                                |
| +-------------------+                                |
| +-------------------+                                |
| | Boletins Gerados  |                                |
| | no Período        |                                |
| +-------------------+                                |
+------------------------------------------------------+
| [Tabela Resumida por Escola/Turno]                   |
| (Scroll horizontal se necessário)                    |
| Escola | Turno | Nº Turmas | % Chamadas | Alunos     |
|        |       |           | Registradas | Presentes  |
+------------------------------------------------------+
| [Gráfico Interativo: Barra/Linha Frequência]         |
| (Empilhado abaixo da tabela, scroll horizontal)      |
+------------------------------------------------------+
| [Sticky Footer: Botão Sair]                          |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Hamburger]**: Abre navegação lateral.
- **[Banner de Filtros]**: Seletor de mês/período, dropdown de escola/turno.
- **[Cards KPI]**: Empilhados verticalmente, área tocável ≥ 44×44 px.
- **[Tabela Resumida]**: Scroll horizontal se necessário, colunas: Escola, Turno, Nº Turmas, % Chamadas Registradas, Alunos Presentes.
- **[Gráfico Interativo]**: Barra ou linha, frequência agregada, empilhado abaixo da tabela.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Elementos empilhados, scroll horizontal para tabela/gráfico.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, filtros, cards, gráfico.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro em ações (“Dados exportados com sucesso”, “Erro ao carregar dados”).
- Ícone de nuvem sempre visível.
