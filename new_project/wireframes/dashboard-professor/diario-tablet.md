# Wireframe: Tela de Diário de Classe (Tablet 768×1024)

```
+------------------------------------------------------------------+
| [Header: Turma] [Turno] [Nome do Professor]                      |
+------------------------------------------------------------------+
| [Seção: Conteúdo Ministrado]                                     |
| [Textarea: Lorem ipsum dolor sit amet...]                        |
+------------------------------------------------------------------+
| [Seção: Atividades Planejadas]                                   |
| [Lista de tópicos: Lorem ipsum, ...]                             |
+------------------------------------------------------------------+
| [Seção: Observações/Comportamento]                               |
| [Textarea: Lorem ipsum dolor sit amet...]                        |
+------------------------------------------------------------------+
| [Botão: Anexar Atestado] [Ícone de upload]                       |
+------------------------------------------------------------------+
| [Sticky Footer: Botão Salvar Diário]                             |
+------------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Nome da turma, turno, nome do professor.
- **[Seção: Conteúdo Ministrado]**: Textarea para descrição do conteúdo.
- **[Seção: Atividades Planejadas]**: Lista de tópicos (adicionar/remover).
- **[Seção: Observações/Comportamento]**: Textarea para observações.
- **[Botão: Anexar Atestado]**: Upload de PDF/imagem, ícone de clip.
- **[Sticky Footer]**: Botão “Salvar Diário”, sempre visível na base da tela.
- **Responsividade**: Seções mais largas, campos maiores, footer fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Botões grandes, área tocável ≥ 44×44 px, labels explícitos.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para upload.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro ao salvar (“Diário salvo com sucesso”, “Erro ao salvar diário”).
- Feedback visual para upload concluído ou erro.
