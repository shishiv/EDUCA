# Configuração de privacidade, operadores e TTD

Template técnico pendente de validação municipal. **Não é parecer jurídico nem aprovação.**

Preencher `pilot_municipality_config` somente por mudança controlada:

| Campo | Responsável pela definição |
|---|---|
| `controller_name`, canal de direitos e incidente | Município/encarregado |
| `operator_name` | contrato do operador EDUCA |
| `processors` | inventário Supabase, Vercel e suboperadores |
| `dpa_status`, `ripd_status` | Município/jurídico/encarregado |
| `ttd_status`, `cpad_or_archive_authority` | arquivo/CPAD municipal |
| região e transferências | TI, contrato e encarregado |

Enquanto esta fundação estiver ativa, constraints mantêm:

- `data_classification = synthetic_only`;
- `external_deploy_allowed = false`;
- `legal_approval_status = not_approved`.

Direitos do titular devem usar canal municipal e triagem entre correção, restrição, eliminação de excesso e preservação obrigatória. Backups usam tombstone para não reativar cópia técnica já destinada à exclusão.
