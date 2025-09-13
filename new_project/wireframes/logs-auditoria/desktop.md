# Wireframe: Logs de Auditoria (Desktop 1440×900)

```
+--------------------------------------------------------------------------------------+
| [Header: Logo] [Nome App] [Perfil/Logout] [Nuvem]                                   |
+--------------------------------------------------------------------------------------+
| [Menu Lateral: Dashboard, Logs, ...] |                                               |
|--------------------------------------|-----------------------------------------------|
| [Título: Logs de Auditoria]          |                                               |
|--------------------------------------|-----------------------------------------------|
| [Filtros: Data Inicial/Final, Usuário, Entidade] [Botão: Exportar CSV] (direita)     |
|--------------------------------------|-----------------------------------------------|
| [Tabela de Eventos]                  |                                               |
| Data/Hora | Usuário | Ação | Entidade | Registro-Alvo | Descrição Breve              |
|---------- |-------- |------|--------- |-------------- |-----------------------------|
| ...      | ...     | ...  | ...      | ...           | ...                         |
+--------------------------------------------------------------------------------------+
| [Sticky Footer: Botão Sair]                                                          |
+--------------------------------------------------------------------------------------+
```

---

## Legendas e Observações

- **[Header]**: Logo, nome da aplicação, perfil/logout, ícone nuvem (online/offline).
- **[Menu Lateral]**: Navegação principal sempre visível à esquerda.
- **[Título]**: Logs de Auditoria.
- **[Filtros]**: Data inicial/final, usuário, entidade.
- **[Botão Exportar CSV]**: Exporta tabela para CSV, destacado à direita.
- **[Tabela de Eventos]**: Colunas: Data/Hora, Usuário, Ação (CREATE/UPDATE/DELETE), Entidade, Registro-Alvo, Descrição Breve.
- **[Sticky Footer]**: Botão “Sair”, sempre visível na base da tela.
- **Responsividade**: Tabela ampla, filtros e botões acessíveis, menu lateral fixo.
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
