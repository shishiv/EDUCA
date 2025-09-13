# Wireframe: Logs de Auditoria (Mobile 360×640)

```
+------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]    |
+------------------------------------------------------+
| [Menu Hamburger]                                     |
+------------------------------------------------------+
| [Título: Logs de Auditoria]                          |
+------------------------------------------------------+
| [Filtros: Data Inicial/Final, Usuário, Entidade]     |
| [Botão: Exportar CSV] (destacado acima da tabela)    |
+------------------------------------------------------+
| [Tabela de Eventos]                                  |
| (Scroll horizontal se necessário)                    |
| Data/Hora | Usuário | Ação | Entidade | Registro-Alvo| Descrição Breve |
|---------- |-------- |------|--------- |--------------|-----------------|
| ...      | ...     | ...  | ...      | ...           | ...             |
+------------------------------------------------------+
| [Sticky Footer: Botão Sair]                          |
+------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Hamburger]**: Abre navegação lateral.
- **[Título]**: Logs de Auditoria.
- **[Filtros]**: Data inicial/final, usuário, entidade, compactos.
- **[Botão Exportar CSV]**: Exporta tabela para CSV, destacado acima da tabela.
- **[Tabela de Eventos]**: Colunas: Data/Hora, Usuário, Ação (CREATE/UPDATE/DELETE), Entidade, Registro-Alvo, Descrição Breve, scroll horizontal se necessário.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Elementos empilhados, tabela com scroll horizontal, footer fixo.
- **Tipografia**: Fonte sem serifa.
- **Acessibilidade**: Labels explícitos, contraste mínimo, área tocável ≥ 44×44 px.

---

## Placeholders

- Texto de exemplo: “Lorem ipsum”.
- Ícones genéricos para menu, nuvem, perfil, filtros, exportar.

---

## Feedback de Estado

- Toast/snackbar para sucesso/erro em exportação (“Exportação concluída”, “Erro ao exportar”).
- Ícone de nuvem sempre visível.
