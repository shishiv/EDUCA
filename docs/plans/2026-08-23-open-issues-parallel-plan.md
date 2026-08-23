---
title: Plano paralelo das issues abertas do EDUCA
type: execution-plan
date: 2026-08-23
artifact_readiness: planning-ready
scope: GitHub issues abertas em shishiv/EDUCA
---

# Plano paralelo das issues abertas do EDUCA

## Resultado do levantamento

O repositório tem 9 issues abertas. Cinco formam um único mapa de lançamento público: a issue-mãe #73 e as decisões #76, #77, #79 e #82. As outras quatro são propostas antigas de experiência de desenvolvimento, internacionalização, Educacenso e documentação de API.

A recomendação não é abrir nove implementações em paralelo. O tracker mistura trabalho já entregue, decisões ainda incompletas, premissas antigas e mudanças grandes demais para um único PR. O caminho seguro é:

1. reconciliar primeiro o contrato público que já está no ar;
2. executar em paralelo apenas fatias com ownership de arquivos separado;
3. manter i18n e Educacenso fora da fila de implementação até seus gates de produto e governança;
4. fechar a issue-mãe #73 somente depois do gate de ativação #82.

## Evidência que muda a prioridade

O risco mais imediato não está nas quatro issues técnicas antigas. Está no lançamento que já ocorreu sem a reconciliação final do mapa #73:

- Em 2026-08-23, `https://geteduca.vercel.app` respondeu `200`, mas ainda publicou `Cloud Free`, `Cloud Pro`, hospedagem e suporte como oferta. A cópia local de `educa-site/main` já removeu essas promessas na PR [educa-site #21](https://github.com/shishiv/educa-site/pull/21). Há drift entre código e produção.
- A página pública do demo ainda o chama de "somente leitura". O código atual permite CRUD sintético limitado e respostas simuladas para algumas mutações, mantendo efeitos externos e ações destrutivas bloqueados em `app/lib/demo-sandbox/demo-sandbox.ts`. A promessa pública não descreve o comportamento real.
- O login publicado em `https://educa-demo.vercel.app/login` respondeu `Invalid login credentials` para a credencial divulgada pelo próprio site. A página e a política de privacidade responderam `200`, mas a jornada principal do demo não passou.
- A waitlist local de `educa-site/main` valida nome, e-mail e município, mas, sem provider, descarta os campos e registra somente um identificador técnico. A interface diz que a manifestação foi registrada. O fluxo não permite contato e o texto não explica retenção, controlador ou canal de direitos.
- O cadastro de responsável em `app/app/(dashboard)/dashboard/responsaveis/novo/page.tsx` exige um consentimento LGPD genérico para registrar dados escolares necessários. O próprio runbook público explica que consentimento não deve ser a base automática para serviço público obrigatório. Esse conflito deve ser resolvido antes de qualquer dado real.

Por isso, #76, #77, #79 e #82 são P0. As issues #17 e #20 são P1. As issues #18 e #19 ficam condicionadas a decisões explícitas.

## Inventário e disposição recomendada

| Issue | Tipo real hoje | Disposição recomendada | Pode iniciar código agora? |
| --- | --- | --- | --- |
| [#73](https://github.com/shishiv/EDUCA/issues/73) | Nó de integração do lançamento | Atualizar com as decisões já concluídas e fechar por último | Não |
| [#76](https://github.com/shishiv/EDUCA/issues/76) | Reconciliação de claims e deploy | Manter aberta até código e produção dizerem a mesma coisa | Sim, em duas frentes coordenadas |
| [#77](https://github.com/shishiv/EDUCA/issues/77) | Decisão de privacidade com correções em dois repositórios | Manter aberta e separar decisão, site e app | Só após a decisão de autoridade da waitlist |
| [#79](https://github.com/shishiv/EDUCA/issues/79) | Contrato de jornadas e evidência E2E | Manter aberta e transformar a cobertura existente em matriz de lançamento | Sim |
| [#82](https://github.com/shishiv/EDUCA/issues/82) | Gate de ativação e rollback | Tratar como integração de #76, #77 e #79 | Não, depende das três |
| [#17](https://github.com/shishiv/EDUCA/issues/17) | Experiência local com premissa técnica incorreta | Reescrever para um caminho local canônico; não recriar Supabase em Compose | Sim, após a correção de claims no README |
| [#18](https://github.com/shishiv/EDUCA/issues/18) | Mudança transversal de produto | Remover `good first issue` e segurar até existir demanda de usuário | Não por padrão |
| [#19](https://github.com/shishiv/EDUCA/issues/19) | Novo módulo regulado, não finalização | Substituir a premissa e iniciar por contrato oficial e governança | Pesquisa sim; código de produção não |
| [#20](https://github.com/shishiv/EDUCA/issues/20) | Programa de documentação amplo | Reescrever e dividir por domínio depois de uma fundação única | Sim |

## Grafo de dependências

```text
#76 claims ───────────────┐
#77 privacidade ──────────┼──> #82 gate de ativação ──> #73 handoff final
#79 jornadas e papéis ───┘

#76 README ──> #17 setup local

#20 fundação de docs ──┬──> docs de identidade/cadastros ──┐
                       ├──> docs de frequência/diário ─────┼──> referência integrada
                       └──> docs de relatórios/plataforma ─┘

#18 decisão de produto ──> fundação i18n ──> domínios em paralelo ──> integração

#19 fonte oficial + governança ──> modelo canônico ──> exporter puro ──> API/UI fechada por flag
```

## Ondas recomendadas

### Onda 0: contratos e correções de verdade pública

Estas frentes podem começar juntas porque não precisam editar os mesmos caminhos:

1. **#76 site e deploy:** comparar `educa-site/main` com a produção, corrigir a descrição de mutabilidade do demo e promover o commit correto para o alias público.
2. **#76 produto:** remover ou reclassificar `Cloud Free` e `Cloud Pro` no `README.md` do EDUCA, usando o mesmo vocabulário comprovado do site.
3. **#77 decisão de autoridade:** decidir quem controla a waitlist, qual contato pode ser publicado, quais campos são necessários, por quanto tempo existem e qual destino real recebe a manifestação. Sem resposta, a recomendação é não coletar PII.
4. **#79 contrato de jornadas:** publicar a matriz mínima de jornadas, separando prova local mutável de smoke público não destrutivo.
5. **#17 contrato local:** substituir a premissa de "full Compose" pelo caminho real Supabase CLI + app em URL nomeada.
6. **#20 fundação da referência:** definir o que é API pública, formato TSDoc, gerador e check de cobertura antes do fan-out por domínio.
7. **#19 pesquisa de contrato:** identificar versão oficial, formato e fixture de conformidade do Educacenso sem criar rota, exportar PII ou alterar o Pilot Gate.

### Onda 1: implementações independentes

Depois dos contratos da Onda 0:

- **#77 site:** aviso de privacidade da waitlist, minimização dos campos e comportamento honesto quando não houver provider.
- **#77 app:** corrigir a base/linguagem do cadastro de responsáveis sem converter consentimento genérico em requisito automático de serviço público.
- **#79 app:** adicionar a suíte focal de jornadas de lançamento em stack sintética descartável.
- **#17 local:** entregar o caminho de desenvolvimento canônico e retirar o Compose enganoso ou torná-lo explicitamente opcional e isolado.
- **#20 docs:** três workers documentam domínios disjuntos depois que o contrato e o gerador estiverem fixos.

### Onda 2: integração

- Integrar e gerar a referência de #20.
- Rodar a matriz de #79 e fechar gaps reais.
- Construir #82 com evidência de source-to-deploy, claims, privacidade, acessibilidade, runtime, rede e rollback.
- Se #18 receber prioridade explícita, iniciar apenas sua fundação nesta onda, depois das mudanças em `app/package.json`, middleware e privacidade.
- Se #19 receber contrato oficial e autorização, iniciar o modelo canônico, ainda sem exposição pública.

### Onda 3: fechamento e expansões condicionais

- Fechar #82 somente quando site e demo passarem separadamente.
- Atualizar #73 com todas as decisões e fechar o mapa.
- Fan-out de i18n por domínio, se aprovado.
- Implementar o exporter Educacenso somente depois dos gates de especificação, segurança e governança.

## Planos por issue

<!-- issue-plan:73 -->
### Issue #73: contrato de lançamento público confiável

- **Disposição:** manter como nó de integração, não como worker de código.
- **Evidência atual:** cinco subissues já foram fechadas (#74, #75, #78, #80 e #81), mas a seção `Decisions so far` da issue-mãe continua vazia. Quatro decisões permanecem abertas (#76, #77, #79 e #82).
- **Resultado:** atualizar a issue com o resumo das decisões, os PRs e as evidências finais; marcar o handoff como concluído.
- **Dependências:** #76, #77, #79 e #82 concluídas.
- **OWNS:** somente a descrição e o checklist da issue #73.
- **Aceite:** o mapa lista cada decisão fechada, aponta para seu artefato autoritativo e não contém pendência sem owner.
- **Verificação:** conferir subissues no GitHub, links dos PRs, URLs públicas e estado final do gate #82.

<!-- issue-plan:76 -->
### Issue #76: contrato de promessas entre site e demo

- **Disposição:** manter aberta e concluir como reconciliação, não como nova estratégia de marketing.
- **Evidência atual:** a PR [educa-site #21](https://github.com/shishiv/educa-site/pull/21) removeu claims sem receipt no código. A produção ainda exibe Cloud Free/Pro e suporte. O `README.md` do EDUCA também mantém esses modelos futuros. A página do demo promete somente leitura, enquanto o sandbox atual permite mutações sintéticas limitadas e no-ops simulados.
- **Resultado:** uma matriz única de claims com quatro estados: disponível no código, demonstrável no sandbox sintético, em desenvolvimento e futuro sem oferta. A produção deve refletir a matriz.
- **Dependências:** decisão explícita sobre a mutabilidade prometida do demo. Recomendação: descrever "sandbox sintética com ações limitadas, efeitos externos bloqueados e reset periódico", pois isso corresponde ao runtime.
- **OWNS:** `EDUCA/README.md`; em `educa-site`, `lib/site-content.ts`, `lib/site-claims.test.ts`, `app/demo/page.tsx`, `app/layout.tsx` e superfícies que ainda renderizam claims antigos; configuração/alias de deploy como operação separada.
- **Aceite:** nenhuma oferta Cloud sem operação comprovada; toda capacidade pública tem destino e receipt; o texto do demo descreve sua mutabilidade real.
- **Verificação:** testes de claims com sonda negativa, builds dos dois repositórios e leitura no navegador das URLs públicas depois do deploy.

<!-- issue-plan:77 -->
### Issue #77: privacidade e consentimento

- **Disposição:** manter aberta e dividir em uma decisão e dois ships.
- **Evidência atual:** a política do demo foi corrigida pela PR [EDUCA #83](https://github.com/shishiv/EDUCA/pull/83), e os runbooks municipais já existem no blog. Ainda faltam o contrato da waitlist e a correção do consentimento genérico obrigatório no cadastro de responsáveis.
- **Resultado:** separar três tratamentos: demo sintético, contato de marketing e operação municipal futura. Cada um deve declarar controlador, finalidade, dados, retenção, destinatários, direitos e contato sem inventar autoridade jurídica.
- **Dependências:** decisão humana sobre a entidade/controlador e o canal de contato da waitlist. Se isso não for definido, a waitlist não deve aceitar dados pessoais.
- **OWNS:** `educa-site/app/privacidade/**`, `educa-site/components/waitlist/**`, `educa-site/lib/waitlist-intake*`; no EDUCA, `app/app/politica-privacidade/**`, `app/components/lgpd/**`, `app/app/(dashboard)/dashboard/responsaveis/**` e testes focados. Migração só entra se um novo contrato de auditoria exigir alteração de dados.
- **Aceite:** a waitlist informa e executa o destino real dos dados; o demo continua synthetic-only; o cadastro de responsável não usa consentimento genérico como base automática para uma rotina escolar necessária.
- **Verificação:** testes de minimização e retenção, inspeção de rede/log sem PII, teste de criação de responsável sob o contrato aprovado e revisão jurídica humana do texto antes de publicação.

<!-- issue-plan:79 -->
### Issue #79: jornadas e papéis críticos

- **Disposição:** manter aberta e convertê-la em contrato executável de lançamento.
- **Evidência atual:** já existem E2E para escopo do piloto, isolamento entre escolas, convite/primeiro acesso, revogação, capacidade, relatório descritivo e uma jornada canônica de chamada. O documento `app/tests/e2e/COVERAGE_MATRIX.md` é mais amplo que a suíte focal do piloto e não equivale a uma prova única de lançamento.
- **Resultado:** uma matriz curta com persona, ambiente, dados, jornada, resultado e receipt. O mínimo recomendado é: visitante público, operador municipal sintético, diretor de escola, professor titular e estados negados do Pilot Gate. `responsavel` continua explicitamente fora até existir portal e ownership próprios.
- **Dependências:** a definição de mutabilidade de #76. A execução local não depende da decisão de privacidade da waitlist.
- **OWNS:** novo `docs/operations/public-demo-journeys.md`, nova pasta `app/tests/e2e/public-demo/**` e seus fixtures. Alterações em scripts ou `app/package.json` ficam para um integrador único.
- **Aceite:** cada jornada tem resultado observável; mutações rodam somente em stack sintética descartável; produção recebe apenas smoke não destrutivo.
- **Verificação:** Playwright local com Supabase isolado, teste explícito de RLS/tenant/role e navegador real no site/demo públicos sem escrever no sandbox compartilhado.

<!-- issue-plan:82 -->
### Issue #82: gate de ativação pública

- **Disposição:** P0 e bloqueada por #76, #77 e #79.
- **Evidência atual:** o gate falha hoje. O site público não corresponde ao `main` local e a credencial publicada do demo não autentica. A existência de uma deployment receipt antiga não prova o estado atual.
- **Resultado:** gate repetível para cada superfície, com decisão separada para site e demo. O site pode estar ativo sem o CTA do demo; o demo só recebe ou mantém tráfego quando seu próprio gate passa.
- **Dependências:** #76, #77 e #79; owner humano de rollback; acesso de leitura aos metadados de deploy.
- **OWNS:** `EDUCA/docs/operations/public-demo-activation.md` e receipts de deploy; em `educa-site`, apenas o checklist/integração de release que o projeto já usa. Não criar um control plane novo.
- **Aceite:** alias aponta para o SHA esperado; claims e privacidade correspondem ao código; jornadas críticas passam; console/rede não têm erro bloqueador; rollback foi ensaiado e tem owner.
- **Verificação:** inspeção do deploy, builds focados, E2E local sintético, smoke público não destrutivo em desktop/mobile, acessibilidade, links, console/rede e confirmação do rollback.

<!-- issue-plan:17 -->
### Issue #17: ambiente local com Docker

- **Disposição:** reescrever. A meta útil é onboarding reproduzível, não "Compose completo".
- **Evidência atual:** `docker-compose.yml` sobe apenas PostgreSQL, mas o app depende de Auth, Storage, Realtime, RLS e migrations do Supabase local. `CONTEXT.md` já define Supabase CLI como caminho canônico. Um segundo stack Compose duplicaria a topologia e criaria drift.
- **Resultado:** um caminho de desenvolvimento que parte de clone limpo, inicia o Supabase local oficial, configura o app e expõe uma URL nomeada por portless. O Compose bare deve ser removido ou rotulado como ferramenta de banco isolado, sem se passar pelo stack da aplicação.
- **Dependências:** #76 deve terminar primeiro se ambos editarem `README.md`.
- **OWNS:** `docker-compose.yml`, `app/scripts/dev-local.sh` ou equivalente, `CONTEXT.md` e, na etapa final, `README.md`.
- **Aceite:** uma pessoa executa um comando documentado e chega ao login; migrations e seed escolhida ficam explícitos; cleanup não deixa processos ou containers órfãos.
- **Verificação:** shellcheck do script, stack local descartável, smoke no navegador pela URL nomeada e prova de cleanup. Não usar o banco demo compartilhado.

<!-- issue-plan:18 -->
### Issue #18: i18n em inglês

- **Disposição:** segurar e remover o rótulo `good first issue` até existir demanda de usuário. O README já é bilíngue, mas a aplicação é um produto municipal brasileiro.
- **Evidência atual:** não há camada de locale; `<html lang>` está fixo em `pt-BR`; datas importam `ptBR` diretamente; middleware também concentra auth e Pilot Gate. A mudança alcançaria 162 arquivos TSX de UI e 82 arquivos de rota/layout, portanto não é uma primeira contribuição pequena.
- **Resultado:** se priorizada, entregar primeiro uma fundação sem mudar rotas ou segurança e depois traduzir por feature, com catálogos separados por domínio para permitir fan-out.
- **Dependências:** decisão de produto sobre público e idiomas; leitura da documentação instalada do Next.js 16.3; escolha documentada da biblioteca e da estratégia de URL/locale; #77 concluída antes de traduzir a política.
- **OWNS:** a fundação controla package/lock, middleware ou proxy, layout e `app/messages/common/**`; folhas posteriores controlam uma feature e seu namespace, sem editar arquivos compartilhados.
- **Aceite:** pt-BR mantém paridade; as jornadas escolhidas funcionam em inglês; locale, datas e números persistem sem enfraquecer auth, RLS ou Pilot Gate.
- **Verificação:** typecheck, lint, testes unitários de resolução de locale, build e E2E das mesmas jornadas nos dois idiomas.

Plano condicional de fan-out, somente após aprovação:

1. `I18N-0` fixa runtime, fallback, namespaces e integração com auth.
2. `I18N-1` traduz auth e páginas públicas.
3. `I18N-2` traduz escolas, usuários, alunos, responsáveis e matrículas.
4. `I18N-3` traduz turmas, chamada, diário, dashboard e relatórios.
5. `I18N-4` integra e executa a matriz bilíngue.

<!-- issue-plan:19 -->
### Issue #19: export Educacenso

- **Disposição:** substituir a descrição antes de qualquer implementação. Não é uma finalização.
- **Evidência atual:** não existe rota nem serviço de exportação ativo. Um `INEPIntegrationService` de 689 linhas foi removido no commit `8fd21a75` porque não tinha consumidores. Restam tabelas de tracking, campos parciais e validadores; o Pilot Gate e o demo bloqueiam explicitamente Educacenso. Há ainda contratos incompatíveis para identificador de aluno, com 11 dígitos em `students-validation.ts` e 12 em `brazilian-educational.ts`. A issue fechada #21 repete o título de #19, mas seu comentário a chama incorretamente de duplicata de #20; ela não é evidência de conclusão.
- **Resultado:** um módulo novo, versionado pelo layout oficial escolhido, que começa como transformação pura sobre fixtures sintéticos e permanece inacessível no piloto/demo até autorização separada.
- **Dependências:** fonte oficial vigente, ano/layout escolhido, fixture de conformidade, decisão sobre dados obrigatórios, owner municipal do envio e revisão de privacidade/melhor interesse. Sem esses itens, somente pesquisa e gap map podem avançar.
- **OWNS:** pesquisa em `docs/plans/educacenso-export-contract.md`; depois `app/lib/educacenso/**` e testes unitários; schema em migração separada; API/UI em PR posterior e atrás de flag explícita.
- **Aceite:** fixture oficial ou golden file valida o formato; faltas e códigos inválidos geram erros determinísticos; nenhum endpoint fica acessível no demo/piloto sem aprovação.
- **Verificação:** testes de parser/exporter com positive e negative controls, database tests de RLS/grants, teste de volume medido e E2E local synthetic-only. Nunca testar com dados reais.

Plano condicional:

1. `CENSO-0` pesquisa fonte oficial e congela versão/formato.
2. `CENSO-1` reconcilia o modelo e produz gap map de campos e códigos.
3. `CENSO-2` implementa exporter puro e fixtures.
4. `CENSO-3` adiciona persistência e serviço com autorização por escola.
5. `CENSO-4` adiciona UI/API atrás de flag, mantendo demo e piloto bloqueados.
6. `CENSO-5` só habilita operação real com aprovação municipal, jurídica e de governança nomeadas.

<!-- issue-plan:20 -->
### Issue #20: documentação da API interna

- **Disposição:** reescrever e dividir. Remover `good first issue` do épico e usar as folhas menores como contribuições.
- **Evidência atual:** o caminho `web/lib/` não existe; a fonte atual é `app/lib/`. O escopo citado abrange 23 arquivos em `app/lib/api`, `app/lib/services` e `app/lib/utils.ts`, além de métodos públicos dentro de classes. Vários arquivos já têm docblocks, mas não existe gerador nem referência publicada.
- **Resultado:** referência reproduzível somente para interfaces públicas estáveis, com explicação de autenticação, autorização, erros e disponibilidade por modo. Não documentar internals indiscriminadamente.
- **Dependências:** uma fundação única define símbolos públicos, formato, TypeDoc ou alternativa e check de cobertura.
- **OWNS:** fundação em `app/package.json`, `app/pnpm-lock.yaml` e config de docs; folhas por domínio editam conjuntos disjuntos de `app/lib`; integração controla `docs/api/**`.
- **Aceite:** geração determinística; nenhum símbolo runtime selecionado fica sem contrato; exemplos compilam e não sugerem bypass de auth/RLS.
- **Verificação:** geração limpa, typecheck dos exemplos, links válidos e revisão de segurança dos exemplos de attendance, usuários e Supabase.

Fan-out depois da fundação:

1. `DOC-IDENTITY`: `api/base`, users, schools, students, classes, student admission e user lifecycle.
2. `DOC-ATTENDANCE`: attendance, canonical facts, class diary, reopen e auth de frequência.
3. `DOC-PLATFORM`: reports, grades, audit, configs, feature flags, dashboard stats, vivências e `utils.ts`.
4. `DOC-INTEGRATE`: gera `docs/api/**`, valida links e inclui o ponto de entrada em `CONTEXT.md`.

## Ownership executável

O manifesto abaixo é a fonte para checar dependências e colisões dentro de uma mesma onda. Prefixos de repositório distinguem os dois stacks.

<!-- parallel-manifest:start -->
```json
{
  "streams": [
    {
      "id": "claims-product",
      "issue": 76,
      "wave": 0,
      "needs": [],
      "owns": ["EDUCA:README.md"]
    },
    {
      "id": "claims-site",
      "issue": 76,
      "wave": 0,
      "needs": [],
      "owns": ["educa-site:lib/site-content.ts", "educa-site:lib/site-claims.test.ts", "educa-site:app/demo/page.tsx", "educa-site:app/layout.tsx", "educa-site:components/home/home-view.tsx"]
    },
    {
      "id": "privacy-decision",
      "issue": 77,
      "wave": 0,
      "needs": [],
      "owns": ["tracker:shishiv/EDUCA#77"]
    },
    {
      "id": "journeys-contract",
      "issue": 79,
      "wave": 0,
      "needs": [],
      "owns": ["EDUCA:docs/operations/public-demo-journeys.md", "EDUCA:app/tests/e2e/public-demo/**"]
    },
    {
      "id": "local-runtime",
      "issue": 17,
      "wave": 0,
      "needs": [],
      "owns": ["EDUCA:docker-compose.yml", "EDUCA:app/scripts/dev-local.sh"]
    },
    {
      "id": "api-docs-foundation",
      "issue": 20,
      "wave": 0,
      "needs": [],
      "owns": ["EDUCA:app/package.json", "EDUCA:app/pnpm-lock.yaml", "EDUCA:app/typedoc.json"]
    },
    {
      "id": "educacenso-contract",
      "issue": 19,
      "wave": 0,
      "needs": [],
      "owns": ["EDUCA:docs/plans/educacenso-export-contract.md"]
    },
    {
      "id": "privacy-site",
      "issue": 77,
      "wave": 1,
      "needs": ["privacy-decision"],
      "owns": ["educa-site:app/privacidade/**", "educa-site:components/waitlist/**", "educa-site:lib/waitlist-intake.ts", "educa-site:lib/waitlist-intake.test.ts"]
    },
    {
      "id": "privacy-app",
      "issue": 77,
      "wave": 1,
      "needs": ["privacy-decision"],
      "owns": ["EDUCA:app/app/politica-privacidade/**", "EDUCA:app/components/lgpd/**", "EDUCA:app/app/(dashboard)/dashboard/responsaveis/**", "EDUCA:app/tests/unit/privacy/**"]
    },
    {
      "id": "local-docs",
      "issue": 17,
      "wave": 1,
      "needs": ["claims-product", "local-runtime"],
      "owns": ["EDUCA:README.md", "EDUCA:CONTEXT.md"]
    },
    {
      "id": "api-docs-identity",
      "issue": 20,
      "wave": 1,
      "needs": ["api-docs-foundation"],
      "owns": ["EDUCA:app/lib/api/base.ts", "EDUCA:app/lib/api/users.ts", "EDUCA:app/lib/api/schools.ts", "EDUCA:app/lib/api/students.ts", "EDUCA:app/lib/api/classes.ts", "EDUCA:app/lib/api/student-admission.ts", "EDUCA:app/lib/services/user-lifecycle.ts"]
    },
    {
      "id": "api-docs-attendance",
      "issue": 20,
      "wave": 1,
      "needs": ["api-docs-foundation"],
      "owns": ["EDUCA:app/lib/api/attendance.ts", "EDUCA:app/lib/api/enhanced-attendance.ts", "EDUCA:app/lib/api/canonical-attendance-facts.ts", "EDUCA:app/lib/api/class-diary.ts", "EDUCA:app/lib/services/attendance-auth.ts", "EDUCA:app/lib/services/attendance-module.ts", "EDUCA:app/lib/services/attendance-reopen.ts", "EDUCA:app/lib/services/attendance-reopen-database.ts"]
    },
    {
      "id": "api-docs-platform",
      "issue": 20,
      "wave": 1,
      "needs": ["api-docs-foundation"],
      "owns": ["EDUCA:app/lib/api/audit.ts", "EDUCA:app/lib/api/configs.ts", "EDUCA:app/lib/api/dashboard-stats.ts", "EDUCA:app/lib/api/feature-flags.ts", "EDUCA:app/lib/api/grades.ts", "EDUCA:app/lib/api/reports.ts", "EDUCA:app/lib/api/vivencias.ts", "EDUCA:app/lib/utils.ts"]
    },
    {
      "id": "api-docs-integrate",
      "issue": 20,
      "wave": 2,
      "needs": ["api-docs-identity", "api-docs-attendance", "api-docs-platform"],
      "owns": ["EDUCA:docs/api/**"]
    },
    {
      "id": "activation-gate",
      "issue": 82,
      "wave": 2,
      "needs": ["claims-product", "claims-site", "privacy-site", "privacy-app", "journeys-contract"],
      "owns": ["EDUCA:docs/operations/public-demo-activation.md", "external:geteduca.vercel.app", "external:educa-demo.vercel.app"]
    },
    {
      "id": "wayfinder-close",
      "issue": 73,
      "wave": 3,
      "needs": ["activation-gate"],
      "owns": ["tracker:shishiv/EDUCA#73"]
    }
  ]
}
```
<!-- parallel-manifest:end -->

## Integração por repositório

Quando houver autorização para executar, use uma pilha de PRs por repositório:

- **EDUCA:** claims do README na base; setup local e contrato de jornadas acima dela; privacidade do app depois da decisão; gate de ativação no topo. O trabalho de API docs pode ser uma pilha paralela enquanto não tocar os mesmos manifests ou docs de integração.
- **educa-site:** claims/deploy na base; privacidade da waitlist acima; integração do gate de ativação no topo.

Workers podem implementar folhas disjuntas em cópias isoladas ao mesmo tempo. Um integrador lineariza os commits na pilha, resolve mudanças de `package.json`, lockfile, README e documentos de índice, e executa os gates do topo. Nenhum worker deve editar esses arquivos compartilhados fora do ownership declarado.

## Gates de integração

### Contrato público

- O texto local e o texto publicado são iguais nas afirmações críticas.
- A descrição do demo corresponde às mutações realmente permitidas.
- Cada CTA tem destino real e não promete serviço, preço, suporte ou contato inexistente.

### Privacidade e segurança

- Nenhum dado real entra no demo ou nos testes; use somente dados sintéticos.
- Nenhuma aprovação jurídica é inferida a partir de código, teste ou deploy.
- Pilot Gate, RLS, tenant, roles e bloqueio de efeitos externos permanecem ativos.
- A waitlist não coleta dados sem finalidade, destino, retenção e contato definidos.
- O cadastro de responsável usa o fundamento aprovado para o tratamento, sem consentimento genérico obrigatório por padrão.

### Jornadas

- Mutações são exercitadas somente em stack sintética descartável.
- O smoke público não altera o sandbox compartilhado.
- Cada papel obrigatório tem um caminho positivo e um negativo observável.

### Release

- O alias público aponta para o SHA aprovado.
- Site e demo têm decisão de ativação separada.
- O owner consegue restaurar o último deploy aprovado sem alterar dados.
- Falha em login, claims, privacidade, RLS, efeito externo ou rollback bloqueia a ativação.

## Próxima ação recomendada

Começar por #76, #77 e #79 em paralelo. #82 integra os três resultados. Em paralelo, #20 pode preparar sua fundação e #19 pode fazer somente a pesquisa de contrato. #17 entra depois da alteração do README de #76. #18 não entra em execução sem uma decisão nova de produto.

## Registro verificado da integração — Onda 1 / fase 1

- A base `campaign/open-issues-e2e` integrou os commits completos das lanes DEVX (`6af593e3`, `a377b52b`), PRIVACY (`936db6cc`) e API DOCS (`b529e710`) por cherry-pick.
- A lane JOURNEYS (`campaign/leaf-journeys`) não foi integrada nesta fase: seu handoff declara que typecheck e E2E não foram executados por falta de dependências/stack e registra bloqueios materiais de ativação pública (claims, privacidade e credencial do demo). Os commits permanecem no branch da lane.
- A lane PRIVACY mantém pendente a definição da base legal pelo controlador municipal; nenhum fundamento jurídico foi inventado no código integrado.
- A geração de API docs é reproduzível via `cd app && pnpm docs:api`; a saída `docs/api/` permanece gerada e ignorada.
