# Identidade Visual - Prefeitura de Fronteira MG

Este diretório contém os assets oficiais da identidade visual da Prefeitura de Fronteira-MG para uso na plataforma educacional.

## Assets Disponíveis

### `brasao.png`
- **Descrição**: Brasão oficial da Prefeitura de Fronteira-MG
- **Uso**: Headers, documentos oficiais, autenticação
- **Alt Text**: "Brasão da Prefeitura de Fronteira MG"
- **Tamanhos Recomendados**: 32px, 48px, 64px
- **Formato**: PNG com transparência

### `logo-completo.png`
- **Descrição**: Logo completo com "PREFEITURA DE FRONTEIRA" e brasão
- **Uso**: Headers principais, splash screens, documentos oficiais
- **Alt Text**: "Prefeitura de Fronteira - Trabalho, Dedicação e Amor"
- **Tamanhos Recomendados**: 200px width, altura proporcional
- **Formato**: PNG com transparência

## Diretrizes de Uso

### Cores Municipais
Baseadas no brasão oficial:
- **Vermelho**: #DC2626 (escudo superior esquerdo)
- **Verde**: #059669 (escudo superior direito)
- **Azul**: #1D4ED8 (escudo inferior esquerdo)
- **Amarelo**: #FBBF24 (escudo inferior direito)
- **Azul Municipal**: rgb(0, 115, 172) (site oficial)

### Espaçamento
- Mínimo 16px de espaço livre ao redor do brasão
- Mínimo 24px de espaço livre ao redor do logo completo

### Acessibilidade
- Sempre incluir alt text descritivo
- Garantir contraste adequado com fundo
- Não usar sobre fundos complexos ou com padrões

### Performance
- Assets otimizados para web
- Suporte a alta densidade de pixels (retina)
- Carregamento prioritário em páginas críticas

## Implementação Técnica

```tsx
// Brasão em header
<Image
  src="/identity/brasao.png"
  alt="Brasão da Prefeitura de Fronteira MG"
  width={48}
  height={48}
  priority
/>

// Logo completo em splash screen
<Image
  src="/identity/logo-completo.png"
  alt="Prefeitura de Fronteira - Trabalho, Dedicação e Amor"
  width={200}
  height={80}
  className="w-full max-w-xs h-auto"
/>
```

## Conformidade Legal

Estes assets são propriedade oficial da Prefeitura Municipal de Fronteira-MG e devem ser utilizados apenas em contextos oficiais relacionados aos serviços municipais de educação.

**Última Atualização**: 2025-09-19
**Fonte**: Prefeitura Municipal de Fronteira-MG