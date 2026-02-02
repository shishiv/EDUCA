# EDUCA - Guia de Rollback

Procedimentos para reverter deployments em caso de problemas críticos.

---

## Quando Fazer Rollback

### Situações que Exigem Rollback Imediato

- **Erro de autenticação**: Usuários não conseguem fazer login
- **Erro crítico de UI**: Tela branca, loop infinito, crash
- **Perda de dados**: Operações de escrita falhando silenciosamente
- **Vazamento de dados**: Dados de uma escola visíveis para outra

### Situações que NÃO Exigem Rollback

- Bug em funcionalidade secundária (ex: filtro não funciona)
- Problema visual menor (ex: alinhamento, cor)
- Lentidão moderada (pode ser resolvido com hotfix)

---

## Procedimento de Rollback

### Método 1: Vercel Dashboard (Recomendado)

**Tempo estimado: 2-3 minutos**

1. Acesse: https://vercel.com/dashboard
2. Selecione o projeto `gestao-fronteira`
3. Vá para a aba **Deployments**
4. Encontre o deployment anterior funcionando (status: ✓ Ready)
5. Clique nos três pontos (...) ao lado do deployment
6. Selecione **"Promote to Production"**
7. Confirme a ação

O rollback é instantâneo após a confirmação.

### Método 2: Vercel CLI

**Tempo estimado: 3-5 minutos**

```bash
# 1. Navegue até o projeto
cd gestao_fronteira

# 2. Liste os deployments recentes
pnpm exec vercel list

# 3. Identifique o deployment anterior (copie a URL ou ID)
# Exemplo: gestao-fronteira-abc123.vercel.app

# 4. Promova para produção
pnpm exec vercel promote [URL_OU_ID]
```

### Método 3: Git Revert (Para Reverter Código)

**Tempo estimado: 5-10 minutos**

```bash
# 1. Identifique o commit problemático
git log --oneline -10

# 2. Reverta o commit (cria novo commit de reversão)
git revert [COMMIT_HASH]

# 3. Push para main (trigga novo deploy automático)
git push origin main
```

**Nota**: Use este método quando quiser manter histórico do problema.

---

## Comunicação Durante Rollback

### Imediatamente (Dentro de 2 minutos)

Envie mensagem no grupo WhatsApp:

```
⚠️ AVISO: Sistema EDUCA temporariamente instável.
Estamos investigando e corrigindo.
Por favor, NÃO salve dados importantes até nova mensagem.
```

### Após Rollback Concluído

```
✅ Sistema EDUCA normalizado.
O problema foi identificado e corrigido.
Podem continuar usando normalmente.
Desculpem pelo transtorno.
```

### Se o Rollback Demorar (>10 minutos)

```
🔧 Sistema EDUCA em manutenção.
Previsão de retorno: [HORÁRIO]
Entraremos em contato quando normalizar.
```

---

## Pós-Rollback

### Checklist de Verificação

- [ ] Sistema acessível na URL de produção
- [ ] Login funcionando
- [ ] Dashboard carregando
- [ ] Dados existentes preservados
- [ ] Comunicação enviada aos usuários

### Análise do Problema

1. **Documente o problema**: O que aconteceu, quando, impacto
2. **Identifique a causa**: Qual commit/mudança causou o problema
3. **Planeje a correção**: Como corrigir sem reintroduzir o bug
4. **Teste em preview**: Deploy em branch separada antes de produção

---

## Contatos de Emergência

| Prioridade | Contato | Quando Usar |
|------------|---------|-------------|
| 1 | [DEV_PRINCIPAL] | Primeiro contato sempre |
| 2 | [DEV_BACKUP] | Se principal não responder em 15min |
| 3 | [COORDENADOR_TI] | Escalação para decisões |

### Grupo WhatsApp Piloto

- **Nome**: EDUCA Piloto - Fronteira
- **Número**: [NUMERO_WHATSAPP]

---

## Cenários de Exemplo

### Cenário 1: Erro após Deploy

**Situação**: Deploy às 14h, usuários reportam erro às 14:30

**Ação**:
1. Confirme o erro acessando o sistema
2. Execute rollback via Vercel Dashboard
3. Comunique no WhatsApp
4. Investigue a causa
5. Corrija e teste em preview antes de novo deploy

### Cenário 2: Erro de Banco de Dados

**Situação**: Erro de RLS bloqueando acesso

**Ação**:
1. Rollback da aplicação (se mudou código de queries)
2. Se o problema é na política RLS:
   - Acesse Supabase Dashboard
   - Database > Policies
   - Reverta a política problemática
3. Documente e corrija

### Cenário 3: Horário Crítico (Fim de Expediente)

**Situação**: Erro às 17:45, professores precisam salvar frequência

**Ação**:
1. Rollback IMEDIATO (método mais rápido)
2. Comunicação prioritária no WhatsApp
3. Análise detalhada pode esperar o próximo dia

---

## Histórico de Rollbacks

| Data | Motivo | Duração | Resolução |
|------|--------|---------|-----------|
| - | - | - | - |

*Atualize esta tabela após cada rollback para manter histórico*

---

*Documento criado: 2026-01-27*
*Versão: v2.1 Pilot*
