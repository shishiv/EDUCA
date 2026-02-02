<research>
  <summary>
    O sistema EDUCA possui 32 features distribuídas em 6 fases (0-5). A Fase 0 (Fundação) está 100% completa com 4 features implementadas. A Fase 1 (Core Acadêmico) está em andamento com 4 features em desenvolvimento e 2 planejadas. As fases 2-5 estão planejadas, com destaque para 3 features críticas de LGPD na Fase 2 que bloqueiam coleta de dados sensíveis.

    O codebase atual em gestao_fronteira/ já implementa substancialmente mais do que o roadmap indica como "done" - a maioria das features da Fase 1 já possui código funcional. O principal gap está nas fases 2-5: LGPD compliance formal, módulos auxiliares (transporte, nutrição), UX (WhatsApp, help system), e dashboards por perfil.

    Prioridades identificadas: (1) Completar formalização LGPD antes de coletar novos dados sensíveis, (2) Finalizar Calendário Escolar e Grade Curricular, (3) Implementar módulos de relatórios MEC/Educacenso.
  </summary>

  <features>
    <phase number="0" name="Fundação e Infraestrutura" status="done" period="Concluído">
      <feature id="F001" status="done">
        <title>Arquitetura do Sistema</title>
        <description>Estrutura de banco de dados, API, autenticação e autorização por níveis de acesso.</description>
        <tags>Core</tags>
        <codebase_status>✅ Implementado: Next.js 15 + Supabase + shadcn/ui. 20+ tabelas, 8 funções PL/pgSQL, RLS por escola.</codebase_status>
        <dependencies>Nenhuma</dependencies>
      </feature>
      <feature id="F002" status="done">
        <title>Importação de Dados</title>
        <description>Importação em massa de alunos, escolas, responsáveis e turmas via planilhas.</description>
        <tags>Core</tags>
        <codebase_status>✅ Implementado: bulk-user-operations.tsx, formulários de cadastro em massa.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F003" status="done">
        <title>Log de Alterações</title>
        <description>Auditoria completa de todas as ações: quem alterou, o quê e quando.</description>
        <tags>Compliance</tags>
        <codebase_status>✅ Implementado: audit_logs, audit_sessoes_aula, audit_trail tables. Views audit_summary.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F004" status="done">
        <title>Níveis de Acesso</title>
        <description>Permissões por perfil: Professor, Diretor, Coordenador, Nutricionista, Gestor.</description>
        <tags>Segurança</tags>
        <codebase_status>✅ Implementado: tipo_usuario em users, RLS policies, useAuth hook com role-based access.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
    </phase>

    <phase number="1" name="Core Acadêmico" status="progress" period="Janeiro — Fevereiro 2025">
      <feature id="F005" status="progress">
        <title>Cadastro de Alunos</title>
        <description>CRUD completo com dados pessoais, NIS (Bolsa Família), responsáveis e documentos.</description>
        <tags>Cadastro</tags>
        <codebase_status>✅ Implementado: /dashboard/alunos/, StudentForm, tabela alunos com campos CPF, RG, NIS, necessidades_especiais.</codebase_status>
        <dependencies>F001, F004</dependencies>
      </feature>
      <feature id="F006" status="progress">
        <title>Chamada Digital</title>
        <description>Registro de frequência por aula, com cálculo automático de percentual e alertas.</description>
        <tags>Frequência</tags>
        <codebase_status>✅ Implementado: FrequenciaWorkflow, AttendanceGrid, sessoes_aula, frequencia tables. Auto-lock 18:00, real-time updates.</codebase_status>
        <dependencies>F001, F005</dependencies>
      </feature>
      <feature id="F007" status="progress">
        <title>Diário de Classe — Fundamental</title>
        <description>Conteúdos, notas, avaliações por área do conhecimento conforme BNCC.</description>
        <tags>Acadêmico</tags>
        <codebase_status>✅ Implementado: /diario/, LessonCard, LessonDetailPanel, BNNCSelector, sessoes_aula com conteudo_programatico.</codebase_status>
        <dependencies>F001, F005, F006</dependencies>
      </feature>
      <feature id="F008" status="progress">
        <title>Diário de Classe — Ed. Infantil</title>
        <description>Campos de Experiência, Direitos de Aprendizagem, observações e relatórios BNCC.</description>
        <tags>Acadêmico, BNCC</tags>
        <codebase_status>⚠️ Parcial: StudentReportInfantil componente existe, mas campos específicos de Ed. Infantil podem precisar expansão.</codebase_status>
        <dependencies>F001, F005, F007</dependencies>
      </feature>
      <feature id="F009" status="planned">
        <title>Calendário Escolar</title>
        <description>Feriados, recessos, dias letivos, eventos. Integrado ao cálculo de frequência.</description>
        <tags>Acadêmico</tags>
        <codebase_status>❌ Não implementado: Não há página de calendário nem tabela específica.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F010" status="planned">
        <title>Grade Curricular</title>
        <description>Disciplinas, carga horária, professores por turma e horários das aulas.</description>
        <tags>Acadêmico</tags>
        <codebase_status>⚠️ Parcial: Tabela disciplinas existe. Falta UI de grade horária e carga semanal.</codebase_status>
        <dependencies>F001, F005</dependencies>
      </feature>
    </phase>

    <phase number="2" name="Compliance, LGPD e Segurança" status="planned" period="Fevereiro — Março 2025">
      <feature id="F011" status="critical">
        <title>Política de Privacidade (LGPD)</title>
        <description>Termos de uso, consentimento dos responsáveis, política de dados de menores.</description>
        <tags>Obrigatório, LGPD</tags>
        <codebase_status>⚠️ Parcial: Campo lgpd_consentimento em responsaveis existe, mas falta UI de aceite e política formal.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F012" status="critical">
        <title>Backup Automático</title>
        <description>Rotina de backup diário, retenção de 30 dias, restore testado. Redundância geográfica.</description>
        <tags>Segurança</tags>
        <codebase_status>❓ Supabase gerenciado: Verificar configuração do projeto Supabase para backups automáticos.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F013" status="critical">
        <title>Termo de Consentimento</title>
        <description>Assinatura digital dos responsáveis autorizando uso de dados e imagem.</description>
        <tags>LGPD</tags>
        <codebase_status>❌ Não implementado: Sem fluxo de assinatura digital ou upload de termo.</codebase_status>
        <dependencies>F011</dependencies>
      </feature>
      <feature id="F014" status="planned">
        <title>Criptografia de Dados Sensíveis</title>
        <description>CPF, NIS, dados de saúde e endereços criptografados em repouso.</description>
        <tags>Segurança</tags>
        <codebase_status>⚠️ Parcial: Supabase oferece encryption at rest. Criptografia column-level não implementada.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
    </phase>

    <phase number="3" name="Módulos Auxiliares" status="planned" period="Março — Abril 2025">
      <feature id="F015" status="planned">
        <title>Transporte Escolar</title>
        <description>Cadastro de rotas, veículos, motoristas. Vínculo do aluno com rota de transporte.</description>
        <tags>Transporte</tags>
        <codebase_status>❌ Não implementado: Sem tabelas ou páginas de transporte.</codebase_status>
        <dependencies>F001, F005</dependencies>
      </feature>
      <feature id="F016" status="planned">
        <title>Módulo Nutrição / Merenda</title>
        <description>Cardápio, controle de refeições servidas, restrições alimentares, relatórios.</description>
        <tags>Nutrição</tags>
        <codebase_status>❌ Não implementado: Sem tabelas ou páginas de nutrição. Perfil Nutricionista existe mas sem módulo.</codebase_status>
        <dependencies>F001, F005</dependencies>
      </feature>
      <feature id="F017" status="planned">
        <title>Relatórios Bolsa Família</title>
        <description>Acompanhamento de frequência dos beneficiários, alertas e exportação para o MEC.</description>
        <tags>Relatórios, MEC</tags>
        <codebase_status>✅ Implementado: BolsaFamiliaAlert, /relatorios/bolsa-familia/, exports PDF/Excel.</codebase_status>
        <dependencies>F006, F005</dependencies>
      </feature>
      <feature id="F018" status="planned">
        <title>Exportação Educacenso</title>
        <description>Geração de arquivos no formato exigido pelo Censo Escolar / INEP.</description>
        <tags>Integração, MEC</tags>
        <codebase_status>⚠️ Parcial: Tabelas codigos_inep e educacenso_exports existem. Falta UI de geração de arquivo.</codebase_status>
        <dependencies>F001, F005, F006</dependencies>
      </feature>
    </phase>

    <phase number="4" name="Experiência do Usuário e Comunicação" status="planned" period="Abril — Maio 2025">
      <feature id="F019" status="planned">
        <title>Onboarding e Tour Guiado</title>
        <description>Tutorial interativo no primeiro acesso. Central de ajuda com toggle para ativar/desativar.</description>
        <tags>UX</tags>
        <codebase_status>⚠️ Parcial: help-system components existem. wizard_completed em users. Falta tour interativo.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F020" status="planned">
        <title>Integração WhatsApp</title>
        <description>Notificações automáticas: faltas, reuniões, comunicados, alertas de frequência.</description>
        <tags>Integração, Comunicação</tags>
        <codebase_status>❌ Não implementado: Sem integração WhatsApp/Evolution API no código.</codebase_status>
        <dependencies>F001, F006</dependencies>
      </feature>
      <feature id="F021" status="planned">
        <title>Central de Ajuda</title>
        <description>Documentação in-app, tooltips contextuais, FAQ e vídeos tutoriais.</description>
        <tags>UX</tags>
        <codebase_status>⚠️ Parcial: FieldHelp, InfoTooltip componentes existem. Falta FAQ e vídeos.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F022" status="planned">
        <title>Responsivo Mobile</title>
        <description>Interface otimizada para tablets e celulares. Chamada pelo celular do professor.</description>
        <tags>UX</tags>
        <codebase_status>✅ Implementado: MobileNav, mobile-responsive-dialog, responsive design em todos os componentes.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
    </phase>

    <phase number="5" name="Dashboards por Perfil" status="planned" period="Maio — Junho 2025">
      <feature id="F023" status="planned">
        <title>Dashboard Professor</title>
        <description>Minhas turmas, chamadas pendentes, alertas de alunos, acesso rápido ao diário.</description>
        <tags>Dashboard</tags>
        <codebase_status>⚠️ Parcial: TeacherDashboard componente existe com stats básicos. Pode precisar expansão.</codebase_status>
        <dependencies>F001, F004</dependencies>
      </feature>
      <feature id="F024" status="planned">
        <title>Dashboard Diretor</title>
        <description>Visão da escola: todas as turmas, frequência geral, indicadores, pendências.</description>
        <tags>Dashboard</tags>
        <codebase_status>⚠️ Parcial: Dashboard principal com role-based stats. Pode precisar visão específica de diretor.</codebase_status>
        <dependencies>F001, F004</dependencies>
      </feature>
      <feature id="F025" status="planned">
        <title>Dashboard Coordenador</title>
        <description>Acompanhamento pedagógico, diários preenchidos, observações pendentes.</description>
        <tags>Dashboard</tags>
        <codebase_status>❌ Não implementado: Sem dashboard específico para coordenador.</codebase_status>
        <dependencies>F001, F004</dependencies>
      </feature>
      <feature id="F026" status="planned">
        <title>Dashboard Gestor (Secretaria)</title>
        <description>Visão de todas as 9 escolas, comparativos, relatórios consolidados, exportações.</description>
        <tags>Dashboard</tags>
        <codebase_status>⚠️ Parcial: Dashboard com stats gerais. Falta visão multi-escola e comparativos.</codebase_status>
        <dependencies>F001, F004</dependencies>
      </feature>
      <feature id="F027" status="planned">
        <title>Dashboard Nutricionista</title>
        <description>Cardápios, restrições alimentares, refeições servidas, estoque.</description>
        <tags>Dashboard</tags>
        <codebase_status>❌ Não implementado: Depende do módulo de Nutrição (F016).</codebase_status>
        <dependencies>F016</dependencies>
      </feature>
      <feature id="F028" status="planned">
        <title>Layout A4 para Impressão</title>
        <description>Todos os relatórios com layout otimizado para impressão em papel A4.</description>
        <tags>UX</tags>
        <codebase_status>✅ Implementado: pdf-utils.ts, múltiplas funções de geração PDF com layout A4.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
    </phase>

    <!-- Features adicionais identificadas no codebase mas não no roadmap -->
    <phase number="extra" name="Features Implementadas (não no roadmap)" status="done" period="N/A">
      <feature id="F029" status="done">
        <title>Gestão de Turmas</title>
        <description>CRUD completo de turmas com série, turno, ano letivo, capacidade.</description>
        <tags>Cadastro</tags>
        <codebase_status>✅ Implementado: /dashboard/turmas/, tabela turmas.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F030" status="done">
        <title>Gestão de Matrículas</title>
        <description>CRUD de matrículas vinculando aluno a turma com status e ano letivo.</description>
        <tags>Cadastro</tags>
        <codebase_status>✅ Implementado: /dashboard/matriculas/, tabela matriculas.</codebase_status>
        <dependencies>F001, F005, F029</dependencies>
      </feature>
      <feature id="F031" status="done">
        <title>Gestão de Escolas</title>
        <description>CRUD de escolas com diretor, endereço, configurações específicas.</description>
        <tags>Cadastro</tags>
        <codebase_status>✅ Implementado: /dashboard/escolas/, tabela escolas com configs.</codebase_status>
        <dependencies>F001</dependencies>
      </feature>
      <feature id="F032" status="done">
        <title>Gestão de Notas</title>
        <description>Lançamento de notas por bimestre, disciplina, tipo de avaliação.</description>
        <tags>Acadêmico</tags>
        <codebase_status>✅ Implementado: /dashboard/notas/, GradeInput, GradeGrid, tabela notas.</codebase_status>
        <dependencies>F001, F005, F007</dependencies>
      </feature>
    </phase>
  </features>

  <dependency_graph>
    <dependency>
      <from>F013</from>
      <to>F011</to>
      <reason>Termo de Consentimento requer Política de Privacidade definida primeiro</reason>
      <type>legal</type>
    </dependency>
    <dependency>
      <from>F014</from>
      <to>F011</to>
      <reason>Criptografia de dados sensíveis deve seguir política de dados definida</reason>
      <type>technical</type>
    </dependency>
    <dependency>
      <from>F016</from>
      <to>F005</to>
      <reason>Nutrição precisa de dados de alunos (restrições alimentares)</reason>
      <type>data</type>
    </dependency>
    <dependency>
      <from>F027</from>
      <to>F016</to>
      <reason>Dashboard Nutricionista depende do módulo de Nutrição</reason>
      <type>functional</type>
    </dependency>
    <dependency>
      <from>F017</from>
      <to>F006</to>
      <reason>Relatórios Bolsa Família dependem de dados de frequência</reason>
      <type>data</type>
    </dependency>
    <dependency>
      <from>F018</from>
      <to>F005</to>
      <reason>Educacenso exporta dados de alunos, turmas, frequência</reason>
      <type>data</type>
    </dependency>
    <dependency>
      <from>F020</from>
      <to>F006</to>
      <reason>WhatsApp envia alertas baseados em frequência</reason>
      <type>functional</type>
    </dependency>
    <dependency>
      <from>F009</from>
      <to>F006</to>
      <reason>Calendário integra com cálculo de frequência (dias letivos)</reason>
      <type>functional</type>
    </dependency>
  </dependency_graph>

  <compliance_requirements>
    <lgpd>
      <requirement>Art. 14 - Tratamento de dados pessoais de crianças e adolescentes</requirement>
      <implication>
        - Consentimento específico de pelo menos um responsável legal
        - Informação clara sobre coleta e uso de dados
        - Não condicionar participação em jogos/apps à coleta de dados
        - Verificação razoável de que o consentimento foi dado pelo responsável
      </implication>
      <current_status>
        Campo lgpd_consentimento existe em responsaveis mas:
        - Falta UI de aceite formal
        - Falta política de privacidade publicada
        - Falta fluxo de verificação de identidade do responsável
      </current_status>
      <actions_needed>
        1. Criar página /politica-privacidade com texto completo
        2. Adicionar checkbox de aceite no cadastro de responsável
        3. Registrar data e hora do consentimento
        4. Implementar fluxo de revogação de consentimento
      </actions_needed>
    </lgpd>
    <educacenso>
      <format>Layout definido pelo INEP para Censo Escolar</format>
      <deadline>Anualmente, geralmente maio-agosto</deadline>
      <campos_obrigatorios>
        - Dados da escola (código INEP, endereço, infraestrutura)
        - Dados do aluno (nome, data nascimento, CPF, NIS, raça/cor, deficiências)
        - Dados de matrícula (série, turno, etapa)
        - Dados do docente (formação, disciplinas)
      </campos_obrigatorios>
      <current_status>
        Tabelas codigos_inep e educacenso_exports existem.
        Falta: UI de geração, validação de campos obrigatórios, preview.
      </current_status>
    </educacenso>
    <bolsa_familia>
      <frequency_threshold>85% de frequência mínima (PNAE/PBF)</frequency_threshold>
      <reporting>
        - Frequência bimestral para alunos beneficiários (identificados por NIS)
        - Alerta para frequência abaixo de 80%
        - Exportação para sistema do MEC
      </reporting>
      <current_status>
        ✅ Implementado: BolsaFamiliaAlert, relatórios, campo NIS em alunos.
      </current_status>
    </bolsa_familia>
  </compliance_requirements>

  <gap_analysis>
    <implemented count="16">
      - F001: Arquitetura do Sistema
      - F002: Importação de Dados
      - F003: Log de Alterações
      - F004: Níveis de Acesso
      - F005: Cadastro de Alunos
      - F006: Chamada Digital
      - F007: Diário de Classe (Fundamental)
      - F017: Relatórios Bolsa Família
      - F022: Responsivo Mobile
      - F028: Layout A4 para Impressão
      - F029: Gestão de Turmas (extra)
      - F030: Gestão de Matrículas (extra)
      - F031: Gestão de Escolas (extra)
      - F032: Gestão de Notas (extra)
      - Relatórios de frequência e conteúdo
      - Exportação PDF/Excel
    </implemented>
    <partial count="9">
      - F008: Diário Ed. Infantil (componentes existem, campos específicos podem faltar)
      - F010: Grade Curricular (tabela disciplinas existe, falta UI completa)
      - F011: Política LGPD (campo existe, falta UI e política formal)
      - F012: Backup (Supabase gerencia, verificar configuração)
      - F014: Criptografia (encryption at rest via Supabase, falta column-level)
      - F018: Educacenso (tabelas existem, falta UI de exportação)
      - F019: Onboarding (help system existe, falta tour)
      - F021: Central de Ajuda (tooltips existem, falta FAQ/vídeos)
      - F023-F026: Dashboards por perfil (básico existe, falta especialização)
    </partial>
    <missing count="7">
      - F009: Calendário Escolar
      - F013: Termo de Consentimento digital
      - F015: Transporte Escolar
      - F016: Módulo Nutrição
      - F020: Integração WhatsApp
      - F025: Dashboard Coordenador
      - F027: Dashboard Nutricionista
    </missing>
  </gap_analysis>

  <recommendations>
    <recommendation priority="critical">
      <action>Implementar compliance LGPD formal (F011, F013)</action>
      <rationale>Obrigatório legalmente. Sistema já coleta dados de menores sem fluxo formal de consentimento. Risco legal alto.</rationale>
    </recommendation>
    <recommendation priority="high">
      <action>Finalizar Calendário Escolar (F009)</action>
      <rationale>Dependência funcional: cálculo correto de frequência requer dias letivos definidos.</rationale>
    </recommendation>
    <recommendation priority="high">
      <action>Completar UI de Educacenso (F018)</action>
      <rationale>Obrigatório anualmente. Tabelas já existem, falta apenas interface.</rationale>
    </recommendation>
    <recommendation priority="medium">
      <action>Criar Dashboard Coordenador (F025)</action>
      <rationale>Perfil existente sem funcionalidade específica. Coordenadores precisam de visão pedagógica.</rationale>
    </recommendation>
    <recommendation priority="medium">
      <action>Integração WhatsApp (F020)</action>
      <rationale>Alto impacto em comunicação com responsáveis. Evolution API mencionada como já configurada.</rationale>
    </recommendation>
    <recommendation priority="low">
      <action>Módulos Transporte e Nutrição (F015, F016)</action>
      <rationale>Funcionalidades auxiliares. Podem ser adiadas se não forem prioridade imediata.</rationale>
    </recommendation>
  </recommendations>

  <metadata>
    <confidence level="high">
      Features extraídas diretamente do roadmap HTML oficial.
      Gap analysis baseado em exploração completa do codebase.
    </confidence>
    <sources_consulted>
      - educa-roadmap(1).html (roadmap visual oficial)
      - gestao_fronteira/ (codebase completo)
      - Supabase schema (via exploração de types e migrations)
    </sources_consulted>
    <open_questions>
      - Backup automático: qual política atual no projeto Supabase?
      - Evolution API: está realmente configurada ou apenas planejada?
      - Educacenso: qual o layout exato exigido pelo INEP para 2025?
      - Prioridade relativa entre WhatsApp e Educacenso?
    </open_questions>
    <assumptions>
      - Roadmap versão 1.0 de Dezembro 2024 é o mais atual
      - 9 escolas na rede municipal de Fronteira, MG
      - Sistema já em uso parcial (produção)
    </assumptions>
    <quality_report>
      <sources_verified>
        - Roadmap HTML: lido diretamente
        - Codebase: explorado via Task/Explore agent
      </sources_verified>
      <claims_verified>
        - 32 features confirmadas (28 do roadmap + 4 extras no codebase)
        - Status de cada feature verificado contra código existente
        - Compliance LGPD verificado contra campos no banco
      </claims_verified>
      <claims_assumed>
        - Evolution API configurada (mencionado no roadmap, não verificado no código)
        - Backup Supabase ativo (assumido por ser gerenciado)
      </claims_assumed>
      <confidence_by_finding>
        - Features Fase 0: Alta (código verificado)
        - Features Fase 1: Alta (código verificado)
        - Gap analysis: Alta (exploração completa)
        - Compliance LGPD: Média (campos existem, fluxo não)
        - Educacenso formato: Baixa (precisa verificar INEP 2025)
      </confidence_by_finding>
    </quality_report>
  </metadata>
</research>
