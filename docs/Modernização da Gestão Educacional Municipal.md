

# **Relatório Estratégico: Modernização da Gestão Educacional Municipal via APIs e Interoperabilidade de Dados**

### **Sumário Executivo**

Este relatório apresenta um diagnóstico aprofundado e um roteiro estratégico para a modernização da gestão educacional municipal, com foco em dois processos críticos: a matrícula de novos alunos e a submissão de dados ao Censo Escolar. A análise revela que os métodos atuais, predominantemente manuais e baseados em sistemas legados, geram ineficiências operacionais, aumentam o risco de inconsistência de dados e consomem recursos valiosos. A principal conclusão deste documento é que a transformação digital da gestão educacional passa, impreterivelmente, pela adesão e integração à nova **Plataforma MEC Gestão Presente**. Esta iniciativa do Ministério da Educação (MEC) representa a espinha dorsal da estratégia do governo federal para a interoperabilidade de dados no setor e define o caminho tecnológico para o futuro. As recomendações estratégicas delineiam um plano de ação claro, centrado na utilização da API do Sistema Gestão Presente (SGP) para otimizar o processo de matrícula, através de consultas em tempo real a uma base de dados nacional, e para automatizar o envio de dados operacionais, alinhando o município às futuras políticas educacionais e garantindo uma gestão mais ágil, segura e baseada em evidências.  
---

## **Seção 1: O Cenário Atual da Gestão de Dados Educacionais no Brasil**

### **1.1. A Obrigatoriedade do Censo Escolar: Processos, Desafios e a Realidade da Submissão de Dados via Educacenso**

O Censo Escolar, coordenado pelo Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep), é a principal ferramenta de coleta de dados da educação básica no Brasil. Ele funciona como uma radiografia detalhada do sistema educacional, e suas informações são fundamentais para o cálculo de repasses de recursos, como o FUNDEB, e para a formulação e o monitoramento de políticas públicas.1 A coleta de dados é realizada anualmente através do sistema online Educacenso, que centraliza as informações de todas as escolas do país.3  
Apesar de sua importância estratégica, o processo de integração entre os sistemas de gestão municipais e o Educacenso apresenta um gargalo tecnológico fundamental. Uma análise aprofundada dos manuais e procedimentos do Inep revela uma constatação crítica: **o Inep não dispõe de uma Interface de Programação de Aplicações (API) para a transferência de dados entre sistemas**.4 Esta ausência de uma via de comunicação automatizada e em tempo real impõe aos municípios um fluxo de trabalho assíncrono e manual, conhecido como "Migração".  
Este processo de migração consiste em uma complexa rotina de exportação de dados do ano anterior, tratamento das informações em sistemas locais e, por fim, a importação de um arquivo de texto plano (.txt) para a plataforma do Educacenso.4 A operação é restrita a perfis de usuário com privilégios elevados, como "Superusuário" e "Executor", e envolve um risco operacional significativo, uma vez que cada importação sobrescreve de forma irreversível todos os dados previamente registrados para a escola.4 A dependência deste modelo arcaico gera desafios operacionais severos, como o retrabalho excessivo das equipes, a alta probabilidade de inconsistências de dados e o risco constante de não cumprimento dos prazos estipulados. Atrasos na divulgação do Censo, como observado em 2024, podem comprometer o acompanhamento de políticas centrais do próprio governo, como o programa Pé-de-Meia.6

### **1.2. O Processo de Matrícula Municipal: Análise das Ineficiências Operacionais e Oportunidades de Otimização**

Paralelamente aos desafios do Censo, o processo de matrícula de novos alunos na rede municipal é frequentemente marcado por ineficiências que afetam tanto a administração escolar quanto os cidadãos. O fluxo tradicional envolve a presença física dos responsáveis na escola, a apresentação de uma série de documentos em papel, a digitação manual de todas as informações nos sistemas de gestão locais e uma complexa verificação de dados para alunos transferidos de outras redes.  
As principais "dores" deste processo são evidentes: formação de longas filas nas escolas durante o período de matrícula, alta incidência de erros de digitação que comprometem a qualidade da base de dados desde a sua origem, dificuldades na alocação de vagas e uma sobrecarga de trabalho para as equipes das secretarias escolares. A oportunidade central de otimização reside na capacidade de conectar o sistema de matrícula municipal a uma base de dados educacionais centralizada. Tal conexão permitiria a validação instantânea de informações essenciais do aluno, como CPF, nome completo, data de nascimento e filiação, simplificando drasticamente o procedimento e melhorando a experiência de todos os envolvidos.  
A ausência de uma API no Educacenso, portanto, não apenas complica o reporte anual de dados, mas também impede a implementação de soluções modernas para desafios operacionais diários, como a matrícula. A estratégia do MEC, no entanto, não parece ser a de modernizar diretamente o Educacenso. Pelo contrário, o investimento maciço em uma nova plataforma, o MEC Gestão Presente, que possui uma API moderna e robusta, sinaliza uma clara mudança de rumo. Esta divergência de investimento tecnológico indica uma estratégia de substituição gradual, onde o novo sistema está destinado a se tornar o principal canal de intercâmbio de dados, tornando o antigo obsoleto. Para a gestão municipal, alinhar-se a esta nova plataforma não é apenas uma opção, mas uma necessidade estratégica para se manter relevante e eficiente no cenário educacional futuro.  
---

## **Seção 2: A Estratégia Federal de Interoperabilidade: A Plataforma MEC Gestão Presente**

### **2.1. Arquitetura e Componentes: O Papel do Sistema Gestão Presente (SGP) como Hub Nacional de Dados e do Gestão Presente na Escola (GPE)**

A Plataforma MEC Gestão Presente é a iniciativa central do Ministério da Educação para a transformação digital da educação básica, formalmente instituída pela Portaria MEC nº 234/2025.7 Seus princípios fundamentais são a modernização da gestão, a colaboração entre os entes federativos e, crucialmente, a interoperabilidade entre sistemas.8 A plataforma é composta por dois componentes principais que atendem a diferentes níveis de maturidade digital das redes de ensino.  
O **Sistema Gestão Presente (SGP)** é o coração da plataforma. Ele foi concebido para ser o hub nacional de dados educacionais, uma plataforma interoperável que centraliza e padroniza as informações de toda a educação básica no Brasil.10 Sua função primária é agregar dados para permitir o monitoramento contínuo da trajetória escolar dos estudantes e subsidiar a gestão de políticas públicas com informações atualizadas e confiáveis.10  
O **Gestão Presente na Escola (GPE)**, por sua vez, é um módulo complementar de adesão facultativa. Trata-se de um sistema de gestão escolar completo e gratuito, oferecido pelo MEC para as redes de ensino, especialmente as de menor porte, que não possuem uma solução tecnológica própria. O GPE automatiza processos administrativos e pedagógicos rotineiros da escola, como matrícula, enturmação, diário de classe e alocação de professores, e já vem nativamente integrado ao SGP.11 Recentemente, o MEC selecionou 800 municípios para participar da primeira fase de implementação do GPE, priorizando redes com maiores desafios administrativos e de conectividade.15  
Essa arquitetura de "dupla via" é estratégica: para municípios que já possuem sistemas de gestão consolidados, o MEC oferece a API do SGP para integração; para aqueles sem recursos ou sistemas, oferece a solução completa e gratuita do GPE. Essa abordagem acelera a adesão nacional à plataforma, garantindo a inclusão digital independentemente da capacidade tecnológica de cada município.

| Característica | Educacenso (INEP) | MEC Gestão Presente (SGP) |
| :---- | :---- | :---- |
| **Propósito Principal** | Censo estatístico anual ("fotografia" da rede) | Hub de dados operacionais e de trajetória do aluno |
| **Método de Submissão** | Upload de arquivo de texto (.txt) \- "Migração" | API REST / Upload de planilhas |
| **Disponibilidade de API** | Não (explicitamente negado) | Sim (documentada e promovida ativamente) |
| **Frequência de Coleta** | Anual (data de referência fixa) | Contínua / Mensal |
| **Principal Política Associada** | FUNDEB / Políticas de longo prazo | Pé-de-Meia / Políticas operacionais em tempo real |

### **2.2. O Padrão Nacional: O Conjunto Mínimo de Dados da Educação Básica (CMDEB)**

Para que a interoperabilidade funcione na prática, é necessário que todos os sistemas "falem a mesma língua". Essa linguagem comum é o **Conjunto Mínimo de Dados da Educação Básica (CMDEB)**. Trata-se de um padrão nacional que define o conjunto de dados essenciais que devem ser coletados e compartilhados por todas as redes de ensino do país, sejam elas públicas ou privadas.8 O CMDEB inclui informações sobre estudantes, turmas, profissionais da educação, frequência e desempenho, garantindo a consistência e a padronização necessárias para a gestão e o planejamento educacional em larga escala. Qualquer projeto de integração de um sistema municipal com o SGP exigirá, como passo fundamental, o mapeamento dos campos de dados locais para o padrão estabelecido pelo CMDEB.18

### **2.3. A Chave para a Inovação: Análise Técnica da API do SGP**

A ferramenta que viabiliza a comunicação automatizada entre os sistemas municipais e o hub de dados do MEC é a API do SGP.10 Desenvolvida em uma parceria entre o MEC e o Núcleo de Excelência em Tecnologias Sociais da Universidade Federal de Alagoas (NEES/UFAL), esta API é a peça central para a modernização pretendida.20  
A documentação técnica, disponível publicamente e baseada no padrão Swagger/OAS3, revela uma API REST moderna que utiliza operações HTTP padrão.23 Uma análise detalhada dos  
*endpoints* disponíveis mostra que eles atendem diretamente às necessidades de otimização da matrícula e automação do censo:

* **Para otimização da matrícula (Consulta):**  
  * GET /v1/estudantes/{cpfNis}: Permite obter os dados de um estudante específico consultando por seu CPF ou NIS. Este é o *endpoint* essencial para a validação em tempo real no ato da matrícula.  
  * GET /v1/elegibilidades/{cpfNis}: Permite verificar a elegibilidade do estudante para programas sociais, como o Pé-de-Meia, adicionando uma camada de validação importante.  
* **Para automação do envio de dados (Sincronização):**  
  * POST /v1/estudantes/lote: Permite criar (cadastrar) múltiplos estudantes em uma única requisição.  
  * PATCH /v1/estudantes/lote: Permite atualizar os dados de múltiplos estudantes já existentes.  
  * *Endpoints* de Frequencia Mensal: Permitem o envio contínuo de dados operacionais, como a frequência dos alunos, substituindo a necessidade de um grande envio anual.

A existência de ambientes distintos para homologação (testes) e produção é uma prática padrão que garante o desenvolvimento seguro de integrações.23 Além disso, o MEC tem promovido ativamente formações técnicas focadas no envio de dados via API, o que demonstra um compromisso com o suporte à adoção da tecnologia pelas redes de ensino.24  
É notável que o programa Pé-de-Meia foi o principal catalisador para a implementação em larga escala do SGP e sua API. A necessidade de coletar dados de frequência mensalmente para realizar os pagamentos aos estudantes tornou o modelo de coleta anual do Censo Escolar inviável para esta política específica.20 Assim, a demanda operacional de um novo programa social forçou a criação de uma infraestrutura tecnológica robusta que, agora, pode ser aproveitada para modernizar toda a gestão educacional municipal.  
---

## **Seção 3: Roteiro para a Otimização do Processo de Matrícula**

### **3.1. Modelo Conceitual: Utilizando a API do SGP para Consulta e Validação de Dados de Alunos em Tempo Real**

A integração com a API do SGP permite redesenhar completamente o fluxo de matrícula, tornando-o mais ágil, preciso e eficiente. O novo modelo operacional pode ser descrito da seguinte forma:

1. O responsável pelo aluno se apresenta na secretaria da escola portando apenas o número de CPF do estudante.  
2. O funcionário da escola insere o CPF no sistema de gestão escolar do município.  
3. Internamente, o sistema municipal executa uma chamada de API do tipo GET ao *endpoint* /v1/estudantes/{cpfNis} do SGP.23  
4. A API do SGP retorna, em segundos, um objeto de dados (em formato JSON) contendo as informações cadastrais do aluno que já constam na base nacional, como nome completo, data de nascimento e filiação.  
5. O sistema municipal utiliza esses dados para pré-preencher o formulário de matrícula, restando ao funcionário apenas validar as informações com o responsável e complementar dados de âmbito local, como endereço atualizado e telefones de contato.

Os benefícios diretos deste novo fluxo são imensos. Há uma redução drástica no tempo de atendimento por aluno, o que diminui filas e a pressão sobre a equipe administrativa. A eliminação da digitação manual de dados básicos minimiza significativamente a ocorrência de erros, melhorando a qualidade da base de dados desde o ponto de entrada. Para os pais e responsáveis, a experiência é simplificada, exigindo menos documentos e tempo. A capacidade do SGP de agregar todas as matrículas vinculadas a um único CPF também oferece uma ferramenta poderosa para identificar e combater matrículas duplicadas em diferentes redes.13

### **3.2. A Visão de Futuro: Alinhamento com a "Jornada do Estudante" e a Identidade Digital Unificada**

A integração com o SGP transcende a otimização de processos internos. Ela posiciona o município dentro de um ecossistema digital nacional mais amplo, cujo principal ponto de contato com o cidadão é o aplicativo **Jornada do Estudante**.28 Este aplicativo, desenvolvido pelo MEC, permite que estudantes e suas famílias acessem de forma unificada o histórico escolar, notas, frequência e informações sobre programas como o Pé-de-Meia.30  
A qualidade e a completude das informações exibidas no Jornada do Estudante dependem diretamente dos dados que as instituições de ensino enviam para as bases do MEC, principalmente via SGP.29 Portanto, ao se integrar à API do SGP e manter os dados de seus alunos atualizados, o município não está apenas melhorando sua própria gestão, mas também garantindo que seus cidadãos tenham uma experiência completa e satisfatória com os serviços digitais oferecidos pelo governo federal.  
Essa visão de um banco de dados unificado para acompanhar a trajetória do estudante não é nova. O projeto da "ID Estudantil" de 2019, embora a Medida Provisória que o criou tenha perdido a validade, já previa a criação de um cadastro nacional para monitorar a jornada escolar de cada aluno.34 O SGP pode ser visto como a materialização bem-sucedida daquela visão de infraestrutura de dados. Atualmente, em 2025, a emissão de carteiras de estudante para o benefício da meia-entrada continua a ser realizada majoritariamente por entidades estudantis como UNE e UBES, sem uma solução digital unificada e oficial do MEC em plena operação para este fim específico.37 No entanto, a infraestrutura de dados que o SGP está construindo pode, no futuro, servir de base para uma identidade digital educacional unificada.  
---

## **Seção 4: Roteiro para a Automação da Submissão de Dados ao Censo Escolar**

### **4.1. A Realidade Atual: Detalhamento do Processo de Migração de Dados por Arquivos no Educacenso**

Para compreender a magnitude da transformação proposta, é essencial revisitar a complexidade do processo atual de envio de dados ao Censo Escolar. O fluxo de "Migração" do Educacenso, detalhado no manual do Inep, é um processo de oito etapas que impõe um fardo técnico e operacional significativo às redes de ensino.4 Os pontos de maior atrito incluem:

* A necessidade de primeiro **exportar** os dados do ano anterior para obter os códigos de identificação únicos (IDs) de alunos e profissionais.  
* A obrigação de **atualizar os sistemas próprios** com esses IDs para evitar duplicidade.  
* A geração de **múltiplos arquivos de texto** com layouts de formatação rígidos e específicos para diferentes tipos de registro (escola, turma, aluno, profissional).41  
* O **monitoramento assíncrono** do processamento dos arquivos, que podem ser recusados ou parcialmente importados, exigindo correções manuais posteriores.  
* O alto risco associado ao fato de que cada **importação sobrescreve todos os dados anteriores** de forma definitiva, podendo levar à perda de informações caso o arquivo contenha erros.4

Este modelo é reativo, arriscado e consome um tempo desproporcional das equipes técnicas e administrativas todos os anos.

### **4.2. A Rota Estratégica Futura: Utilizando a API do SGP como Canal Primário para o Envio de Dados ao MEC**

A integração com a API do SGP oferece uma mudança de paradigma: a substituição de um "reporte anual" por uma "sincronização contínua". Em vez de um único envio massivo e de alto risco, o município pode adotar um modelo de atualizações frequentes, automatizadas e de baixo impacto.  
O fluxo de trabalho proposto é o seguinte:

1. Com uma frequência definida (diária ou semanal), o sistema de gestão municipal identifica todas as alterações de dados relevantes: novos alunos matriculados, atualizações cadastrais, registros de transferência, notas e frequência.  
2. O sistema agrupa essas alterações e as envia de forma automatizada para a API do SGP, utilizando os *endpoints* de lote, como POST /v1/estudantes/lote para novos registros e PATCH /v1/estudantes/lote para atualizações.23  
3. O sistema municipal é programado para monitorar a resposta da API a cada envio. Em caso de erros, o *endpoint* GET /v1/estudantes/lote/{id}/erros pode ser consultado para obter detalhes do problema. Esses erros são então exibidos em um painel administrativo para que a equipe da secretaria possa corrigi-los de forma proativa.

Ao adotar este modelo, a secretaria municipal mantém a base de dados nacional (SGP) constantemente atualizada com informações precisas e em tempo real. A longo prazo, o SGP, como hub de dados operacionais, se consolidará como a fonte primária para as estatísticas educacionais do país, tornando o processo de migração do Educacenso redundante. Esta mudança transforma a "qualidade dos dados" de uma preocupação anual em uma responsabilidade operacional diária, integrando a conformidade com a rotina de gestão. A complexidade do processo do Educacenso tem sido um forte impulsionador para que municípios busquem softwares de gestão escolar (SGE) que prometem facilitar essa tarefa.43 O case de Riachão das Neves, que reduziu o tempo de exportação de semanas para dias com um SGE, comprova o valor dessa automação.44 A API do SGP representa o próximo e definitivo nível de automação que esses sistemas precisarão incorporar.  
---

## **Seção 5: O Roteiro de Implementação para a Secretaria Municipal de Educação**

### **5.1. O Caminho Administrativo: Guia Passo a Passo para a Adesão à Plataforma MEC Gestão Presente via SIMEC**

O primeiro passo para a modernização é puramente administrativo e crucial. A integração técnica via API só é possível após a adesão formal da rede de ensino à plataforma, um processo realizado através do Sistema Integrado de Monitoramento, Execução e Controle (SIMEC).12 O roteiro é o seguinte:

1. **Acesso ao SIMEC:** O gestor máximo da educação municipal (Secretário de Educação) ou o Chefe do Executivo (Prefeito) deve acessar o portal do SIMEC no endereço https://simec.mec.gov.br/ e realizar o login utilizando sua conta pessoal e intransferível do gov.br.47  
2. **Seleção do Módulo:** No menu principal do sistema, é preciso selecionar a opção referente à plataforma: **"MEC Gestão Presente \- SGP"**.47  
3. **Leitura e Assinatura do Termo:** O sistema apresentará uma introdução ao programa, seguida pelo Termo de Adesão. Este documento deve ser lido atentamente e assinado digitalmente pelo gestor dentro da própria plataforma.47  
4. **Cadastro dos Operadores:** Um passo obrigatório para finalizar a adesão é o cadastro dos profissionais que serão os pontos focais e operadores do sistema na rede. É necessário indicar pelo menos um operador, fornecendo as informações solicitadas (como CPF, nome, e-mail).47 Estes serão os usuários que terão acesso ao SGP para gerenciar os dados. Redes que já aderiram ao programa Pé-de-Meia podem já ter operadores cadastrados.20  
5. **Confirmação Final:** Após o cadastro dos operadores, o sistema exibirá uma tela de síntese. O gestor deve revisar as informações e confirmar a adesão.47  
6. **Adesão Opcional ao GPE:** Caso o município também opte por utilizar o sistema de gestão escolar gratuito do MEC, um processo similar deve ser seguido para aderir ao módulo "Programa Gestão Presente na Escola \- GPE".47

É fundamental compreender que a equipe de tecnologia da informação (TI) não pode iniciar o desenvolvimento da integração antes que este processo administrativo seja concluído pela liderança da Secretaria de Educação. A comunicação e o alinhamento entre as áreas técnica e política são, portanto, essenciais para o sucesso do projeto.

### **5.2. O Arcabouço Jurídico: Navegando a LGPD e os Acordos de Compartilhamento de Dados de Alunos**

O compartilhamento de dados de estudantes entre o município e o MEC é uma operação que deve ser rigorosamente amparada pela legislação, em especial a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).51 O tratamento de dados de crianças e adolescentes, conforme o Art. 14 da LGPD, requer o consentimento específico de um dos pais ou responsável legal.52  
Contudo, o compartilhamento de dados para fins de execução de políticas públicas e cumprimento de obrigações legais, como o Censo Escolar e programas como o Pé-de-Meia, encontra respaldo em outras bases legais da LGPD. Especificamente, o tratamento de dados é permitido quando necessário para a "execução de políticas públicas previstas em leis e regulamentos" ou para o "cumprimento de obrigação legal ou regulatória pelo controlador". Isso mitiga a necessidade de coletar um consentimento específico de cada família para este compartilhamento com o MEC. O debate sobre o tema continua, como evidencia o Projeto de Lei 454/22, que busca alterar a LGPD para autorizar de forma ainda mais explícita o compartilhamento de dados educacionais.52  
Os instrumentos jurídicos que formalizam essa parceria e estabelecem as regras para o compartilhamento de dados são o **Termo de Adesão**, assinado via SIMEC, e, em alguns casos, **Acordos de Cooperação Técnica (ACT)** celebrados entre o município e o MEC.54 Ao aderir à plataforma, o município concorda em seguir um modelo de governança de dados nacional, alinhando-se ao padrão CMDEB em troca dos benefícios da interoperabilidade e da modernização.

### **5.3. O Caminho Técnico: Fases para a Integração de Sistemas Municipais com a API do SGP**

Uma vez concluída a adesão administrativa, a equipe de TI pode iniciar o projeto técnico de integração, que pode ser dividido em quatro fases:

* **Fase 1: Planejamento e Análise:** A equipe técnica municipal, de posse das credenciais de acesso à API, deve realizar um estudo detalhado da documentação e fazer o mapeamento campo a campo entre a base de dados do sistema de gestão local e o padrão CMDEB.  
* **Fase 2: Desenvolvimento/Adaptação:** A equipe de desenvolvimento, seja ela interna ou de um fornecedor de software contratado, implementa no sistema municipal as rotinas de chamada à API do SGP. Isso inclui tanto as funções de consulta (GET) para a matrícula quanto as de envio em lote (POST/PATCH) para a sincronização de dados.  
* **Fase 3: Testes:** Utilizando o ambiente de homologação da API (https://api-cmde-homolog.api.pedemeia-dev.nees.ufal.br) 23, a equipe deve conduzir testes exaustivos, simulando todos os cenários possíveis (matrícula de novo aluno, transferência, atualização de dados, etc.) para garantir que a integração funcione como esperado, sem afetar os dados reais.  
* **Fase 4: Implantação e Monitoramento:** Após a validação em testes, a integração é colocada em produção, apontando para o *endpoint* oficial (https://api-cmde.gestaopresente.mec.gov.br).23 É crucial implementar painéis de monitoramento para acompanhar o status das sincronizações e criar um fluxo de trabalho para que a equipe administrativa possa tratar rapidamente quaisquer erros reportados pela API.

---

## **Seção 6: Análise de Soluções de Mercado e Estudos de Caso**

### **6.1. Ecossistema de Software de Gestão Escolar: Avaliação de Soluções e suas Capacidades de Integração**

O mercado de tecnologia educacional (GovTech) no Brasil já oferece diversas soluções de Software de Gestão Escolar (SGE) para municípios. A capacidade de "integração com o Educacenso" é uma funcionalidade frequentemente destacada, demonstrando que a automação da geração de arquivos.txt já é uma realidade para muitas redes. A próxima fronteira de inovação para esses fornecedores será a integração nativa com a API do SGP.

| Software | Modelo de Licença | Integração Declarada (Educacenso) | Potencial de Integração (API SGP) | Principais Vantagens |
| :---- | :---- | :---- | :---- | :---- |
| **i-Educar** | Código Aberto (Gratuito) | Sim (Import./Export. Automatizada) 43 | **Alto** (código aberto permite desenvolvimento customizado) | Custo zero de licença, flexibilidade, comunidade ativa. |
| **SIGEM (IMAP)** | Comercial (SaaS) | Sim (Exportação Otimizada) 44 | Depende do roadmap do fornecedor | Case de sucesso comprovado, foco no setor público. |
| **Sponte** | Comercial (SaaS) | Sim 58 | Depende do roadmap do fornecedor | Ampla base de clientes, foco em segurança de dados. |
| **Ergon** | Comercial (SaaS) | Sim (Integração Total) 45 | Depende do roadmap do fornecedor | Conjunto abrangente de módulos (RH, financeiro, etc.). |

A escolha entre adaptar um sistema existente, adotar uma solução de código aberto como o **i-Educar**, ou contratar um fornecedor comercial como os que oferecem **SIGEM**, **Sponte** ou **Ergon**, dependerá da capacidade técnica e do orçamento da secretaria municipal. A pergunta crucial a ser feita aos fornecedores comerciais não é mais "Vocês integram com o Educacenso?", mas sim "Qual é o seu plano e cronograma para a integração com a API do SGP?".

### **6.2. Lições Práticas: Estudos de Caso de Inovação em Municípios Brasileiros**

A análise de municípios que já avançaram na digitalização de sua gestão educacional oferece lições valiosas.

* **Riachão das Neves (BA):** Este é um caso exemplar do impacto da tecnologia na gestão.44 Antes da implementação do SGE, a rede enfrentava um processo de gestão manual, com documentos físicos e planilhas, resultando em erros e lentidão. A exportação de dados para o Educacenso levava semanas. Com a adoção do sistema SIGEM, o processo foi centralizado e automatizado. O resultado mais celebrado foi a redução do tempo de exportação para o Censo para apenas alguns dias. No entanto, os benefícios se estenderam para a gestão interna, com melhor controle pedagógico, frequência digital e economia de recursos.44  
* **Santos (SP):** Um caso pioneiro, o município implementou seu Sistema Integrado de Gestão Escolar (Siges) em 2006\. A solução criou um banco de dados único para os alunos da rede, permitindo monitorar matrículas, transferências e histórico escolar de forma integrada. O sucesso da iniciativa foi reconhecido com o Prêmio Inovação em Gestão Educacional do MEC em 2008, mostrando que os benefícios da centralização de dados são conhecidos há muito tempo.59  
* **Autazes (AM):** Um exemplo mais recente, o município adotou o software livre i-Educar com o objetivo explícito de alcançar uma gestão mais eficiente e baseada em dados, citando especificamente a otimização do preenchimento do Censo Escolar como uma das metas.43

Esses casos demonstram que os benefícios da digitalização vão muito além do simples cumprimento de uma obrigação federal. Eles resultam em melhorias tangíveis na gestão pedagógica, na otimização de recursos e na agilidade administrativa. O projeto de integração com o SGP deve ser visto não apenas como uma iniciativa de conformidade, mas como uma oportunidade para reavaliar e aprimorar todos os processos de gestão escolar.  
---

## **Seção 7: Recomendações Estratégicas e Próximos Passos**

### **7.1. Síntese das Recomendações para Adoção Tecnológica e Processual**

Com base na análise detalhada, são apresentadas as seguintes recomendações estratégicas para a secretaria municipal de educação:

* **Recomendação 1 (Estratégica): Priorizar a adesão e integração com a Plataforma MEC Gestão Presente.** Esta deve ser a principal iniciativa de modernização tecnológica. A ação alinha o município à estratégia nacional de interoperabilidade, resolve os desafios da matrícula e do Censo, e prepara a rede para futuras políticas educacionais digitais.  
* **Recomendação 2 (Operacional \- Matrícula): Implementar um projeto piloto para testar a consulta de alunos via API do SGP.** No próximo ciclo de matrículas, selecionar uma ou mais escolas para utilizar a funcionalidade de consulta por CPF, validando os benefícios e ajustando os processos antes da expansão para toda a rede.  
* **Recomendação 3 (Operacional \- Censo): Adotar um modelo de sincronização contínua de dados com o SGP.** Iniciar o desenvolvimento da integração para enviar dados de alunos, turmas e profissionais de forma regular e automatizada, utilizando os *endpoints* de lote da API, com o objetivo de, a médio prazo, eliminar a dependência do processo manual de migração do Educacenso.  
* **Recomendação 4 (Tecnológica): Avaliar o sistema de gestão escolar atual e o mercado.** Realizar um diagnóstico técnico do SGE em uso para determinar a viabilidade e o custo de sua adaptação para integrar-se à API do SGP. Em paralelo, iniciar um processo de avaliação de soluções de mercado (comerciais e de código aberto), exigindo dos fornecedores um *roadmap* claro para a integração com o SGP.

### **7.2. Proposta de um Plano de Ação Fásico**

Para traduzir as recomendações em ações concretas, sugere-se o seguinte plano de implementação, dividido em fases:

* **Fase 1 \- Fundações (Curto Prazo: 1-3 meses):**  
  * **Ação:** Concluir o processo administrativo de adesão ao SGP (e opcionalmente ao GPE) via portal SIMEC.  
  * **Ação:** Formar um grupo de trabalho multidisciplinar envolvendo representantes das áreas de Educação (gestão, secretaria escolar), Tecnologia da Informação e Jurídico.  
  * **Ação:** Conduzir a avaliação técnica do SGE atual e iniciar a prospecção de soluções de mercado.  
* **Fase 2 \- Desenvolvimento e Testes (Médio Prazo: 4-9 meses):**  
  * **Ação:** Com base na decisão da Fase 1, iniciar o desenvolvimento (interno ou contratado) da integração com a API do SGP.  
  * **Ação:** Realizar testes exaustivos da integração no ambiente de homologação fornecido pelo MEC.  
  * **Ação:** Executar o projeto piloto de matrícula otimizada nas escolas selecionadas.  
* **Fase 3 \- Implantação e Expansão (Longo Prazo: 10-18 meses):**  
  * **Ação:** Realizar a implantação da integração em todas as escolas da rede municipal.  
  * **Ação:** Estabelecer e formalizar os novos processos baseados na sincronização contínua de dados.  
  * **Ação:** Conduzir treinamentos para todos os usuários dos sistemas (equipes de secretaria, gestores) e monitorar continuamente os indicadores de desempenho da nova solução.

### **7.3. Conclusão: O Imperativo Estratégico de Alinhamento à Transformação Digital da Educação Nacional**

A modernização da gestão educacional municipal deixou de ser uma opção e tornou-se um imperativo estratégico. A análise demonstra que o Ministério da Educação estabeleceu um caminho claro para o futuro da gestão de dados através da Plataforma MEC Gestão Presente e sua API. A integração a este ecossistema não representa apenas uma melhoria técnica pontual, mas um alinhamento fundamental com a direção para a qual a educação pública brasileira está se movendo. A inação resultará em uma crescente defasagem tecnológica, perpetuando ineficiências e dificultando o acesso a futuras políticas e recursos federais. Por outro lado, a ação proativa, seguindo o roteiro proposto, posicionará o município como um líder em gestão educacional moderna e baseada em dados, otimizando a alocação de recursos, melhorando os serviços prestados aos cidadãos e, em última análise, contribuindo para a qualidade da educação oferecida a seus estudantes.

#### **Works cited**

1. Assessoria de Informações Educacionais \- dados escolares | Portal PMC \- Campinas, accessed September 23, 2025, [http://portal-api.campinas.sp.gov.br/servico/assessoria-de-informacoes-educacionais-dados-escolares](http://portal-api.campinas.sp.gov.br/servico/assessoria-de-informacoes-educacionais-dados-escolares)  
2. \#MECAoVivo | Contextualização dos dados do Censo Escolar 2024 \- YouTube, accessed September 23, 2025, [https://www.youtube.com/watch?v=sJRhLSUyM3k](https://www.youtube.com/watch?v=sJRhLSUyM3k)  
3. base de dados | metadados | Inep | educação básica \- IBGE | Comitê de Estatísticas Sociais, accessed September 23, 2025, [https://ces.ibge.gov.br/base-de-dados/metadados/inep/educacao-basica.html](https://ces.ibge.gov.br/base-de-dados/metadados/inep/educacao-basica.html)  
4. Etapas e Instruções Gerais para a Migração no Sistema ..., accessed September 23, 2025, [https://download.inep.gov.br/educacao\_basica/educacenso/migracao/2023/etapas\_e\_instrucoes\_gerais\_para\_a\_migracao\_no\_educacenso\_2025.pdf](https://download.inep.gov.br/educacao_basica/educacenso/migracao/2023/etapas_e_instrucoes_gerais_para_a_migracao_no_educacenso_2025.pdf)  
5. Para importar a base de dados para o SETE é necessário primeiramente exportá-la do sistema Educacenso do INEP. Para isso, siga as seguintes instruções, accessed September 23, 2025, [https://www.fnde.gov.br/sete/src/renderer/modules/censo/censo-importar-view.html](https://www.fnde.gov.br/sete/src/renderer/modules/censo/censo-importar-view.html)  
6. Entenda a decisão do MEC de barrar divulgação de dados de alfabetização, accessed September 23, 2025, [https://www.portaldoholanda.com.br/brasil/entenda-decisao-do-mec-de-barrar-divulgacao-de-dados-de-alfabetizacao](https://www.portaldoholanda.com.br/brasil/entenda-decisao-do-mec-de-barrar-divulgacao-de-dados-de-alfabetizacao)  
7. Transformação Digital — Ministério da Educação \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/transformacao-digital](https://www.gov.br/mec/pt-br/transformacao-digital)  
8. Ministério da Educação \- A \- SinTSE, accessed September 23, 2025, [https://sintse.tse.jus.br/documentos/2025/Abr/3/destaques-museu-arquivo-historia-educacao-cultura-e-biblioteca-geral/portaria-no-234-de-2-de-abril-de-2025-institui-o-mec-gestao-presente-plataforma-de-dados-da-educacao](https://sintse.tse.jus.br/documentos/2025/Abr/3/destaques-museu-arquivo-historia-educacao-cultura-e-biblioteca-geral/portaria-no-234-de-2-de-abril-de-2025-institui-o-mec-gestao-presente-plataforma-de-dados-da-educacao)  
9. Portaria institui a plataforma de dados MEC Gestão Presente \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/assuntos/noticias/2025/abril/portaria-institui-a-plataforma-de-dados-mec-gestao-presente](https://www.gov.br/mec/pt-br/assuntos/noticias/2025/abril/portaria-institui-a-plataforma-de-dados-mec-gestao-presente)  
10. Sistema Gestão Presente — Ministério da Educação \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/mec-gestao-presente/sistema-gestao-presente](https://www.gov.br/mec/pt-br/mec-gestao-presente/sistema-gestao-presente)  
11. Plataforma que reúne dados da educação básica, lançada pelo MEC, foi desenvolvida pelo NEES, accessed September 23, 2025, [https://www.nees.ufal.br/plataforma-reune-dados-da-educacao-basica-lancada-pelo-mec-desenvolvida-pelo-nees/](https://www.nees.ufal.br/plataforma-reune-dados-da-educacao-basica-lancada-pelo-mec-desenvolvida-pelo-nees/)  
12. MEC Gestão Presente — Ministério da Educação \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/acesso-a-informacao/perguntas-frequentes/mec-gestao-presente](https://www.gov.br/mec/pt-br/acesso-a-informacao/perguntas-frequentes/mec-gestao-presente)  
13. Perguntas Frequentes: Pé-de-Meia \- Portal da Transparência, accessed September 23, 2025, [https://portaldatransparencia.gov.br/pe-de-meia](https://portaldatransparencia.gov.br/pe-de-meia)  
14. Gestão Presente na Escola — Ministério da Educação \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/mec-gestao-presente/gestao-presente-na-escola](https://www.gov.br/mec/pt-br/mec-gestao-presente/gestao-presente-na-escola)  
15. MEC seleciona 800 municípios para uso do MEC Gestão Presente ..., accessed September 23, 2025, [https://www.gov.br/mec/pt-br/assuntos/noticias/2025/julho/mec-seleciona-800-municipios-para-uso-do-mec-gestao-presente](https://www.gov.br/mec/pt-br/assuntos/noticias/2025/julho/mec-seleciona-800-municipios-para-uso-do-mec-gestao-presente)  
16. MEC seleciona 800 municípios para o Gestão Presente na Escola, accessed September 23, 2025, [https://radardigitalbrasilia.com.br/educacao/mec-seleciona-800-municipios-para-o-gestao-presente-na-escola/](https://radardigitalbrasilia.com.br/educacao/mec-seleciona-800-municipios-para-o-gestao-presente-na-escola/)  
17. MEC lança plataforma de governo digital para a educação básica \- Apufsc-Sindical, accessed September 23, 2025, [https://www.apufsc.org.br/2025/04/03/mec-lanca-plataforma-de-governo-digital-para-a-educacao-basica/](https://www.apufsc.org.br/2025/04/03/mec-lanca-plataforma-de-governo-digital-para-a-educacao-basica/)  
18. MEC Gestão Presente — Ministério da Educação \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec%FD/pt-br/acesso-a-informacao/perguntas-frequentes/mec-gestao-presente](https://www.gov.br/mec%FD/pt-br/acesso-a-informacao/perguntas-frequentes/mec-gestao-presente)  
19. PGT \- TED 11476 v.2\_novo contrato, accessed September 23, 2025, [https://pncp.gov.br/pncp-api/v1/orgaos/24464109000148/compras/2024/110/arquivos/2](https://pncp.gov.br/pncp-api/v1/orgaos/24464109000148/compras/2024/110/arquivos/2)  
20. Gestão Presente: Manual para o envio de dados ao sistema de operação Pé-de-Meia \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/media/manual-sgp.pdf](https://www.gov.br/mec/pt-br/media/manual-sgp.pdf)  
21. Manual para envio de dados a sistema \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/pe-de-meia/manualSGP.pdf](https://www.gov.br/mec/pt-br/pe-de-meia/manualSGP.pdf)  
22. NEES desenvolve, em parceria com MEC, um sistema para reunir dados dos estudantes da educação básica, accessed September 23, 2025, [https://www.nees.ufal.br/nees-desenvolve-em-parceria-com-mec-um-sistema-para-reunir-dados-dos-estudantes-da-educacao-basica/](https://www.nees.ufal.br/nees-desenvolve-em-parceria-com-mec-um-sistema-para-reunir-dados-dos-estudantes-da-educacao-basica/)  
23. CMDE API Documentation, accessed September 23, 2025, [https://api-cmde.gestaopresente.mec.gov.br/v1/documentation](https://api-cmde.gestaopresente.mec.gov.br/v1/documentation)  
24. 4° Encontro MEC Gestão Presente: Gestão de Dados no SGP \- Estudantes (parte II), accessed September 23, 2025, [https://www.youtube.com/watch?v=Ewgf8EWwnR4](https://www.youtube.com/watch?v=Ewgf8EWwnR4)  
25. \#MECAoVivo | 7º Encontro MEC Gestão Presente: Envio de Dados ..., accessed September 23, 2025, [https://www.youtube.com/live/irhRd48SINE](https://www.youtube.com/live/irhRd48SINE)  
26. \#MECAoVivo | 7º Encontro MEC Gestão Presente: Envio de Dados por API \- YouTube, accessed September 23, 2025, [https://www.youtube.com/watch?v=irhRd48SINE](https://www.youtube.com/watch?v=irhRd48SINE)  
27. manual para envio de dados ao sistema \- AWS, accessed September 23, 2025, [https://planilhas-compartilhadas-pe-de-meia.s3.amazonaws.com/planilhas/Manual+Pe-de-Meia+Sistema+Gestao+Presente+V.1.pdf](https://planilhas-compartilhadas-pe-de-meia.s3.amazonaws.com/planilhas/Manual+Pe-de-Meia+Sistema+Gestao+Presente+V.1.pdf)  
28. Plataforma MEC Gestão Presente vai unificar dados dos estudantes \- YouTube, accessed September 23, 2025, [https://www.youtube.com/watch?v=Wt9jhe66v\_M](https://www.youtube.com/watch?v=Wt9jhe66v_M)  
29. Jornada do Estudante \- Pé de Meia \- Portal de Atendimento \- Secretaria da Educação do Estado de São Paulo, accessed September 23, 2025, [https://atendimento.educacao.sp.gov.br/knowledgebase/article/SED-08105/pt-br](https://atendimento.educacao.sp.gov.br/knowledgebase/article/SED-08105/pt-br)  
30. Jornada do Estudante – Apps no Google Play, accessed September 23, 2025, [https://play.google.com/store/apps/details?id=br.gov.mec.jornada.estudante\&hl=pt](https://play.google.com/store/apps/details?id=br.gov.mec.jornada.estudante&hl=pt)  
31. Jornada do Estudante: o que é e como funciona o aplicativo do MEC? \- Mobills, accessed September 23, 2025, [https://www.mobills.com.br/blog/aplicativos/aplicativo-jornada-do-estudante/](https://www.mobills.com.br/blog/aplicativos/aplicativo-jornada-do-estudante/)  
32. Jornada do Estudante na App Store, accessed September 23, 2025, [https://apps.apple.com/br/app/jornada-do-estudante/id1622441145](https://apps.apple.com/br/app/jornada-do-estudante/id1622441145)  
33. Jornada do Estudante: Tudo sobre o App do Pé-de-Meia | Blog Acordo Certo, accessed September 23, 2025, [https://www.acordocerto.com.br/blog/jornada-do-estudante/](https://www.acordocerto.com.br/blog/jornada-do-estudante/)  
34. Lançado o portal da nova identidade estudantil \- Serpro, accessed September 23, 2025, [https://www.serpro.gov.br/menu/noticias/noticias-2019/lancado-portal-nova-identidade-estudantil](https://www.serpro.gov.br/menu/noticias/noticias-2019/lancado-portal-nova-identidade-estudantil)  
35. Projeto do MEC, carteirinha digital deve morrer antes mesmo de nascer | Guia do Estudante, accessed September 23, 2025, [https://guiadoestudante.abril.com.br/atualidades/projeto-do-mec-carteirinha-digital-deve-morrer-antes-mesmo-de-nascer/](https://guiadoestudante.abril.com.br/atualidades/projeto-do-mec-carteirinha-digital-deve-morrer-antes-mesmo-de-nascer/)  
36. MEC lança app e ID Estudantil começa a ser emitida gratuitamente | ABMES, accessed September 23, 2025, [https://abmes.org.br/noticias/detalhe/3588/mec-lanca-app-e-id-estudantil-comeca-a-ser-emitida-gratuitamente](https://abmes.org.br/noticias/detalhe/3588/mec-lanca-app-e-id-estudantil-comeca-a-ser-emitida-gratuitamente)  
37. A legítima Carteira de Estudante 2025 \- UNE, accessed September 23, 2025, [https://www.une.org.br/lp/carteira-de-estudante-oficial/](https://www.une.org.br/lp/carteira-de-estudante-oficial/)  
38. Carteirinha de Estudante 2025: O Tutorial mais COMPLETO e ATUALIZADO que você vai ver\! \- YouTube, accessed September 23, 2025, [https://www.youtube.com/watch?v=sQznab6Sz5g](https://www.youtube.com/watch?v=sQznab6Sz5g)  
39. Direito a Meia entrada estudantil em 2025 \- ANPG, accessed September 23, 2025, [https://www.anpg.org.br/2022/05/carteira-de-estudante-direito-a-meia-entrada-em-2025/](https://www.anpg.org.br/2022/05/carteira-de-estudante-direito-a-meia-entrada-em-2025/)  
40. Como Comprovar o Direito à Meia-Entrada em 2025 \- UNE, accessed September 23, 2025, [https://www.une.org.br/noticias/como-comprovar-o-direito-a-meia-entrada-em-2025](https://www.une.org.br/noticias/como-comprovar-o-direito-a-meia-entrada-em-2025)  
41. LAYOUT DO ARQUIVO DE IMPORTAÇÃO/EXPORTAÇÃO EDUCACENSO 2014 – Versão 3, accessed September 23, 2025, [https://download.inep.gov.br/educacao\_basica/educacenso/migracao/2014/layout\_de\_migracao\_2014.pdf](https://download.inep.gov.br/educacao_basica/educacenso/migracao/2014/layout_de_migracao_2014.pdf)  
42. ETAPAS E INSTRUÇÕES GERAIS PARA A MIGRAÇÃO NO SISTEMA EDUCACENSO, accessed September 23, 2025, [https://download.inep.gov.br/areas\_de\_atuacao/Migracao\_do\_Educacenso\_2022\_Situacao\_do\_Aluno\_2023\_02\_14.pdf](https://download.inep.gov.br/areas_de_atuacao/Migracao_do_Educacenso_2022_Situacao_do_Aluno_2023_02_14.pdf)  
43. i-Educar · O i-Educar é um software livre e público totalmente on ..., accessed September 23, 2025, [https://ieducar.org/](https://ieducar.org/)  
44. Riachão das Neves revolucionou a gestão educacional com o SIGEM, accessed September 23, 2025, [https://imap.org.br/riachao-das-neves-revolucionou-a-gestao-educacional-com-o-sigem/](https://imap.org.br/riachao-das-neves-revolucionou-a-gestao-educacional-com-o-sigem/)  
45. Ergon Sistemas \- Softwares para Gestão Escolar | Gestão Educacional, accessed September 23, 2025, [https://ergonsistemas.com.br/](https://ergonsistemas.com.br/)  
46. MEC Gestão Presente — Ministério da Educação \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/mec-gestao-presente](https://www.gov.br/mec/pt-br/mec-gestao-presente)  
47. Passo a passo – Adesão SGP e GPE \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/passoapassoadesao.pdf](https://www.gov.br/mec/pt-br/mec-gestao-presente/documentos/passoapassoadesao.pdf)  
48. MANUAL PARA ENVIO DE DADOS AO SISTEMA \- Portal Gov.br, accessed September 23, 2025, [https://www.gov.br/mec/pt-br/pe-de-meia/1210.manual\_SGP\_V11\_a.pdf](https://www.gov.br/mec/pt-br/pe-de-meia/1210.manual_SGP_V11_a.pdf)  
49. Pé-de-meia: tudo sobre o incentivo financeiro para alunos \- Aprova Total, accessed September 23, 2025, [https://aprovatotal.com.br/programa-pe-de-meia/](https://aprovatotal.com.br/programa-pe-de-meia/)  
50. Manuals GP | PDF \- Scribd, accessed September 23, 2025, [https://pt.scribd.com/document/739682920/Manuals-Gp](https://pt.scribd.com/document/739682920/Manuals-Gp)  
51. LGPD Nas Escolas: Os Impactos nos Procedimentos e Cotidiano \- OAB Campinas, accessed September 23, 2025, [https://oabcampinas.org.br/lgpd-nas-escolas-os-impactos-nos-procedimentos-e-cotidiano/](https://oabcampinas.org.br/lgpd-nas-escolas-os-impactos-nos-procedimentos-e-cotidiano/)  
52. Projeto altera lei de dados pessoais para permitir compartilhamento de informações do Censo Escolar e do Enem \- Notícias \- Portal da Câmara dos Deputados, accessed September 23, 2025, [https://www.camara.leg.br/noticias/863023-projeto-altera-lei-de-dados-pessoais-para-permitir-compartilhamento-de-informacoes-do-censo-escolar-e-do-enem/](https://www.camara.leg.br/noticias/863023-projeto-altera-lei-de-dados-pessoais-para-permitir-compartilhamento-de-informacoes-do-censo-escolar-e-do-enem/)  
53. 179 O tratamento de dados de crianças e adolescentes no âmbito da Lei Geral de Proteção de Dados brasileira \- TJSP, accessed September 23, 2025, [https://www.tjsp.jus.br/download/EPM/Publicacoes/CadernosJuridicos/ii\_8\_o\_tratamento\_de\_dados.pdf?d=637250348921212362](https://www.tjsp.jus.br/download/EPM/Publicacoes/CadernosJuridicos/ii_8_o_tratamento_de_dados.pdf?d=637250348921212362)  
54. Acordo de Cooperação Técnica (ACT) \- Interlegis \- Senado Federal, accessed September 23, 2025, [https://www12.senado.leg.br/interlegis/central-de-atendimento/acordo-de-cooperacao-tecnica](https://www12.senado.leg.br/interlegis/central-de-atendimento/acordo-de-cooperacao-tecnica)  
55. Acordos de Cooperação Técnica \- PJe \- CSJT, accessed September 23, 2025, [https://www.csjt.jus.br/web/pje/legislacao/acordos-de-cooperacao-tecnica](https://www.csjt.jus.br/web/pje/legislacao/acordos-de-cooperacao-tecnica)  
56. CIEB firma Acordo de Cooperação Técnica com o MEC, accessed September 23, 2025, [https://cieb.net.br/cieb-firma-acordo-de-cooperacao-tecnica-com-o-mec/](https://cieb.net.br/cieb-firma-acordo-de-cooperacao-tecnica-com-o-mec/)  
57. MEC celebra acordo de Cooperação Técnica \+PNE e TC Educa e lança Programa Primeira Infância na Escola \- Undime, accessed September 23, 2025, [https://undime.org.br/noticia/20-05-2022-11-11-mec-celebra-acordo-de-cooperacao-tecnica-pne-e-tc-educa-e-lanca-programa-primeira-infancia-na-escola](https://undime.org.br/noticia/20-05-2022-11-11-mec-celebra-acordo-de-cooperacao-tecnica-pne-e-tc-educa-e-lanca-programa-primeira-infancia-na-escola)  
58. Case de sucesso: sistema de gestão escolar com treinamento \- Sponte, accessed September 23, 2025, [https://www.sponte.com.br/blog/case-de-sucesso-sistema-de-gestao-escolar-com-treinamento](https://www.sponte.com.br/blog/case-de-sucesso-sistema-de-gestao-escolar-com-treinamento)  
59. Cidade recebe prêmio do mec por sistema de gestão escolar | Notícia | Prefeitura de Santos, accessed September 23, 2025, [https://www.santos.sp.gov.br/?q=noticia/cidade-recebe-premio-do-mec-por-sistema-de-gestao-escolar](https://www.santos.sp.gov.br/?q=noticia/cidade-recebe-premio-do-mec-por-sistema-de-gestao-escolar)