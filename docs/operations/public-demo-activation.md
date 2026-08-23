# Gate de ativação do demo público

Issue: #82
Status: BLOCKED: dependências ainda não satisfeitas
Dependências: #76 (claims/mutabilidade), #77 (privacidade), #79 (jornadas)

## Objetivo

Checklist repetível para ativar ou manter tráfego público no demo EDUCA.
Site e demo têm decisões de ativação independentes.

## Prerequisites

| # | Pré-requisito | Responsável | Status |
|---|-------------|-------|--------|
| P1 | Contrato de claims (#76) reconciliado: README e site correspondem | Revisor humano | ❌ Pendente |
| P2 | Contrato de privacidade (#77) decidido: texto estável | Revisor humano | ❌ Pendente |
| P3 | Contrato de jornadas (#79) satisfeito: smoke J1 passou | Esta lane | ⚠️ Parcial |
| P4 | Alias do deploy aponta para o SHA esperado | Responsável pelo deploy | ❌ Não verificado |
| P5 | Credencial do demo autentica com sucesso | Responsável pelo demo | ❌ Falhando |
| P6 | Rollback ensaiado e responsável nomeado | Responsável humano | ❌ Não feito |

## Gate: Site (geteduca.vercel.app)

### Verificações

- [ ] **Convergência do deploy:** `vercel inspect` ou equivalente mostra alias apontando ao SHA do `main`
- [ ] **Claims correspondentes:** texto visível corresponde ao contrato de claims do `README.md`
- [ ] **Link de privacidade:** `/privacidade` ou equivalente carrega e corresponde à decisão #77
- [ ] **Console limpo:** sem erros bloqueadores no console (desktop e mobile)
- [ ] **Rede limpa:** sem falhas em recursos críticos
- [ ] **Links válidos:** destinos de navegação resolvem sem 404
- [ ] **Acessibilidade:** sem violações WCAG críticas na landing page
- [ ] **Responsividade móvel:** conteúdo essencial visível em viewport de 375px

### Decisão

O site pode ficar ativo independentemente do CTA do demo. Se o demo não estiver pronto, remova ou desative o CTA sem retirar o site do ar.

## Gate: Demo (educa-demo.vercel.app)

### Verificações

- [ ] **Convergência do deploy:** alias aponta ao SHA da release aprovada
- [ ] **Credencial funciona:** credencial publicada autentica
- [ ] **J1 passa:** smoke do visitante público, sem efeitos destrutivos
- [ ] **J2-J6 passam localmente:** suítes robustas existentes contra stack sintética
- [ ] **Modo sandbox ativo:** `NEXT_PUBLIC_DEMO_SANDBOX=true` confirmado
- [ ] **Cadastro bloqueado:** sem INSERT autenticado em users e UI oculta
- [ ] **Ações destrutivas bloqueadas:** DELETE revogado e UI oculta
- [ ] **Console limpo:** sem erros bloqueadores
- [ ] **Rede limpa:** sem falhas de autenticação ou dados
- [ ] **Responsável pelo rollback:** pessoa nomeada consegue restaurar o último deploy aprovado

### Decisão

O demo recebe ou mantém tráfego somente quando todas as verificações passam. Uma falha bloqueia a ativação ou aciona rollback para o último estado aprovado.

## Procedimento de rollback

1. Identifique o SHA do último deploy aprovado no recibo de ativação
2. Execute `vercel rollback <deployment-id>` ou promova o deploy anterior
3. Verifique o rollback com o smoke J1
4. Notifique as partes interessadas sobre o motivo

**Responsável pelo rollback:** a definir, requer nomeação humana antes da ativação

## Modelo de recibo de ativação

```
data: AAAA-MM-DD
superficie: site | demo
sha: <commit hash>
alias: <URL verificada>
resultado_gate: passou | falhou
bloqueio: <se falhar, descrição>
ativado_por: <pessoa>
responsavel_rollback: <pessoa>
```

## Current blockers

1. **Deploy do site divergente**: alias público não corresponde ao SHA local
2. **Credencial pública do demo inválida**: login falha no endpoint público
3. **Contrato de privacidade não reconciliado**: #77 pendente
4. **Mutabilidade não reconciliada**: #76 pendente

## Métodos de verificação

- Inspeção do deploy: `vercel ls` / `vercel inspect` com acesso ao projeto
- Teste de credencial: login Playwright na URL pública, sem efeitos destrutivos
- Console/rede: auditoria DevTools ou Playwright `page.on('console')` / `page.on('requestfailed')`
- Acessibilidade: axe-core ou Lighthouse nas páginas principais
- Ensaio de rollback: dry-run documentado com responsável nomeado
