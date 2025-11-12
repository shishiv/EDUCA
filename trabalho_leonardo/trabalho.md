# Documento de Requisitos Simplificado - Sistema de Gestão Escolar

Este documento descreve os requisitos funcionais e não funcionais para as principais entidades de um Sistema de Gestão Escolar.

---

## 1. Entidades do Sistema

Foram selecionadas 8 entidades principais para esta análise:

1.  **Aluno**: Representa o estudante matriculado na instituição.
2.  **Escola**: Representa a unidade de ensino.
3.  **Turma**: Agrupamento de alunos para fins pedagógicos.
4.  **Frequência**: Controle de presença dos alunos nas aulas.
5.  **Diário de Classe**: Registro de aulas, conteúdos e notas.
6.  **Matrícula**: Relação formal que vincula um aluno a uma turma em um determinado ano letivo e controla seu status.
7.  **Relatório**: Saída consolidada (frequência, boletim) gerada a partir dos registros operacionais do sistema.
8.  **Usuário**: Representa os perfis autenticados (Administrador, Secretaria, Professor, Responsável) que executam as operações.

---

## 2. Requisitos por Entidade

### 2.1. Aluno

*   **RF-001**: O sistema deve permitir que um usuário com perfil "Administrador" ou "Secretaria" cadastre um novo aluno, exigindo os seguintes campos obrigatórios: Nome Completo, Data de Nascimento, CPF (com validação de formato e unicidade), Nome do Responsável Legal e Telefone de Contato do Responsável. Campos opcionais incluem: Endereço, E-mail do Responsável, e informações médicas relevantes.
*   **RF-002**: O sistema deve fornecer uma interface de busca de alunos que permita filtros por Nome (busca parcial), CPF ou Número de Matrícula (busca exata). Os resultados devem ser paginados, exibindo 20 alunos por página para otimizar a performance.
*   **RF-003**: O sistema deve permitir a edição de todas as informações cadastrais do aluno, exceto o Número de Matrícula. A inativação de um aluno só deve ser permitida se ele não possuir matrículas ativas, e a ação deve ser reversível (reativação do cadastro).
*   **RNF-001 (Privacidade e Proteção de Dados)**: Em conformidade com a Lei Geral de Proteção de Dados (LGPD), todos os dados pessoais do aluno devem ser tratados com a finalidade específica de gestão acadêmica. O CPF e as informações médicas devem ser criptografados em repouso (no banco de dados) utilizando o algoritmo AES-256. O acesso a esses dados brutos deve ser restrito a perfis de alta hierarquia (Administrador) e todas as consultas a dados sensíveis devem ser registradas em log de auditoria.
*   **RNF-002 (Consentimento - LGPD)**: Durante o processo de matrícula ou cadastro, o sistema deve exibir e exigir a aceitação de um Termo de Consentimento para o tratamento dos dados do aluno e do seu responsável, explicando de forma clara a finalidade do uso das informações. A comprovação do consentimento deve ser armazenada de forma segura.

### 2.2. Escola

*   **RF-004**: O sistema deve permitir o cadastro de novas escolas, incluindo nome, endereço, contato, e diretor.
*   **RF-005**: O sistema deve listar todas as escolas cadastradas.
*   **RNF-003 (Escalabilidade)**: O sistema deve ser capaz de gerenciar os dados de até 9 escolas simultaneamente sem degradação de performance.

### 2.3. Turma

*   **RF-006**: O sistema deve permitir a criação de turmas, associando-as a uma escola e a um ano letivo.
*   **RF-007**: O sistema deve permitir a matrícula de alunos em uma turma.
*   **RF-008**: O sistema deve permitir a visualização dos alunos de uma determinada turma.
*   **RNF-004 (Integridade)**: O sistema não deve permitir a exclusão de uma turma se houver alunos ativamente matriculados nela, garantindo a consistência dos dados.

### 2.4. Frequência

*   **RF-009**: O sistema deve permitir que professores registrem a frequência (presença ou ausência) dos alunos em cada aula.
*   **RF-010**: O sistema deve gerar relatórios de frequência por aluno, turma ou período.
*   **RNF-005 (Auditoria)**: Todas as alterações no registro de frequência de um aluno devem ser rastreáveis, registrando qual usuário fez a modificação, quando e qual foi a mudança.

### 2.5. Diário de Classe

*   **RF-011**: O sistema deve permitir que professores registrem o conteúdo ministrado em cada aula.
*   **RF-012**: O sistema deve permitir o lançamento de notas e avaliações para os alunos de uma turma.
*   **RF-013**: O sistema deve consolidar as notas para gerar um boletim final.
*   **RNF-006 (Confiabilidade)**: O sistema deve garantir que o cálculo das médias e da situação final do aluno seja executado sem erros, com uma precisão de duas casas decimais.


### 2.6. Matrícula

*   **RF-014**: O sistema deve permitir registrar matrículas associando um aluno ativo a uma turma específica e a um ano letivo, armazenando datas de ingresso e situação inicial.
*   **RF-015**: O sistema deve permitir atualizar a situação da matrícula (ativa, trancada, concluída, cancelada) mantendo histórico de alterações e impedindo cancelamento se existirem registros no Diário de Classe.
*   **RNF-012 (Consistência de Matrículas)**: Cada alteração em uma matrícula deve registrar o usuário responsável e um carimbo de tempo, possibilitando auditoria cruzada com RNF-004 e RNF-005.

### 2.7. Relatório

*   **RF-016**: O sistema deve gerar relatórios de frequência por aluno, turma ou período a partir dos registros de frequência consolidados, preservando os identificadores das aulas que compõem o resultado.
*   **RF-017**: O sistema deve gerar boletins consolidados por aluno utilizando os lançamentos de nota do Diário de Classe, exibindo médias e situação final calculada em RF-013.
*   **RNF-013 (Rastreabilidade de Relatórios)**: Todo relatório deve armazenar metadados (tipo, filtros, usuário emissor, timestamp) e permitir reprocessamento para confirmação dos dados de origem.

### 2.8. Usuário

*   **RF-018**: O sistema deve permitir que Administradores cadastrem, editem e desativem usuários, definindo perfis (Administrador, Secretaria, Professor, Responsável) e credenciais de acesso.
*   **RF-019**: O sistema deve autenticar usuários e aplicar controles de autorização por perfil antes de liberar funcionalidades como cadastro de alunos, registro de frequência ou geração de relatórios.
*   **RNF-014 (Auditoria de Usuários)**: Toda operação sensível deve registrar o identificador do usuário autenticado, alimentando um log de auditoria consultável para fins de LGPD.

---

## 3. Requisitos Não Funcionais Gerais

*   **RNF-007 (Segurança)**: O acesso aos dados dos alunos e às notas deve ser restrito a usuários autenticados e autorizados (professores, administradores e responsáveis). Toda a comunicação com o servidor deve ser criptografada (HTTPS).
*   **RNF-008 (Performance)**: As consultas de alunos e a listagem de turmas devem ser concluídas em menos de 2 segundos. A geração de relatórios não deve exceder 15 segundos.
*   **RNF-009 (Usabilidade)**: A interface do sistema deve ser intuitiva e responsiva, adaptando-se a diferentes tamanhos de tela (desktop, tablets e smartphones).
*   **RNF-010 (Disponibilidade)**: O sistema deve ter uma disponibilidade de 99.5% durante o horário de expediente escolar.
*   **RNF-011 (Tecnologia)**: O sistema deve utilizar um banco de dados relacional (PostgreSQL) e o backend deve ser desenvolvido em TypeScript/Node.js, conforme a estrutura do projeto `gestao_fronteira`.

---

## 4. Diagramas ASCII

### 4.1. Diagrama de Casos de Uso

```
           +----------------+              +----------------+
           | Administrador  |              |   Secretaria   |
           +----------------+              +----------------+
                 |    \                         /    |
                 |     \                       /     |
                 |      \                     /      |
                 v       v                   v       v
        +----------------------------------------------------------------+
        |                  Sistema de Gestao Escolar                     |
        |----------------------------------------------------------------|
        | (Cadastrar Aluno)                    (Registrar Frequencia)    |
        | (Buscar / Editar Aluno)             (Gerar Relatorio Frequencia)|
        | (Inativar / Reativar Aluno)         (Registrar Conteudo de Aula)|
        | (Gerir Consentimento LGPD)          (Lancamento de Notas)      |
        | (Cadastrar Escola)                  (Consolidar Boletim Final) |
        | (Listar Escolas)                    (Criar Turma)              |
        | (Matricular / Atualizar Matricula)  (Listar Alunos da Turma)   |
        | (Emitir Relatorios)                 (Gerenciar Usuarios)       |
        +----------------------------------------------------------------+
                                                     ^          ^
                                                     |          |
                                                     |          |
                                             +----------------+ |
                                             |   Professor    | |
                                             +----------------+ |
                                                     \          |
                                                      \         |
                                                       +--------+
```

*Setas indicam quais atores iniciam cada caso de uso dentro do limite do sistema.*

### 4.2. Diagrama de Classes

```
+-------------+       1       *     +-------------+       1       *     +------------------+
|   Escola    |---------------------|    Turma    |---------------------|  DiarioDeClasse  |
+-------------+                     +-------------+                     +------------------+
| idEscola    |                     | idTurma     |                     | idDiario         |
| nome        |                     | anoLetivo   |                     | dataAula         |
| endereco    |                     | turno       |                     | conteudo         |
| diretor     |                     | status      |                     | professor        |
+-------------+                     +-------------+                     +------------------+
                                        | 1..*
                                        v
                                  +-------------+
                                  |  Matricula  |
                                  +-------------+
                                  | idMatricula |
                                  | dataIngresso|
                                  | situacao    |
                                  +-------------+
                                  | +cancelar() |
                                  +-------------+
                                  /            \
                                 /              \
                                v                v
                        +-------------+   +----------------------+
                        |    Aluno    |   | RegistroFrequencia   |
                        +-------------+   +----------------------+
                        | idAluno     |   | idRegistro           |
                        | nomeComp.   |   | dataAula             |
                        | cpf(AES-256)|   | statusPresenca       |
                        | dataNasc    |   | usuarioAlteracao     |
                        | responsavel |   | timestampAuditoria   |
                        +-------------+   | usuarioAlteracao ->  |
                                \         |   Usuario.id         |
                                 \        +----------------------+
                                  v
                         +-------------------+
                         |  LancamentoNota   |
                         +-------------------+
                         | idLancamento      |
                         | avaliacao         |
                         | notaDecimal       |
                         | mediaCalculada    |
                         | criadoPor ->      |
                         |   Usuario.id      |
                         +-------------------+
                                  \
                                   \ utiliza
                                    v
                         +-----------------------+
                         |       Relatorio       |
                         +-----------------------+
                         | idRelatorio           |
                         | tipo/filtros          |
                         | emitidoPor ->Usuario  |
                         | fontes: Registro/Nota |
                         +-----------------------+
                                   ^
                                   |
                              +-----------+
                              |  Usuario  |
                              +-----------+
                              | idUsuario |
                              | nome      |
                              | perfil    |
                              | credHash  |
                              +-----------+
```

*O diagrama destaca as principais entidades, atributos críticos citados nos requisitos e multiplicidades entre Escola, Turma, Matrícula, Aluno, Diário de Classe, Registros de Frequência, Lançamentos de Nota, Relatórios e Usuários.*
