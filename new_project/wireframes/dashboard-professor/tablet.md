# Wireframe: Dashboard do Professor (Tablet 768×1024)

```
+---------------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]             |
+---------------------------------------------------------------+
| [Menu Lateral: Dashboard, Chamada, Diário, ...] |             |
|-------------------------------------------------|-------------|
| [Dropdown/Card: Selecionar Turma]               |             |
| [Indicador Online/Offline] [Botão: Sincronizar] |             |
| [Seletor de Data: < 05/06/2025 >]               |             |
|-------------------------------------------------|             |
| [Card: Fazer Chamada]   [Card: Preencher Diário]|             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
|                                                 |             |
| [Sticky Footer: Botão Sair]                     |             |
+---------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, ícone de perfil/logout, ícone de nuvem (verde: online, cinza/vermelho: offline).
- **[Menu Lateral]**: Navegação principal sempre visível à esquerda.
- **[Dropdown/Card: Selecionar Turma]**: Lista de turmas do professor, pode ser dropdown ou cards.
- **[Indicador Online/Offline]**: Ícone de nuvem, cor conforme status.
- **[Botão: Sincronizar]**: Ativo quando offline, dispara sincronização manual.
- **[Seletor de Data]**: Setas para navegar entre dias.
- **[Cards de Ação]**: “Fazer Chamada” e “Preencher Diário”, lado a lado ou em grid.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Cards e campos centralizados, menu lateral fixo.
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
