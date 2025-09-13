Visão Geral do MVP
O MVP terá como foco principal estabelecer uma base sólida para a gestão educacional digital, priorizando as funcionalidades que permitem o registro e acompanhamento fundamental de alunos e a operação básica do diário digital.
--------------------------------------------------------------------------------
Módulos Essenciais do MVP
Módulo 1: Gestão de Usuários e Acessos (RBAC)
Este módulo é a fundação para qualquer sistema de gestão, garantindo segurança e controle de quem pode acessar o quê
.
• Funcionalidades Essenciais:
    ◦ Criação e Gestão de Usuários: O Administrador do Sistema deverá ter a capacidade de criar e gerenciar as contas dos usuários (Coordenadores Pedagógicos, Diretores, Professores e Secretários)
.
    ◦ Login e Autenticação Segura: Implementação da Autenticação JWT via Supabase para garantir acesso robusto e seguro
.
    ◦ Controle de Acesso Baseado em Funções (RBAC): Assegurar que cada tipo de usuário tenha acesso apenas às funcionalidades e dados pertinentes ao seu papel. Inicialmente, focar nas permissões de:
        ▪ Administrador do Sistema: Acesso completo, gerencia todas as escolas e usuários
.
        ▪ Coordenador Pedagógico: Gerencia usuários da escola, visualiza dados de todas as turmas
.
        ▪ Diretor: Visualiza dados da escola, gerencia turmas
.
        ▪ Professor: Acesso para visualizar suas turmas e, posteriormente, registrar frequência
.
        ▪ Secretário: Acesso para visualizar dados básicos
.
• Justificativa: Essencial para configurar o ambiente do sistema e definir as hierarquias de acesso antes que as funcionalidades principais de dados educacionais sejam operadas.
Módulo 2: Cadastro de Escolas, Turmas e Alunos
Este é o módulo central para alcançar a meta de "cadastro de alunos funcional até o fim do mês"
.
• Funcionalidades Essenciais:
    ◦ Registro de Escolas: Cadastro de todas as escolas municipais de Fronteira, aproveitando a capacidade de Gestão Multi-escola do sistema
.
    ◦ Criação e Gestão de Turmas: Diretores e Coordenadores devem ser capazes de criar e gerenciar as turmas (ex: 1º ano A, 6º ano B) dentro de suas respectivas escolas
.
    ◦ Cadastro Completo de Alunos: Inserção de dados detalhados dos alunos e sua associação a turmas específicas
.
    ◦ Associação de Professores a Turmas: Vincular os professores às turmas em que lecionam
.
    ◦ Visualização de Alunos: Professores e diretores podem visualizar a lista de alunos de suas turmas.
• Justificativa: Permite o mapeamento inicial da estrutura educacional do município e atinge o objetivo principal de ter o cadastro de alunos ativo. Como Cristiane mencionou, "Acabou aquela história de ir lá contar os alunos"
, o sistema fará isso automaticamente.
Módulo 3: Diário Digital Básico - Controle de Frequência e Observações Essenciais
Este módulo concentra-se na funcionalidade mais crítica do diário: o registro diário de frequência, com um conjunto mínimo de observações e validações rigorosas.
• Funcionalidades Essenciais:
    ◦ Abertura de Aula e Marcação Diária de Presença/Falta: Professores devem ser capazes de "abrir a aula" e registrar a frequência diariamente para suas turmas
. A Cristiane enfatiza que "o diário ele é a frequência é diária, todo dia" e "não existe o esquecer"
.
    ◦ Fechamento da Chamada: No momento em que o professor aperta "Salvar Presença", o registro daquela aula/dia não consegue editar mais
. Se ele voltar, "ele perde o que ele fez"
. Isso é crucial para a integridade dos dados.
    ◦ Campo de Observações: Deve haver um campo para observações relevantes por bimestre, como a saída antecipada de um aluno
. Por exemplo, "Carla Peixota, a mãe dela buscou ela às 10 horas e ela foi embora", o que é de "extrema importância" para a segurança
.
    ◦ Registro Não-Retroativo: O professor não pode fazer nada retroativo em relação à presença, precisando de autorização de um especialista para abrir e colocar observações em casos específicos
.
    ◦ Suporte a Múltiplas Aulas: Para aulas dobradas, o professor precisará abrir duas aulas
. Professores de educação física e inglês terão seu próprio diário
.
• Justificativa: O diário é o "único documento oficial que a gente tem esse diário" para medir a frequência
, sendo "muito sério" e crucial para a "busca ativa e da segurança" dos alunos
.
Módulo 4: Relatórios Básicos de Frequência e Busca Ativa
Essencial para monitorar a frequência, identificar alunos em risco e preparar o sistema para futuras integrações com programas sociais.
• Funcionalidades Essenciais:
    ◦ Relatório de Frequência por Turma/Aluno: Visualização da porcentagem de frequência dos alunos por turma e individualmente
.
    ◦ Relatório Básico de Busca Ativa: Lista de alunos com frequência abaixo de um limiar predefinido (ex: 80%), diretamente do diário
.
    ◦ Exportação Básica de Dados: Capacidade de exportar relatórios básicos para PDF ou Excel
.
• Justificativa: Permite que as equipes da Secretaria de Educação e das escolas acompanhem a frequência e atuem proativamente na busca ativa, já que o diário é o documento oficial para isso
.
--------------------------------------------------------------------------------
Considerações Técnicas para o MVP
As tecnologias já definidas no README.md (Next.js 14, TypeScript, Tailwind CSS, Supabase, RLS)
são totalmente alinhadas com este MVP, garantindo:
• Segurança: Com Row Level Security (RLS) no banco de dados e validação de tipos com TypeScript
.
• Auditabilidade: A ideia de Myke é que "tudo seja auditável"
, e o sistema deve registrar quem entrou, o que fez e quando fez
.
• Responsividade: O sistema será "totalmente responsivo" para funcionar em desktop e mobile
, permitindo que o professor faça a chamada "muito rápido que você faz no celular"
.
-------------------------------------------------------------------------------- 