# Wireframe: Relatórios de Boletim (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Menu Hamburger]                                     |
+------------------------------------------------------+
| [Filtros: Período (bimestre/semestre), Escola, Turno]|
+------------------------------------------------------+
| [Lista de Turmas]                                    |
| Turma 1 [Visualizar/Exportar]                        |
| Turma 2 [Visualizar/Exportar]                        |
| ...                                                  |
+------------------------------------------------------+
| [Modal/Página: Boletim da Turma]                     |
| +-----------------------------------------------+    |
| | [Tabela: Aluno × Disciplina]                  |    |
| | (Scroll horizontal se necessário)             |    |
| | Aluno | Disciplina 1 | ... | Média Final |    |    |
| |-------|--------------|-----|-------------|    |    |
| | ...   | ...          | ... | ...         |    |    |
| +-----------------------------------------------+    |
| [Botão: Exportar PDF]   [Botão: Enviar E-mail]       |
+------------------------------------------------------+
| [Sticky Footer: Botão Sair]                          |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Hamburger]**: Abre navegação lateral.
- **[Filtros]**: Período (bimestre/semestre), Escola, Turno, compactos.
- **[Lista de Turmas]**: Cada turma com botão “Visualizar/Exportar Boletim”.
- **[Modal/Página: Boletim]**: Tabela de alunos × disciplina, notas, média final, scroll horizontal se necessário.
- **[Botão Exportar PDF]**: Exporta boletim em PDF.
- **[Botão Enviar E-mail]**: Envia boletim por e-mail.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Elementos empilhados, tabela com scroll horizontal.
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
