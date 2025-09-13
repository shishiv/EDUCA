# Wireframe: Relatórios de Frequência (Tablet 768×1024)

```
+--------------------------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]                        |
+--------------------------------------------------------------------------+
| [Menu Lateral: Dashboard, Relatórios, ...] |                             |
|--------------------------------------------|-----------------------------|
| [Filtros: Período, Escola, Turno, Turma]   |                             |
|--------------------------------------------|-----------------------------|
| [Botão Exportar CSV/Excel] (canto direito) |                             |
|--------------------------------------------|-----------------------------|
| [Tabela Detalhada: Turmas × Dias]          |                             |
| Turma | Dia 01 | Dia 02 | ... | Presentes | Ausentes |                  |
|-------|--------|--------|-----|-----------|----------|                  |
| ...   | ...    | ...    | ... | ...       | ...      |                  |
+--------------------------------------------------------------------------+
| [Gráfico Simples: Barra/Linha Frequência]                                |
+--------------------------------------------------------------------------+
| [Sticky Footer: Botão Sair]                                              |
+--------------------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Lateral]**: Navegação principal sempre visível à esquerda.
- **[Filtros]**: Período (date picker), Escola, Turno, Turma.
- **[Botão Exportar]**: CSV/Excel, destacado no canto direito superior da tabela.
- **[Tabela Detalhada]**: Turmas × dias, colunas de presentes/ausentes.
- **[Gráfico Simples]**: Barra ou linha, frequência por turma ou unidade, empilhado abaixo da tabela.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Tabela e gráfico empilhados, menu lateral fixo.
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
