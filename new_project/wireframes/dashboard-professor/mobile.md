# Wireframe: Dashboard do Professor (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Menu Hamburger]                                     |
+------------------------------------------------------+
| [Dropdown/Card: Selecionar Turma]                    |
| [Indicador Online/Offline] [Botão: Sincronizar]      |
| [Seletor de Data: < 05/06/2025 >]                    |
+------------------------------------------------------+
| [Card: Fazer Chamada]                                |
| [Card: Preencher Diário]                             |
+------------------------------------------------------+
| [Sticky Footer: Botão Sair]                          |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, ícone de perfil/logout, ícone de nuvem (verde: online, cinza/vermelho: offline).
- **[Menu Hamburger]**: Abre navegação lateral (Dashboard, Chamada, Diário, Relatórios, Cadastro, Configurações).
- **[Dropdown/Card: Selecionar Turma]**: Lista de turmas do professor, pode ser dropdown ou cards scrolláveis.
- **[Indicador Online/Offline]**: Ícone de nuvem, cor conforme status.
- **[Botão: Sincronizar]**: Ativo quando offline, dispara sincronização manual.
- **[Seletor de Data]**: Setas para navegar entre dias.
- **[Cards de Ação]**: “Fazer Chamada” e “Preencher Diário”, botões grandes e tocáveis.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Elementos empilhados, largura máxima 320px.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Áreas tocáveis ≥ 44×44 px, labels explícitos.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, setas, cards.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro de sincronização (“Dados salvos localmente”, “Sincronização concluída”).
- Ícone de nuvem sempre visível.
