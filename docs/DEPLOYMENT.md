# EDUCA - Guia de Deployment

Sistema de Gestão Escolar - Prefeitura de Fronteira, MG

---

## Pré-requisitos

### Ferramentas Necessárias

| Ferramenta | Versão Mínima | Comando de Verificação |
|------------|---------------|------------------------|
| Node.js | 20.x LTS | `node --version` |
| pnpm | 9.x | `pnpm --version` |
| Git | 2.x | `git --version` |

### Acessos Necessários

- **GitHub**: Acesso ao repositório `shishiv/EDUCA`
- **Vercel**: Conta com acesso ao projeto `gestao-fronteira`
- **Supabase**: Acesso ao dashboard do projeto `SUPABASE-PROJECT-REF`

---

## Variáveis de Ambiente

Configuradas no Vercel Dashboard > Settings > Environment Variables:

| Variável | Descrição | Onde Encontrar |
|----------|-----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL da API Supabase | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública (anon) | Supabase Dashboard > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (server-side) | Supabase Dashboard > Settings > API |

**Importante**: Nunca compartilhe a `SUPABASE_SERVICE_ROLE_KEY` publicamente.

---

## Processo de Deployment

### Deploy Automático (Recomendado)

O deployment acontece automaticamente quando há push para a branch `main`:

1. Faça suas alterações localmente
2. Commit e push para `main`:
   ```bash
   git add .
   git commit -m "feat: descrição da alteração"
   git push origin main
   ```
3. O Vercel detecta o push e inicia o build automaticamente
4. Acompanhe o progresso em: https://vercel.com/dashboard

### Deploy Manual (Quando Necessário)

Para deploy manual via CLI:

```bash
# 1. Navegue até o diretório do projeto
cd gestao_fronteira

# 2. Verifique se o build local funciona
pnpm build

# 3. Deploy para produção
pnpm exec vercel --prod
```

---

## Verificação Pós-Deploy

### Checklist de Verificação

- [ ] Acesse a URL de produção
- [ ] Teste o login com credenciais válidas
- [ ] Verifique se o dashboard carrega corretamente
- [ ] Teste uma operação de escrita (ex: criar sessão de aula)
- [ ] Verifique os logs no Vercel para erros

### URLs Importantes

| Ambiente | URL |
|----------|-----|
| Produção | https://gestao-fronteira.vercel.app |
| Vercel Dashboard | https://vercel.com/dashboard |
| Supabase Dashboard | https://supabase.com/dashboard/project/SUPABASE-PROJECT-REF |

---

## Monitoramento

### Logs de Aplicação

- **Vercel Functions Logs**: Vercel Dashboard > Functions > Logs
- **Build Logs**: Vercel Dashboard > Deployments > [deployment] > Build Logs

### Banco de Dados

- **Logs SQL**: Supabase Dashboard > Database > Logs
- **RLS Policies**: Supabase Dashboard > Database > Policies
- **Uso**: Supabase Dashboard > Usage

---

## Ambientes

| Ambiente | Branch | Auto-Deploy | Uso |
|----------|--------|-------------|-----|
| Produção | `main` | Sim | Usuários reais |
| Preview | PRs | Sim | Testes de features |
| Local | - | Não | Desenvolvimento |

---

## Solução de Problemas

### Build Falhou

1. Verifique os logs de build no Vercel Dashboard
2. Execute `pnpm build` localmente para reproduzir o erro
3. Corrija os erros de TypeScript ou dependências
4. Faça novo push

### Erro de Variáveis de Ambiente

1. Verifique se todas as variáveis estão configuradas no Vercel
2. Confirme que não há espaços extras nos valores
3. Redeploy após alterar variáveis: `pnpm exec vercel --prod`

### Erro de RLS (Row Level Security)

1. Verifique os logs do Supabase para erros de permissão
2. Consulte a documentação em `.planning/codebase/RLS-POLICIES.md`
3. Teste as queries diretamente no Supabase SQL Editor

---

## Contatos

| Responsabilidade | Contato |
|------------------|---------|
| Desenvolvedor | [CONTATO_DEV] |
| Supabase Issues | https://github.com/supabase/supabase/issues |
| Vercel Issues | https://github.com/vercel/vercel/issues |

---

*Documento criado: 2026-01-27*
*Versão: v2.1 Pilot*
