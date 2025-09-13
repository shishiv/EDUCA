# Wireframe: Relatórios de Frequência (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Menu Hamburger]                                     |
+------------------------------------------------------+
| [Filtros: Período, Escola, Turno, Turma]             |
+------------------------------------------------------+
| [Botão Exportar CSV/Excel] (destacado acima da tabela)|
+------------------------------------------------------+
| [Tabela Detalhada: Turmas × Dias]                    |
| (Scroll horizontal se necessário)                    |
| Turma | Dia 01 | Dia 02 | ... | Presentes | Ausentes |
|-------|--------|--------|-----|-----------|----------|
| ...   | ...    | ...    | ... | ...       | ...      |
+------------------------------------------------------+
| [Gráfico Simples: Barra/Linha Frequência]            |
| (Empilhado abaixo da tabela, scroll horizontal)      |
+------------------------------------------------------+
| [Sticky Footer: Botão Sair]                          |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Hamburger]**: Abre navegação lateral.
- **[Filtros]**: Período (date picker), Escola, Turno, Turma, compactos.
- **[Botão Exportar]**: CSV/Excel, destacado acima da tabela.
- **[Tabela Detalhada]**: Turmas × dias, colunas de presentes/ausentes, scroll horizontal se necessário.
- **[Gráfico Simples]**: Barra ou linha, frequência por turma ou unidade, empilhado abaixo da tabela.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Elementos empilhados, scroll horizontal para tabela/gráfico.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo, área tocável ≥ 44×44 px.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, filtros, exportar, gráfico.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro em exportação (“Exportação concluída”, “Erro ao exportar”).
- Ícone de nuvem sempre visível.
