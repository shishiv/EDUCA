# Domínio Municipal - Fronteira.localhost

Este documento explica como configurar e usar o domínio municipal `fronteira.localhost` para desenvolvimento local, reforçando a identidade visual da Prefeitura de Fronteira-MG.

## 🏛️ Configuração do Domínio Municipal

### 1. Configuração do Hosts (Windows)

Para usar `fronteira.localhost`, adicione a seguinte linha ao arquivo hosts:

**Localização do arquivo:** `C:\Windows\System32\drivers\etc\hosts`

```
127.0.0.1    fronteira.localhost
```

**Como editar (Windows):**
1. Abra o Prompt de Comando como Administrador
2. Execute: `notepad C:\Windows\System32\drivers\etc\hosts`
3. Adicione a linha acima
4. Salve o arquivo

### 2. Configuração do Hosts (macOS/Linux)

```bash
# Editar o arquivo hosts
sudo nano /etc/hosts

# Adicionar a linha:
127.0.0.1    fronteira.localhost
```

## 🚀 Scripts de Desenvolvimento

### Comandos Disponíveis

```bash
# Desenvolvimento padrão (localhost)
npm run dev

# Desenvolvimento com domínio municipal (recomendado)
npm run dev:fronteira

# Desenvolvimento municipal na porta 3000
npm run dev:municipal

# Produção com domínio municipal
npm run start:fronteira
```

### Acesso ao Sistema

Após a configuração, acesse o sistema através de:

- **Desenvolvimento Municipal:** http://fronteira.localhost:3001
- **Desenvolvimento Municipal (porta 3000):** http://fronteira.localhost:3000
- **Desenvolvimento Padrão:** http://localhost:3001

## 🎨 Benefícios da Identidade Municipal

### 1. Reforço da Marca
- URL reflete a identidade da Prefeitura de Fronteira-MG
- Experiência mais profissional para desenvolvedores
- Alinhamento com domínio de produção futuro

### 2. Desenvolvimento Realista
- Simula ambiente de produção municipal
- Teste de funcionalidades específicas do domínio
- Preparação para deploy em domínio oficial

### 3. Organização do Projeto
- Separação clara entre projetos municipais
- Identidade visual consistente desde o desenvolvimento
- Facilita apresentações e demonstrações

## 🔧 Configurações Técnicas

### Next.js Configuration

O sistema está configurado para aceitar ambos os domínios:

```javascript
// next.config.js
experimental: {
  serverActions: {
    allowedOrigins: [
      'localhost:3000',
      'localhost:3001',
      'fronteira.localhost:3000', // ✅ Municipal domain
      'fronteira.localhost:3001', // ✅ Municipal domain
      'sme.fronteira.mg.gov.br',  // Production
    ],
  },
}
```

### Image Optimization

Assets municipais otimizados para ambos os domínios:

```javascript
images: {
  remotePatterns: [
    {
      protocol: 'http',
      hostname: 'fronteira.localhost', // ✅ Municipal assets
      pathname: '/**',
    },
    // ... outras configurações
  ],
}
```

## 📋 Checklist de Configuração

- [ ] Arquivo hosts configurado
- [ ] DNS local funcionando
- [ ] Servidor de desenvolvimento iniciado
- [ ] Acesso via fronteira.localhost confirmado
- [ ] Assets municipais carregando corretamente
- [ ] Funcionalidades testadas no domínio municipal

## 🌐 Domínios de Produção

### Planejamento para Deploy

```
Desenvolvimento: fronteira.localhost:3000
Homologação:    hml.fronteira.mg.gov.br
Produção:       sme.fronteira.mg.gov.br
```

### Variáveis de Ambiente

```bash
# .env.local (desenvolvimento municipal)
NEXT_PUBLIC_APP_URL=http://fronteira.localhost:3000
NEXT_PUBLIC_MUNICIPAL_DOMAIN=fronteira.localhost

# .env.production (produção)
NEXT_PUBLIC_APP_URL=https://sme.fronteira.mg.gov.br
NEXT_PUBLIC_MUNICIPAL_DOMAIN=fronteira.mg.gov.br
```

## 🎯 Casos de Uso

### 1. Desenvolvimento de Features
```bash
npm run dev:fronteira
# Acesse: http://fronteira.localhost:3001
```

### 2. Demonstrações para a Prefeitura
```bash
npm run dev:municipal
# Acesse: http://fronteira.localhost:3000
```

### 3. Testes de Integração
```bash
npm run build
npm run start:fronteira
# Acesse: http://fronteira.localhost:3000
```

## 🏛️ Identidade Visual Municipal

O domínio `fronteira.localhost` reforça a identidade visual implementada:

- ✅ Brasão municipal nos componentes
- ✅ Cores oficiais da prefeitura
- ✅ Logo municipal no sistema
- ✅ Domínio com nome da cidade
- ✅ Experiência completa municipal

---

**Sistema de Gestão Escolar - Prefeitura de Fronteira/MG**
*Trabalho, Dedicação e Amor*