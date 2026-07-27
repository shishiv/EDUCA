# Operação, suporte e métricas do piloto

## Suporte

| Severidade | Exemplo | Canal | Primeira resposta |
|---|---|---|---|
| Crítica | indisponibilidade total, perda de dado, acesso entre escolas | WhatsApp operacional | até 4 horas úteis |
| Normal | dúvida, erro sem perda, ajuste de cadastro | e-mail ou ticket | até 1 dia útil |

O SLA é configuração operacional do piloto, não garantia legal. Horário útil, escalonamento e contatos devem ser preenchidos pelo Município antes de qualquer go-live.

## Instrumentação própria

`pilot_metric_events` aceita apenas eventos agregáveis e rejeita chaves de aluno, nome, CPF, NIS, e-mail e telefone. `pilot_dashboard_metrics` calcula os indicadores sob RLS.

| Métrica | Meta |
|---|---:|
| escolas ativas semanalmente | >= 80% |
| frequências esperadas registradas | >= 90% |
| incidentes críticos de dado/acesso | 0 |
| satisfação | >= 4/5 |

Não habilitar PostHog ou observabilidade com payload de estudante para medir o piloto.
