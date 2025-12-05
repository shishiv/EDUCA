/**
 * Script para criar o Questionário de Validação - Diário de Classe Digital
 *
 * COMO USAR:
 * 1. Acesse https://script.google.com
 * 2. Crie um novo projeto
 * 3. Cole este código inteiro
 * 4. Clique em "Executar" (botão play)
 * 5. Autorize o acesso quando solicitado
 * 6. O formulário será criado no seu Google Drive
 */

function criarFormularioDiarioDeClasse() {
  // Criar o formulário
  var form = FormApp.create('Questionário de Validação - Diário de Classe Digital');
  form.setDescription('Objetivo: Validar requisitos do sistema de Diário de Classe Digital com coordenadoras, professoras e Secretaria de Educação de Fronteira/MG.\n\nSuas respostas são essenciais para construirmos um sistema que realmente atenda às necessidades da rede municipal.');
  form.setConfirmationMessage('Obrigado pela participação! Suas respostas foram registradas com sucesso.');

  // ============================================
  // SEÇÃO 1: FREQUÊNCIA E PRESENÇA
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 1: Frequência e Presença')
    .setHelpText('Perguntas sobre como registrar presença dos alunos');

  // 1.1 Estados de Presença
  form.addMultipleChoiceItem()
    .setTitle('1.1 O sistema terá 3 estados: P (Presente), F (Falta), A (Atestado/Justificada). Existe algum outro estado que vocês usam no diário de papel?')
    .setChoiceValues(['Não, apenas esses 3', 'Sim (especificar abaixo)'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Sim" acima, qual outro estado?')
    .setRequired(false);

  // 1.2 Atestado e Bolsa Família
  form.addMultipleChoiceItem()
    .setTitle('1.2 Para o cálculo de frequência do Bolsa Família (mínimo 80%), como o atestado médico deve ser contabilizado?')
    .setChoiceValues([
      'Conta como PRESENÇA (não prejudica o aluno)',
      'Conta como FALTA (mas justificada)',
      'Não sei / Preciso verificar'
    ])
    .setRequired(true);

  // 1.3 Horário de Bloqueio
  form.addMultipleChoiceItem()
    .setTitle('1.3 O sistema vai travar a frequência automaticamente às 18:00 para garantir que não seja alterada depois. Esse horário está adequado?')
    .setChoiceValues([
      'Sim, 18:00 está bom',
      'Não, prefiro outro horário (especificar abaixo)',
      'Não deveria ter bloqueio automático'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se preferir outro horário, qual?')
    .setRequired(false);

  // 1.4 Exceções ao Bloqueio
  form.addMultipleChoiceItem()
    .setTitle('1.4 Quem pode desbloquear a frequência após as 18:00 em casos excepcionais?')
    .setChoiceValues([
      'Ninguém (frequência é imutável)',
      'Apenas o Diretor',
      'Diretor + Secretário da escola',
      'Secretaria Municipal de Educação'
    ])
    .setRequired(true);

  // ============================================
  // SEÇÃO 2: CONTEÚDO DA AULA
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 2: Conteúdo da Aula')
    .setHelpText('Perguntas sobre o que registrar em cada aula');

  // 2.1 Campos Obrigatórios
  form.addCheckboxItem()
    .setTitle('2.1 Quais campos devem ser OBRIGATÓRIOS para registrar uma aula? (marque todos que considera essenciais)')
    .setChoiceValues([
      'Data da aula',
      'Disciplina / Campo de Experiência',
      'Tema / Conteúdo',
      'Objetivo da aula',
      'Habilidades BNCC',
      'Metodologia (como foi ensinado)',
      'Recursos utilizados',
      'Observações'
    ])
    .setRequired(true);

  // 2.2 Habilidades BNCC
  form.addMultipleChoiceItem()
    .setTitle('2.2 Como as professoras devem registrar as habilidades da BNCC?')
    .setChoiceValues([
      'Selecionar de uma lista pronta (ex: EF01LP01, EF02MA03)',
      'Digitar o código manualmente',
      'Apenas descrever em texto livre',
      'Não precisa registrar habilidades BNCC'
    ])
    .setRequired(true);

  // 2.3 Aulas Duplas
  form.addMultipleChoiceItem()
    .setTitle('2.3 Quando o professor tem 2 ou 3 horários seguidos com a mesma turma, como deve registrar?')
    .setChoiceValues([
      'Um registro para cada horário (separado)',
      'Um único registro para toda a sequência',
      'Depende do professor decidir'
    ])
    .setRequired(true);

  // ============================================
  // SEÇÃO 3: AVALIAÇÃO E NOTAS
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 3: Avaliação e Notas')
    .setHelpText('Perguntas sobre o sistema de notas e avaliações');

  // 3.1 Sistema de Notas
  form.addMultipleChoiceItem()
    .setTitle('3.1 Qual sistema de notas é usado no Fundamental I (1º ao 5º ano)?')
    .setChoiceValues([
      'Bimestral (4 bimestres) com notas 0 a 10',
      'Trimestral (3 trimestres) com notas 0 a 10',
      'Conceitos (A, B, C, D)',
      'Outro (especificar abaixo)'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Outro", qual sistema?')
    .setRequired(false);

  // 3.2 Componentes da Nota
  form.addMultipleChoiceItem()
    .setTitle('3.2 A nota bimestral/trimestral é composta de quê?')
    .setChoiceValues([
      'Apenas uma nota final',
      'Prova + Trabalho + Participação (média)',
      'Várias avaliações que o professor define',
      'Outro (especificar abaixo)'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Outro", como funciona?')
    .setRequired(false);

  // 3.3 Recuperação
  form.addCheckboxItem()
    .setTitle('3.3 Existe sistema de recuperação? (marque todos que se aplicam)')
    .setChoiceValues([
      'Recuperação bimestral',
      'Recuperação semestral',
      'Recuperação anual (final)',
      'Não tem recuperação'
    ])
    .setRequired(true);

  // 3.4 Relatório Descritivo
  form.addMultipleChoiceItem()
    .setTitle('3.4 Para creches e pré-escolas, como é feito o relatório descritivo?')
    .setChoiceValues([
      'Texto livre sobre cada criança',
      'Modelo/template com tópicos definidos',
      'Parecer por Campo de Experiência da BNCC',
      'Outro (especificar abaixo)'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Outro", como funciona?')
    .setRequired(false);

  // 3.5 Periodicidade
  form.addMultipleChoiceItem()
    .setTitle('3.5 Com que frequência o relatório descritivo (Ed. Infantil) é feito?')
    .setChoiceValues([
      'Mensal',
      'Bimestral',
      'Semestral',
      'Anual'
    ])
    .setRequired(true);

  // ============================================
  // SEÇÃO 4: ROTINA DO PROFESSOR
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 4: Rotina do Professor')
    .setHelpText('Perguntas sobre como e quando o professor vai usar o sistema');

  // 4.1 Momento de Registro
  form.addMultipleChoiceItem()
    .setTitle('4.1 Em que momento o professor registra a frequência e conteúdo?')
    .setChoiceValues([
      'Durante a aula (em tempo real)',
      'No final de cada aula',
      'No final do dia (todas as aulas de uma vez)',
      'Varia conforme o professor'
    ])
    .setRequired(true);

  // 4.2 Dispositivo
  form.addMultipleChoiceItem()
    .setTitle('4.2 Qual dispositivo o professor mais usaria para acessar o sistema?')
    .setChoiceValues([
      'Tablet da escola',
      'Celular pessoal',
      'Computador da sala dos professores',
      'Varia conforme a escola'
    ])
    .setRequired(true);

  // 4.3 Internet
  form.addMultipleChoiceItem()
    .setTitle('4.3 Como é a qualidade da internet nas escolas?')
    .setChoiceValues([
      'Boa e estável em todas as escolas',
      'Boa na maioria, algumas têm problemas',
      'Instável em várias escolas',
      'Muito ruim / Frequentemente cai'
    ])
    .setRequired(true);

  // 4.4 Tempo
  form.addMultipleChoiceItem()
    .setTitle('4.4 Quanto tempo o professor tem disponível para registrar cada aula?')
    .setChoiceValues([
      'Menos de 1 minuto (muito corrido)',
      '1-3 minutos',
      '3-5 minutos',
      'Mais de 5 minutos'
    ])
    .setRequired(true);

  // ============================================
  // SEÇÃO 5: RELATÓRIOS
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 5: Relatórios e Documentos')
    .setHelpText('Perguntas sobre os relatórios que o sistema deve gerar');

  // 5.1 Relatórios Prioritários
  form.addCheckboxItem()
    .setTitle('5.1 Quais relatórios são mais importantes? (marque os 3 principais)')
    .setChoiceValues([
      'Frequência diária por turma',
      'Frequência mensal por aluno',
      'Lista de alunos faltosos (risco de evasão)',
      'Alunos do Bolsa Família abaixo de 80%',
      'Conteúdo ministrado por período',
      'Boletim individual do aluno',
      'Ata de resultados finais'
    ])
    .setRequired(true);

  // 5.2 Formato
  form.addCheckboxItem()
    .setTitle('5.2 Em que formato vocês precisam dos relatórios?')
    .setChoiceValues([
      'PDF (para imprimir)',
      'Excel (para editar)',
      'Não precisa exportar, só visualizar na tela'
    ])
    .setRequired(true);

  // 5.3 Assinaturas
  form.addMultipleChoiceItem()
    .setTitle('5.3 Os relatórios precisam de espaço para assinatura física?')
    .setChoiceValues([
      'Sim, professor + diretor',
      'Sim, apenas professor',
      'Não precisa de assinatura'
    ])
    .setRequired(true);

  // ============================================
  // SEÇÃO 6: CASOS ESPECIAIS
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 6: Casos Especiais')
    .setHelpText('Perguntas sobre situações específicas');

  // 6.1 Substituto
  form.addMultipleChoiceItem()
    .setTitle('6.1 Quando o professor titular falta, quem registra a frequência?')
    .setChoiceValues([
      'Professor substituto (se tiver)',
      'Diretor ou secretário da escola',
      'Fica em branco até o titular voltar',
      'Outro (especificar abaixo)'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Outro", como funciona?')
    .setRequired(false);

  // 6.2 Transferência
  form.addMultipleChoiceItem()
    .setTitle('6.2 Como tratar aluno que transfere no meio do ano?')
    .setChoiceValues([
      'Mantém histórico até a data da transferência',
      'Remove do diário da turma',
      'Outro (especificar abaixo)'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Outro", como funciona?')
    .setRequired(false);

  // 6.3 Necessidades Especiais
  form.addMultipleChoiceItem()
    .setTitle('6.3 Alunos com necessidades especiais têm algum tratamento diferente no diário?')
    .setChoiceValues([
      'Não, igual aos demais',
      'Sim, tem campo específico para observações',
      'Sim, tem avaliação adaptada',
      'Outro (especificar abaixo)'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se marcou "Outro", como funciona?')
    .setRequired(false);

  // ============================================
  // SEÇÃO 7: MATERIAIS E IDENTIFICAÇÃO
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('SEÇÃO 7: Materiais de Referência e Identificação')
    .setHelpText('Informações adicionais e identificação do respondente');

  // 7.1 Diário de Papel
  form.addMultipleChoiceItem()
    .setTitle('7.1 Você pode nos enviar uma foto ou cópia do diário de classe em papel usado atualmente?')
    .setChoiceValues([
      'Sim, vou enviar por email/WhatsApp',
      'Não tenho acesso'
    ])
    .setRequired(true);

  // 7.2 Modelo Relatório
  form.addMultipleChoiceItem()
    .setTitle('7.2 Existe um modelo de relatório descritivo da Ed. Infantil que possamos usar como referência?')
    .setChoiceValues([
      'Sim, vou enviar',
      'Não temos modelo padrão',
      'Cada professor faz do seu jeito'
    ])
    .setRequired(true);

  // 7.3 Observações
  form.addParagraphTextItem()
    .setTitle('7.3 Outras observações, sugestões ou preocupações:')
    .setRequired(false);

  // ============================================
  // IDENTIFICAÇÃO
  // ============================================
  form.addSectionHeaderItem()
    .setTitle('Identificação')
    .setHelpText('Para podermos entrar em contato se necessário');

  form.addTextItem()
    .setTitle('Nome')
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Cargo')
    .setChoiceValues([
      'Professor(a)',
      'Coordenador(a)',
      'Diretor(a)',
      'Secretário(a) Escolar',
      'Secretaria Municipal de Educação'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Escola (se aplicável)')
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle('Etapa(s) que atua')
    .setChoiceValues([
      'Creche',
      'Pré-escola',
      'Fundamental I'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Email ou telefone para contato')
    .setRequired(false);

  // Finalizar
  Logger.log('Formulário criado com sucesso!');
  Logger.log('URL do formulário: ' + form.getEditUrl());
  Logger.log('URL para responder: ' + form.getPublishedUrl());

  // Mostrar URLs
  SpreadsheetApp.getUi().alert(
    'Formulário criado com sucesso!\n\n' +
    'URL para editar:\n' + form.getEditUrl() + '\n\n' +
    'URL para responder:\n' + form.getPublishedUrl()
  );
}
