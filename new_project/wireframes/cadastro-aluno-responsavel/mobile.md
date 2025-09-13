# Wireframe: Formulário Wizard de Cadastro de Aluno/Responsável (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Etapas no Topo: 1/2/3/4/5] (scroll horizontal)      |
| [Indicador de Progresso: Etapa X de 5]               |
+------------------------------------------------------+
| [Formulário da Etapa Atual]                          |
| +--------------------------------------+             |
| | [Campos da etapa: labels + inputs]   |             |
| | Ex: Nome, Data Nasc., RG/CPF, etc.   |             |
| +--------------------------------------+             |
| [Botão: Anexar Documento] (se aplicável)|            |
+------------------------------------------------------+
| [Resumo dos Dados] (na etapa 5)                      |
| +--------------------------------------+             |
| | [Tabela/Lista de revisão]            |             |
| +--------------------------------------+             |
+------------------------------------------------------+
| [Sticky Footer: Botões Voltar / Próximo / Salvar]    |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Etapas no Topo]**: Abas ou passos no topo, scroll horizontal se necessário, destaque para etapa atual.
- **[Indicador de Progresso]**: “Etapa X de 5”, sempre visível.
- **[Formulário da Etapa Atual]**: Campos agrupados por etapa (ver especificação).
- **[Botão Anexar Documento]**: Upload de arquivos, se necessário.
- **[Resumo dos Dados]**: Revisão de todos os dados antes de salvar.
- **[Sticky Footer]**: Botões “Voltar”, “Próximo” (ou “Salvar” na última etapa), sempre visíveis.
- **Responsividade**: Elementos empilhados, campos otimizados para toque, footer fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo, área tocável ≥ 44×44 px.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para etapas, upload.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro ao salvar (“Cadastro salvo com sucesso”, “Erro ao salvar cadastro”).
- Validação de campos: mensagens em vermelho abaixo dos inputs.
