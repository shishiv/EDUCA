# Documento de Requisitos Simplificado - Sistema de Gestão Escolar

Este documento descreve os requisitos funcionais e não funcionais para as principais entidades de um Sistema de Gestão Escolar.

---

## 1. Entidades do Sistema

Foram selecionadas 5 entidades principais para esta análise:

1.  **Aluno**: Representa o estudante matriculado na instituição.
2.  **Escola**: Representa a unidade de ensino.
3.  **Turma**: Agrupamento de alunos para fins pedagógicos.
4.  **Frequência**: Controle de presença dos alunos nas aulas.
5.  **Diário de Classe**: Registro de aulas, conteúdos e notas.

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

---

## 3. Requisitos Não Funcionais Gerais

*   **RNF-007 (Segurança)**: O acesso aos dados dos alunos e às notas deve ser restrito a usuários autenticados e autorizados (professores, administradores e responsáveis). Toda a comunicação com o servidor deve ser criptografada (HTTPS).
*   **RNF-008 (Performance)**: As consultas de alunos e a listagem de turmas devem ser concluídas em menos de 2 segundos. A geração de relatórios não deve exceder 15 segundos.
*   **RNF-009 (Usabilidade)**: A interface do sistema deve ser intuitiva e responsiva, adaptando-se a diferentes tamanhos de tela (desktop, tablets e smartphones).
*   **RNF-010 (Disponibilidade)**: O sistema deve ter uma disponibilidade de 99.5% durante o horário de expediente escolar.
*   **RNF-011 (Tecnologia)**: O sistema deve utilizar um banco de dados relacional (PostgreSQL) e o backend deve ser desenvolvido em TypeScript/Node.js, conforme a estrutura do projeto `gestao_fronteira`.

