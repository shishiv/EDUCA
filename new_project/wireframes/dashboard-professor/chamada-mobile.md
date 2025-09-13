# Wireframe: Tela de Chamada (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Turma] [Turno] [Nome do Professor]          |
+------------------------------------------------------+
| [Contador de Presença: X de Y presentes]             |
+------------------------------------------------------+
| [Lista de Alunos]                                    |
| +----------------------------------------------+     |
| | [Avatar] [Nome do Aluno] [✔] [✖] [Justificar]|     |
| +----------------------------------------------+     |
| | ... (demais alunos) ...                      |     |
+------------------------------------------------------+
| [Sticky Footer: Botão Salvar Chamada]               |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Nome da turma, turno, nome do professor.
- **[Contador de Presença]**: Badge com “X de Y presentes”.
- **[Lista de Alunos]**: Cada linha contém avatar, nome, botão ✔ (presente), botão ✖ (ausente), botão “Justificar” (abre modal para justificativa).
- **[Sticky Footer]**: Botão “Salvar Chamada”, sempre visível na base da tela.
- **Responsividade**: Lista scrollável, footer fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Botões grandes, área tocável ≥ 44×44 px, labels explícitos.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para avatar, presença, ausência, justificar.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro ao salvar (“Chamada salva com sucesso”, “Erro ao salvar chamada”).
- Badge de presença atualizado em tempo real.
