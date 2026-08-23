---
title: Contrato limitado do Educacenso 2026
type: implementation-contract
date: 2026-08-23
status: synthetic-fixture-only
issue: 19
---

# Contrato limitado do Educacenso 2026

## Decisão

Esta entrega implementa somente a transformação pura do **Arquivo de
Identificação 2026, versão 1**. Ela não implementa o arquivo completo de
importação/exportação da Matrícula Inicial, não lê o banco do EDUCA, não cria
rota ou tela, não transmite dados e não habilita Educacenso no demo ou no
piloto.

O resultado é um artefato offline para fixtures sintéticos. Passar nos testes
locais **não comprova conformidade, aceite pelo Inep ou prontidão municipal**.

O levantamento anterior que não localizou o layout 2026 foi superado por uma
publicação oficial posterior: a página do Inep registra atualização em
09/07/2026 e agora liga diretamente todos os artefatos usados abaixo.

## Fontes oficiais congeladas

Recuperadas em 23/08/2026 a partir da página oficial de
[Migração do Censo Escolar](https://www.gov.br/inep/pt-br/areas-de-atuacao/pesquisas-estatisticas-e-indicadores/censo-escolar/orientacoes/matricula-inicial/migracao).

| Artefato oficial | Evidência usada | SHA-256 |
| --- | --- | --- |
| [Etapas e Instruções Gerais para a Migração no Sistema Educacenso - 1ª etapa 2026](https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/instrucoes_da_migracao_censo_escolar_1_etapa_2026.pdf) | texto plano `.txt`; inexistência de API; separador `\|`; ISO-8859-1; nome e tamanho do arquivo; fluxo manual e sigiloso | `efdf88b968da214b79cc7396ebcd91703e1c10efaaab995f0e3f16d181529e22` |
| [Layout de Identificação 2026](https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/layout_de_identificacao_2026.xlsx) | versão 1; nove campos; obrigatoriedade, tamanho e formato de cada campo | `b507c61eb94d277d6d3a1e16d936f0dff80cc39a413dcfa526dd2d653917ec15` |
| [Layout de Importação e Exportação da Matrícula Inicial 2026](https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/layout_de_importacao_e_exportacao_2026.xlsx) | changelog observado até V5; códigos de escola com 8 dígitos; identificador único de pessoa com 12 dígitos; inventário dos registros ainda bloqueados | `68abca006f808d8c7d0ae405e350de7b77e3c70385f329cf4b8e7ff597296a09` |
| [Tabelas auxiliares do Educacenso 2026](https://download.inep.gov.br/educacao_basica/educacenso/migracao/2026/tabelas_auxiliares_2026.rar) | pacote de domínios oficiais | `ca7d1c033dfdebf47f1dc61cc25c3c9fdf4ee227189dd3257d72ae8118e46ac0` |
| `Tabela de Municípios 2026.xlsx` dentro do pacote | 5.571 códigos únicos; validação dos dois códigos da fixture | `cea115117f79a697f3402eb67133976788544399b15c9789bcd9fe2ad08d80a3` |

Os hashes também estão em
`app/lib/educacenso/2026/source.ts`. O repositório não redistribui os binários
oficiais.

## Contrato implementado

O módulo `app/lib/educacenso/2026/**`:

1. recebe valores já no alfabeto e formato do layout, sem normalização
   silenciosa;
2. valida os campos 1, 2, 4, 5, 6, 7 e 8 do Arquivo de Identificação;
3. mantém o campo 3 vazio porque a fonte exige uma matrícula de certidão
   válida, mas não fornece neste conjunto um algoritmo suficiente para provar
   essa validade;
4. mantém o campo 9 vazio, como exige o layout para arquivos enviados;
5. produz nove campos separados por pipe e bytes ISO-8859-1;
6. exige escolha explícita entre `LF` e `CRLF` e sobre a quebra final, pois os
   artefatos oficiais dizem apenas que cada registro ocupa uma linha;
7. valida município contra referência explícita associada ao hash congelado;
8. retorna erros ordenados e referenciados, sem persistência, rede, relógio,
   logs ou efeitos colaterais.

O limite interno de `20.000.000` bytes é uma interpretação conservadora do
limite oficial de “20Mb”; ele pode rejeitar antes do Inep, mas nunca é usado
para afirmar aceite.

### Catálogo de municípios

O catálogo integral de 5.571 códigos não é necessário em runtime nesta fatia,
pois não existe caller de produção. Além disso, os artefatos não apresentam uma
licença de redistribuição específica no próprio arquivo. Portanto, o catálogo
não foi copiado para o bundle.

Os testes usam apenas `2704302` (linha 1705) e `5300108` (linha 5579), ambos
confirmados na planilha oficial e sem dados pessoais. O módulo exige que a
referência declare se é `synthetic-fixture-subset` ou
`complete-official-table`; cobertura completa também exige exatamente 5.571
códigos. O comando abaixo reproduz a verificação após baixar e extrair o pacote
oficial:

```bash
cd app
pnpm exec tsx scripts/inspect-educacenso-2026-municipalities.ts \
  "/caminho/Tabela de Municípios 2026.xlsx"
```

## Reconciliação de identificadores

A evidência oficial distingue os conceitos; não há substituição global:

- **Código de escola - Inep:** 8 caracteres numéricos (`registro 00`, campo 2).
- **Identificação única (Inep) da pessoa:** 12 caracteres numéricos quando
  preenchida (`registros 30, 40, 50 e 60`, campo 4; também campo 9 do Layout de
  Identificação no arquivo de retorno).
- **CPF:** 11 caracteres numéricos; é outro identificador e não deve ser
  chamado de ID Inep.

Foram adicionados validadores estritos separados. O campo local
`codigo_inep_estudante` foi corrigido de 11 para 12 dígitos porque seu nome e
uso representam a identificação única da pessoa. O helper legado genérico
continua aceitando escola (8) ou pessoa (12), preservando callers existentes;
ele não é usado para serializar arquivo.

## Fixture e golden file

`app/tests/fixtures/educacenso/2026/**` contém somente nomes marcados como
`PESSOA SINTETICA`, sem CPF, certidão ou ID Inep. O golden fixa a ordem de nove
campos, pipes, campos vazios e a escolha de `LF` com quebra final feita pelo
teste. Essa escolha de framing é uma configuração testada, não uma regra
atribuída ao Inep.

## Gap map e gates abandonados nesta entrega

| Item | Estado | Handoff necessário |
| --- | --- | --- |
| Arquivo completo de importação | **Bloqueado** | Implementar separadamente os registros 00/10/20/30/40/50/60 e terminador `99\|`, incluindo todas as regras condicionais e tabelas. O layout atual exige 53/187/66/110/7/38/33 campos respectivamente. |
| Campo 3 (certidão) na identificação | **Bloqueado** | Obter algoritmo oficial suficiente para validar “matrícula válida”; até lá o serializer só emite vazio. |
| Catálogo integral em runtime | **Bloqueado** | Definir necessidade de caller, política de atualização, licença de redistribuição e processo que confira hash/contagem antes de versionar ou carregar o catálogo. |
| Mapeamento do schema atual | **Bloqueado** | Auditoria campo a campo; migrations locais têm apenas um subconjunto e domínios resumidos, portanto não sustentam export completo. |
| API, UI, progresso e persistência | **Bloqueado** | PR posterior somente após exporter completo, autorização por escola, privacidade, RLS, owner municipal e revisão de segurança. |
| Upload/transmissão | **Bloqueado** | O Inep declara não oferecer API; qualquer envio é manual por usuário autorizado no Educacenso. Este repositório não automatiza login/upload. |
| Demo e Pilot Gate | **Bloqueado** | Permanecem com bloqueio total. Não foi criada exceção, rota ou capacidade. |
| Dados reais | **Bloqueado** | Exige aprovações municipal, jurídica, de governança e privacidade nomeadas; não faz parte desta issue. |
| Validade regulatória/aceite | **Não afirmada** | Somente validação no sistema do Inep e revisão humana podem produzir evidência externa; testes locais não substituem isso. |

## Critério de avanço

Uma próxima fatia só pode começar após escolher explicitamente um registro do
layout completo, congelar todas as suas regras e tabelas oficiais, definir um
golden independente e auditar os campos locais sem flexibilizar os bloqueios de
demo/piloto. API/UI/schema continuam fora até o contrato puro estar completo e
revisado.
