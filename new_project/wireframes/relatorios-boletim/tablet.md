# Wireframe: Relatórios de Boletim (Tablet 768×1024)

```
+--------------------------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]                        |
+--------------------------------------------------------------------------+
| [Menu Lateral: Dashboard, Relatórios, ...] |                             |
|--------------------------------------------|-----------------------------|
| [Filtros: Período (bimestre/semestre), Escola, Turno] |                  |
|--------------------------------------------|-----------------------------|
| [Lista de Turmas]                          | [Botão: Visualizar/Exportar]|
| Turma 1 [Visualizar/Exportar]              |                             |
| Turma 2 [Visualizar/Exportar]              |                             |
| ...                                        |                             |
+--------------------------------------------------------------------------+
| [Modal/Página: Boletim da Turma]                                        |
| +----------------------------------------------------------+            |
| | [Tabela: Aluno × Disciplina]                             |            |
| | Aluno | Disciplina 1 | ... | Média Final |               |            |
| |-------|--------------|-----|-------------|               |            |
| | ...   | ...          | ... | ...         |               |            |
| +----------------------------------------------------------+            |
| [Botão: Exportar PDF]   [Botão: Enviar E-mail]                         |
+--------------------------------------------------------------------------+
| [Sticky Footer: Botão Sair]                                              |
+--------------------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Lateral]**: Navegação principal sempre visível à esquerda.
- **[Filtros]**: Período (bimestre/semestre), Escola, Turno.
- **[Lista de Turmas]**: Cada turma com botão “Visualizar/Exportar Boletim”.
- **[Modal/Página: Boletim]**: Tabela de alunos × disciplina, notas, média final.
- **[Botão Exportar PDF]**: Exporta boletim em PDF.
- **[Botão Enviar E-mail]**: Envia boletim por e-mail.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Elementos empilhados, menu lateral fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo, área tocável ≥ 44×44 px.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, filtros, exportar, e-mail.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro em exportação/envio (“PDF exportado”, “E-mail enviado”, “Erro ao exportar”).
- Ícone de nuvem sempre visível.
