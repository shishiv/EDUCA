# Dois contratos pendentes: entrada para decisão interna

Data do levantamento: 2026-09-14. **Proposta, não contrato aprovado. Nenhum produto alterado.**

## Base e limites

- Worktree confirmado por `pwd -P` e `git rev-parse --show-toplevel`: `/root/.treehouse/educa-7c556a/1/educa`; branch própria `fm/educa-contracts-integrator`.
- `git ls-remote --symref origin HEAD refs/heads/dev refs/heads/main`: HEAD remoto aponta para `dev`; HEAD local e `dev` em `2f3f07801c461792557cb6dc580cb295947ecb22`. `main` permanece produção em `f3f02c8fb9664895eeea10221f3e57b4f469388b`. `gh-axi repo view shishiv/EDUCA` também informa default `dev`.
- Lidos `AGENTS.md`, `CONTEXT.md` e os donos abaixo. A integração https://github.com/shishiv/EDUCA/pull/219 já pertence à base. Drafts preservados são história, não fila de implementação.
- Mantidos: Vivências como fonte da Educação Infantil; janela auditada de correção de frequência; notas bloqueadas; auth/RLS e papéis; piloto exclusivamente sintético local. Sem banco compartilhado, demo pública, deploy, promoção ou integração de ramos históricos.

## 1. O que o código executa hoje

| Superfície | Comportamento verificável na base |
| --- | --- |
| Vivências | `vivencias` persiste escola, aluno, matrícula, turma, professor, data, Campos de Experiência, descrição, observações e autoria. Escrita pelo professor titular; identidade imutável, data futura recusada, auditoria e RLS. Texto/data/campos continuam editáveis após serem referenciados em relatório. |
| Referência na tela narrativa | `/dashboard/alunos/[id]/diario/relatorio` busca `/api/vivencias?aluno_id=...`: sem período nem matrícula explícitos, limite padrão de 50. Trocar semestre não recarrega esse conjunto. A lateral filtra por Campo, mas não seleciona fontes para persistência. Com zero Vivências, a tela oculta o editor, inclusive de um relatório existente. |
| Segundo fluxo narrativo | `/diario/relatorios/[alunoId]` grava os cinco campos diretamente em `relatorios_descritivos`, sem carregar/selecionar Vivências. É também o fluxo do botão de PDF sintético. Ambos os fluxos precisam obedecer ao mesmo contrato. |
| Vínculos de fontes | `relatorios_descritivos_vivencias` contém IDs, escola e autoria do vínculo, **não cópia do conteúdo**. A aplicação não grava esses vínculos nos formulários atuais. `getByReport` lê IDs e depois as Vivências vivas; `/api/vivencias?report_id=...` ainda corta pelo limite. O trigger valida matrícula/escola, mas não datas do semestre. |
| Finalização | O banco exige cinco campos com 50 a 2000 caracteres, deriva finalizador/horário autenticados e impede UPDATE do relatório finalizado. Impede INSERT/UPDATE de vínculos após finalizar; browser não tem UPDATE/DELETE de vínculos. Não exige fonte nem calendário. O teste SQL aceita inclusive fonte de setembro vinculada a relatório do primeiro semestre. FK impede apagar Vivência referenciada, mas não congela sua versão. |
| PDF narrativo | `descriptive-report-emission.ts` exige relatório finalizado e `conteudo_aula` não vazio. Calcula período por `SEMESTER_CONFIG` e consulta conteúdo ao emitir. Proveniência/fingerprint MD5 referem-se a `public.conteudo_aula`, não às Vivências. Não há snapshot de fontes narrativas. A rota continua cercada pelo gate sintético e pelo cliente RLS do emissor. O botão Exportar da outra tela é apenas aviso de indisponibilidade. |
| Ano letivo | `anos_letivos` tem um registro datado por escola/ano. Migration/trigger criam apenas o ano corrente faltante com 01/01 a 31/12; atualização governada não reescreve anos anteriores. `resolveCurrent` retorna esse intervalo anual com `configured=false` quando não encontra registro. Com registro sem intervenção humana retorna `configured=true`: esse booleano **não prova aprovação pedagógica**. |
| Configuração anual | `/api/school-settings/academic-year` limita-se ao diretor e à escola da sessão; GET de ano ausente retorna 404, PATCH pode cadastrá-lo. A UI atual exibe erro/repetir no 404, não o formulário de cadastro. Não há configuração de semestres/bimestres nessa interface. |
| Períodos escolares | Não há catálogo persistido de períodos pedagógicos. `SEMESTER_CONFIG` fixa fevereiro-julho/agosto-dezembro; os relatórios de frequência e conteúdo fixam fevereiro-abril, maio-julho, agosto-outubro, novembro-dezembro. `getContentByPeriod` tem ainda agrupamento bimestral por outra divisão fixa. Nenhum deles consulta `anos_letivos` para essas datas. `calendario_escolar` é calendário de eventos e sua rota está bloqueada no piloto, não é esse catálogo. |

Donos principais: `supabase/migrations/20260831000000_vivencias_persistence.sql`, `20260908120000_descriptive_report_finalization.sql`, `20260826010000_school_academic_years.sql`; `app/lib/api/vivencias.ts`; `app/app/api/vivencias/handler.ts`; as duas páginas narrativas acima; `app/lib/reports/descriptive-report-emission.ts`; `app/lib/pilot/descriptive-report-provenance.ts`; `app/lib/services/academic-year.ts`; `app/types/descriptive-report.ts`; `app/app/(dashboard)/relatorios/{frequencia,conteudo}/page.tsx`; `app/lib/reports/content-reports.ts`.

## 2. As duas escolhas que faltam

### A. Quais Vivências sustentam o relatório, quando congelam e o que a emissão atesta?

**Recomendação mínima A1:** todas as Vivências elegíveis da mesma escola, aluno, matrícula e turma, dentro das datas inclusivas do período configurado; sem seleção manual por checkbox nesta entrega. Rascunho mostra prévia viva e contagem completa, sem truncamento silencioso. O professor continua autor dos cinco campos, sem geração automática de narrativa.

Na finalização, o banco captura atomicamente o conjunto e sua versão: ID da fonte, identidade escolar/matrícula/turma/aluno, professor/autor, data, campos, descrição, observações, versão/`updated_at`; datas/identidade do período e ator/horário da captura. Captura e finalização ou persistem juntas ou falham juntas. Exigir ao menos uma fonte elegível; não exigir que as fontes cubram todos os cinco Campos, além da validação textual atual. Ordenação determinística e fingerprint versionado do snapshot, sem alegar assinatura/legalidade.

Relatório finalizado, referência na tela e PDF leem esse snapshot, nunca reconstrução a partir da Vivência atual. Edição posterior da fonte permanece permitida pelas regras atuais, sem modificar o relatório. `conteudo_aula` continua canônico **no relatório de conteúdo ministrado**, mas deixa de ser requisito/substituto da fonte narrativa infantil. A emissão sintética conserva seus gates, ator, revisão e avisos de não oficialidade.

**Alternativa A2:** professor escolhe subconjunto explícito das fontes elegíveis, com seleção persistida/editável no rascunho e snapshot na finalização. É possível, mas adiciona contrato de seleção/remoção, UI e mutação governada hoje inexistentes. Não recomendada como mínimo deste recorte. Apenas manter links vivos não resolve a pendência de snapshot/proveniência.

**Compatibilidade proposta:** não reconstruir fontes históricas como se tivessem sido capturadas na época. Finalizados anteriores permanecem legíveis e imutáveis, identificados como sem snapshot verificável; emissão do novo contrato recusa essa ausência. Rascunhos anteriores podem aderir ao finalizar após configurar período. Nenhum backfill inventado de proveniência.

### B. O que oferecer quando ainda não existe calendário de períodos da escola?

**Recomendação mínima B1:** estado persistido padrão **não configurado**, sem datas pedagógicas presumidas. Manter o default anual documentado de `anos_letivos`, sem dividi-lo automaticamente em semestres/bimestres. Datas e rótulos específicos da escola ficam no banco, separados por escola e ano; configuração pelo diretor na superfície existente, sem liberar `/dashboard/calendario`.

- Relatórios de frequência/conteúdo continuam disponíveis por mês civil ou intervalo explícito. Atalhos escolares sem definição ficam indisponíveis, com aviso para configurar; falha de leitura não vira fallback pedagógico.
- Rascunhos narrativos podem ser escritos/salvos com ano e identificador semestral existentes, mostrando que faltam datas configuradas. Sem datas não há prévia apresentada como fonte do período nem finalização/emissão nova. Vivências e chamada continuam operacionais.
- Uma definição de período válida passa a governar seleção/atalhos. Intervalos inválidos, fora do ano configurado ou sobrepostos dentro do mesmo tipo são recusados; semestres e bimestres podem se sobrepor entre tipos. Não deduzir períodos só de eventos do calendário.
- Mudanças posteriores de calendário não alteram datas/fontes já capturadas em relatório finalizado. Ano novo sem períodos próprios volta ao estado não configurado; história permanece intacta.

**Alternativa B2:** oferecer um modelo pedagógico pré-preenchido, persistido no banco e claramente provisório, sujeito a confirmação governada. Depende de a coordenação escolher e autorizar esse modelo; não há base atual para assumir suas datas nem colocá-las no cliente. Bloquear todo o diário/chamada por falta de calendário seria ampliação desnecessária do escopo.

## 3. Cenários de aceitação propostos

| Positivos | Negativos / preservação |
| --- | --- |
| Escola sintética configura semestre; fontes nas duas datas-limite entram; mais de 50 fontes são contadas/capturadas integralmente. | Fonte fora do período, outra matrícula/turma/aluno/escola nunca entra. Erro de consulta não equivale a conjunto vazio válido. |
| Professor salva rascunho e finaliza; recarga e PDF exibem mesmas fontes, versão e período. | Zero fontes ou período ausente recusa finalização sem deixar snapshot/vínculos/status parciais. |
| Editar fonte depois da captura mantém texto/fingerprint do relatório; nova fonte não se incorpora retroativamente. | Adulterar snapshot, finalizador ou conjunto finalizado é negado; concorrência fonte/finalização não produz captura rasgada. |
| Escola sem períodos usa mês civil/intervalo explícito e continua registrando Vivências/frequência. | Não aparecem datas bimestrais/semestrais inventadas, nem aprovação implícita do ano anual. |
| Diretor configura sua escola; datas persistem após recarga; mudar escola/ano resolve definição própria. | Professor não configura calendário; escola B não lê/altera escola A; mudança de período não recalcula finalizados. |
| Finalizado legado continua consultável com indicação honesta da ausência de snapshot. | Não recebe proveniência retroativa nem PDF atestado pelo novo contrato sem snapshot. Notas continuam negadas e janela de frequência não muda. |

## 4. Efeito técnico previsto, condicionado à decisão

- **Schema:** migration aditiva para definição escolar de períodos ligada a `anos_letivos` (default não configurado no banco, configuração por escola/ano) e captura de fontes/período do relatório. Reutilizar `relatorios_descritivos_vivencias` como dono dos vínculos e da cópia de fonte, sem introduzir infraestrutura genérica. Campos legados sem snapshot precisam ser representáveis sem reescrever finalizados.
- **Permissões:** manter papéis e alcance atuais. Configuração na fronteira de gestão escolar existente; leituras de período no mesmo escopo de escola/turma. Captura derivada no banco, não conteúdo/ator informado pelo cliente. Sem grant amplo, bypass de RLS, acesso novo de responsáveis ou liberação de notas/calendário de eventos. Necessidade concreta de ampliar acesso além disso será outro checkpoint.
- **Aplicação:** alinhar as duas telas narrativas, referência/API, emissão/PDF/proveniência e seed/validador descritivo; ampliar a configuração anual existente para períodos e corrigir estado de ano ausente sem default inventado no cliente; substituir atalhos/agrupamentos pedagógicos fixos nos relatórios ativos. Não alterar o read model nem a janela auditada de frequência, nem contratos positivos de notas fora do gate.
- **Tipos/documentação:** regenerar `app/types/database.ts` somente da stack local descartável, após ler a skill Supabase e guias locais Next relevantes. Registrar contrato aceito em documento curto referenciado por `CONTEXT.md`. Não modificar planos/receipts históricos para fazê-los parecer atuais.

## 5. Evidência consultada e validação ainda devida

**Histórica, não execução deste worker:** `artifacts/quality-integration/README.md` registra typecheck/lint/build, 1317 testes unitários aprovados (20 ignorados), SQL, E2E geral e filhos do piloto. `artifacts/educa-quality-prs-dev/README.md` distingue preservação de implementação. Nada dessa campanha foi reexecutado.

**Contratos lidos:** `supabase/tests/database/{vivencias_persistence,descriptive_report_finalization,school_academic_year}.test.sql` e runner `run.sh`; E2E `diary/vivencias-persistence.spec.ts`, `pilot-descriptive/descriptive-emission.spec.ts`; unitários `services/academic-year.test.ts`, `api/school-academic-year-route.test.ts`, `reports/descriptive-report-emission.test.ts`. As provas atuais cobrem persistência/isolamento de Vivências, imutabilidade do relatório/links e ano configurável, **não** snapshot narrativo nem ausência de calendário pedagógico. O E2E descritivo atual exige `conteudo_aula` e sua remoção deve bloquear PDF; essa expectativa terá de mudar explicitamente se A1/A2 for aprovada.

**Após decisão:** de `app/`, `pnpm typecheck`, `pnpm lint` (oxlint complexity max10 + anti-slop e ESLint zero warnings), `pnpm run test --maxWorkers=2 --no-file-parallelism`, `pnpm build`; SQL/persistência e concorrência dos contratos na cadeia canônica; filho `pnpm test:e2e:pilot:descriptive` ajustado ao contrato, mais recortes causais de diário, períodos e configuração via runners descartáveis existentes. Sem agregado completo ou campanha de preservação por reflexo. Recibos redigidos e cleanup próprios; execução, não apenas coleta.

**Ambiente ainda não provisionado:** `app/node_modules` e guias locais Next não existem nesta cópia. `pnpm`, Node, Docker e `chrome-devtools-axi` estão no PATH; `initdb`/`pg_ctl` não foram localizados e a sessão é root. Não houve instalação, sudo, alteração global nem tentativa de banco compartilhado. Disponibilidade funcional das stacks/browser ainda não foi validada. Antes de implementar/validar será necessário um caminho autorizado para dependências e runner local, sem presumir autorização para instalar ferramentas ausentes. A síntese Lavish será local, com help/playbooks atuais e tokens do EDUCA, após escolhas/resultados reais.

**Solicitação à coordenação `[key=educa-contracts]`: confirmar A1 ou A2 e B1 ou B2, incluindo regra de fonte vazia, corte na finalização e tratamento legado propostos. Recomendação: A1 + B1. Até a resposta e linha `resolved` com esta chave, parar sem modificar produto.**
