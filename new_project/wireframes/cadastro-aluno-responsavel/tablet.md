# Wireframe: Formulário Wizard de Cadastro de Aluno/Responsável (Tablet 768×1024)

```
+--------------------------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]                        |
+--------------------------------------------------------------------------+
| [Menu Lateral: Dashboard, Cadastro, ...] |                               |
|------------------------------------------|-------------------------------|
| [Wizard: Etapas Laterais ou no Topo]     |                               |
| 1. Dados do Aluno                        | [Indicador de Progresso:      |
| 2. Responsável 1                         |  Etapa X de 5]                |
| 3. Responsável 2 (opcional)              |                               |
| 4. Matrícula                             |                               |
| 5. Resumo e Confirmação                  |                               |
|------------------------------------------|-------------------------------|
| [Formulário da Etapa Atual]              |                               |
| +--------------------------------------+ |                               |
| | [Campos da etapa: labels + inputs]   | |                               |
| | Ex: Nome, Data Nasc., RG/CPF, etc.   | |                               |
| +--------------------------------------+ |                               |
| [Botão: Anexar Documento] (se aplicável)|                               |
|------------------------------------------|-------------------------------|
| [Resumo dos Dados] (na etapa 5)         |                               |
| +--------------------------------------+ |                               |
| | [Tabela/Lista de revisão]            | |                               |
| +--------------------------------------+ |                               |
|------------------------------------------|-------------------------------|
| [Sticky Footer: Botões Voltar / Próximo / Salvar]                        |
+--------------------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Lateral]**: Navegação principal sempre visível à esquerda.
- **[Wizard: Etapas]**: Abas ou passos laterais ou no topo, destaque para etapa atual.
- **[Indicador de Progresso]**: “Etapa X de 5”, sempre visível.
- **[Formulário da Etapa Atual]**: Campos agrupados por etapa (ver especificação).
- **[Botão Anexar Documento]**: Upload de arquivos, se necessário.
- **[Resumo dos Dados]**: Revisão de todos os dados antes de salvar.
- **[Sticky Footer]**: Botões “Voltar”, “Próximo” (ou “Salvar” na última etapa), sempre visíveis.
- **Responsividade**: Etapas laterais ou no topo, formulário centralizado, footer fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo, área tocável ≥ 44×44 px.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, etapas, upload.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro ao salvar (“Cadastro salvo com sucesso”, “Erro ao salvar cadastro”).
- Validação de campos: mensagens em vermelho abaixo dos inputs.
