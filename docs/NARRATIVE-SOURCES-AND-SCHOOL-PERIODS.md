# Contratos de Vivências e períodos escolares

## Limite do produto

Contrato aprovado A1/B1 em 2026-09-14, implementado sobre `dev`. O produto continua sintético: nenhuma autorização de dados reais, publicação, emissão municipal oficial, assinatura, implantação ou promoção para produção. Permanecem os limites de papéis, escola, notas, reabertura de frequência e efeitos externos.

## Relatório de desenvolvimento Infantil

Vivências são observações pedagógicas escritas pelo professor nos cinco Campos de Experiência. Não são notas e não são o conteúdo ministrado de uma sessão. O professor redige o relatório; não há geração automática do parecer nem seleção manual por checkboxes.

### Seleção automática completa

Para uma matrícula e semestre do relatório, a função `preview_descriptive_report_sources` encontra o período cadastrado na escola/ano e seleciona todas as Vivências:

- da mesma escola, criança, matrícula e turma;
- com `data_vivencia` entre início e fim, inclusive;
- ordenadas por data e ID, sem amostra de 50 linhas nem paginação implícita da fonte do relatório.

O preview usa a identidade autenticada e a mesma autoridade de escola/titular do diário. O administrador/secretário mantém somente a autoridade já existente. O navegador não escolhe a escola por um campo livre do payload.

Rascunhos mostram prévia viva, quantidade e fontes, ou estado de carregamento/erro/ausência de período. Podem ser salvos sem calendário ou sem fontes. A prévia não é uma captura histórica e não garante que a base esteja igual no instante da finalização.

### Finalização atômica

A migração `20260914000000_narrative_sources_and_school_periods.sql` adiciona `relatorios_descritivos.fontes_snapshot` e um trigger de captura. A operação que finaliza o relatório:

1. Mantém a validação existente dos cinco campos e a derivação de autor/hora da finalização.
2. Confere matrícula/turma e período escolar configurado.
3. Exige pelo menos uma Vivência elegível.
4. Captura período e conjunto completo de fontes no banco, na mesma transação.

Não aceita snapshot enviado pelo cliente. Falha de período, fonte ou integridade aborta a operação inteira. A consulta STABLE usa a visão transacional da instrução: uma edição ainda não commitada em outra conexão não mistura versões na captura. Um commit posterior não reescreve o relatório.

A captura contém:

- `periodo`: chave, nome, limites, escola, ano e ID do ano letivo;
- `fontes`: IDs e escopo, textos/observações, campos de experiência, professor, autoria e timestamps de criação/edição de cada Vivência;
- `versao = vivencias-v1`;
- `algoritmo = SHA-256/postgresql-jsonb-v1`;
- `fingerprint`: SHA-256 dos bytes UTF-8 da representação **PostgreSQL JSONB** de `{periodo,fontes}`;
- `capturado_por` e `capturado_em`, derivados da finalização.

O algoritmo não é SHA-256 de `JSON.stringify` e não deve ser recalculado usando outra serialização como se fosse equivalente. O fingerprint atesta o payload capturado de fontes/período, não uma assinatura legal nem os bytes completos do PDF.

### Leitura, emissão e legado

As duas rotas compartilham o mesmo editor e painel de fontes:

- `/dashboard/alunos/[id]/diario/relatorio`;
- `/diario/relatorios/[alunoId]`.

Relatórios finalizados são imutáveis, inclusive para atualizações sem mudança aparente. A leitura e o PDF narrativo usam a captura persistida. Edição/criação posterior de Vivências ou mudança/remoção do calendário não substituem essas fontes. Os vínculos antigos em `relatorios_descritivos_vivencias` são preservados; não se duplica o texto capturado naquela tabela.

Finalizados anteriores à migração continuam legíveis e imutáveis, com indicação de ausência de captura histórica. Não se fabrica proveniência retroativa a partir da base atual. Nova emissão atestada sem snapshot é recusada; rascunhos antigos adotam o contrato ao finalizar.

O PDF continua restrito à rota de ensaio descritivo já governada, com autenticação, seed sintético e revisão/ambiente correspondentes. O PDF imprime fonte canônica, escopo, período, quantidade, versão, fingerprint, autor/hora da captura e emissor autenticado. Identificação escolar/pessoal de cabeçalho continua vindo do cadastro autorizado; o contrato imutável aqui é o texto do relatório e a captura de fontes/período, não uma cópia de todo o cadastro.

`conteudo_aula` continua canônico para o **relatório separado de conteúdo ministrado**. Sua remoção não bloqueia o relatório narrativo; sua falta continua impedindo a emissão do relatório de conteúdo que depende dele.

## Escola sem calendário pedagógico configurado

`anos_letivos` mantém seu default anual ajustável: ano civil corrente, de janeiro a dezembro. Isso não declara datas pedagógicas aprovadas.

Cada registro escola/ano recebe `periodos = []` por default no banco. Lista vazia significa **não configurado**. Não se infere bimestre, semestre, férias ou calendário a partir do intervalo anual, da data atual ou de constantes de componentes.

O diretor da própria escola cadastra rótulo e limites de cada período, via configuração de ano letivo. Há seis chaves de produto: `primeiro`, `segundo`, `bimestre_1` até `bimestre_4`; os nomes e datas são dados persistidos, não calendários fixos do cliente. Não é necessário preencher todos.

A mutação `set_school_periods`:

- exige diretor da mesma escola;
- exige ano já cadastrado;
- valida estrutura, chaves únicas, nome não vazio, datas reais e limites dentro do ano;
- rejeita sobreposição entre períodos do mesmo tipo;
- audita alteração e mantém os demais anos/escolas isolados.

O endpoint `/api/school-settings/periods` deriva a escola da sessão. A UI permite escolher/cadastrar outro ano, sem reescrever anos anteriores. A alteração do intervalo anual também revalida os períodos existentes.

Sem calendário:

- Vivências, chamada e rascunhos continuam operacionais;
- meses civis e consultas com datas personalizadas permanecem disponíveis em frequência e conteúdo;
- atalhos pedagógicos não cadastrados não recebem datas inventadas;
- nova finalização narrativa não ocorre sem período e fonte;
- relatórios já capturados continuam legíveis e emitíveis dentro da fronteira existente.

**Modo piloto:** a restrição anterior de `/dashboard/configuracoes` permanece. A API usa a autoridade autenticada do diretor; o DOM de configuração é ensaiado no runner geral local, ainda exclusivamente sintético. Este contrato não habilita módulos antes bloqueados do piloto.

## Validação e manutenção

Comandos de aplicação continuam em `app/`: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` e `pnpm test:e2e:pilot:descriptive`. O lint inclui complexidade máxima 10, regras anti-slop e ESLint sem warnings. Não aumentar timeout, remover expectativas ou excluir testes para obter aprovação.

O runner descritivo executa cinco casos mais setup: preview/rascunho sem calendário, captura e leitura pelas duas rotas, configuração autenticada, imutabilidade, PDF real e quebra deliberada. Seu validador SQL recomputa o fingerprint PostgreSQL independentemente da aplicação. Extração textual exige `pdftotext` disponível no host; não se instala ferramenta global sem autorização.

`supabase/tests/database/run.sh` valida a cadeia completa, escopo/roles, mais de 50 fontes, limites inclusivos, rejeições e concorrência. O legado é criado **antes** da migração numa cópia temporária isolada; a cópia é removida antes dos demais testes, sem contaminar contagens de fixtures.

O recorte browser geral e os receipts desta implementação estão em [`artifacts/contracts/`](../artifacts/contracts/README.md). Coleta de manifesto e testes DOM/unitários não substituem execução browser/SQL. Credenciais, auth state e traces brutos permanecem fora do Git; somente evidência sintética revisada/redigida é durável.

Nomes de arquivos baixados são normalizados para ASCII portável; conteúdo e nomes apresentados no documento não são alterados. Isso corrige o fallback observado no Chromium 152 para nomes de download com caracteres como `º`, comprovado por metadados do download real e contrafactual isolado.
