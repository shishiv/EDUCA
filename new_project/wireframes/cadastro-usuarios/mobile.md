# Wireframe: Cadastro de Usuários (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Menu Hamburger]                                     |
+------------------------------------------------------+
| [Título: Cadastro de Usuários]                       |
+------------------------------------------------------+
| [Formulário]                                         |
| +--------------------------------------+             |
| | Nome: [Input]                        |             |
| | E-mail: [Input]                      |             |
| | Disciplina: [Input/Dropdown]         |             |
| | Escola Vinculada: [Dropdown]         |             |
| | Permissões: [Checkboxes]             |             |
| |  - Professor                        |             |
| |  - Diretor                          |             |
| |  - Secretária Escola                |             |
| |  - SME                              |             |
| |  - Admin TI                         |             |
| +--------------------------------------+             |
| [Botão: Enviar Convite]                             |
+------------------------------------------------------+
| [Sticky Footer: Botão Sair]                          |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Hamburger]**: Abre navegação lateral.
- **[Título]**: Cadastro de Usuários.
- **[Formulário]**: Campos para nome, e-mail, disciplina, escola vinculada, permissões (checkboxes).
- **[Botão Enviar Convite]**: Envia e-mail de ativação.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Campos empilhados, área tocável ≥ 44×44 px, footer fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, dropdown, checkboxes.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro ao enviar convite (“Convite enviado”, “Erro ao enviar convite”).
- Validação de campos: mensagens em vermelho abaixo dos inputs.
