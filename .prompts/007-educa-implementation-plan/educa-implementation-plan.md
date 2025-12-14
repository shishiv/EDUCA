<plan>
  <summary>
    Plano de implementação focado para lançamento do ano letivo 2026 (fevereiro).
    Timeline: 8 semanas (dezembro 2025 - janeiro 2026).
    Escopo: Apenas features bloqueantes - LGPD compliance e Calendário Escolar.
    Todas as outras features adiadas para implementação durante o ano letivo.
  </summary>

  <timeline>
    <milestone date="2025-12-14">Início do plano</milestone>
    <milestone date="2025-12-31">LGPD compliance completo</milestone>
    <milestone date="2026-01-15">Calendário Escolar completo</milestone>
    <milestone date="2026-01-31">Testes e ajustes finais</milestone>
    <milestone date="2026-02-03">Ano letivo 2026 inicia</milestone>
  </timeline>

  <phases>
    <phase number="1" name="lgpd-compliance" weeks="1-2" deadline="2025-12-28">
      <objective>Implementar compliance LGPD mínimo viável para operação legal</objective>
      <features>
        <feature id="F011" critical="true">Política de Privacidade (LGPD)</feature>
        <feature id="F013" critical="true">Termo de Consentimento</feature>
      </features>
      <tasks>
        <task priority="critical">Criar página /politica-privacidade com texto legal</task>
        <task priority="critical">Adicionar checkbox de consentimento LGPD no cadastro de responsável</task>
        <task priority="critical">Registrar lgpd_data_consentimento automaticamente</task>
        <task priority="high">Criar migration para campos adicionais se necessário</task>
        <task priority="high">Bloquear cadastro sem aceite de política</task>
        <task priority="medium">Implementar fluxo de revogação de consentimento</task>
      </tasks>
      <deliverables>
        <deliverable>Página /politica-privacidade acessível publicamente</deliverable>
        <deliverable>Checkbox obrigatório no formulário de responsável</deliverable>
        <deliverable>Registro de data/hora do consentimento no banco</deliverable>
      </deliverables>
      <dependencies>Nenhuma - pode começar imediatamente</dependencies>
      <verification>
        <check>Página de política carrega corretamente</check>
        <check>Não é possível cadastrar responsável sem aceitar política</check>
        <check>Campo lgpd_consentimento e lgpd_data_consentimento salvos</check>
        <check>pnpm typecheck passa</check>
        <check>pnpm build passa</check>
      </verification>
      <do_prompt>008-lgpd-compliance-do</do_prompt>
    </phase>

    <phase number="2" name="calendario-escolar" weeks="3-4" deadline="2026-01-11">
      <objective>Implementar Calendário Escolar integrado com frequência</objective>
      <features>
        <feature id="F009">Calendário Escolar</feature>
      </features>
      <tasks>
        <task priority="critical">Criar tabela calendario_escolar (Supabase migration)</task>
        <task priority="critical">Implementar CRUD de eventos (feriados, recessos, dias letivos)</task>
        <task priority="critical">Criar página /dashboard/calendario</task>
        <task priority="high">Integrar calendário com cálculo de frequência</task>
        <task priority="high">Adicionar RLS por escola</task>
        <task priority="medium">Criar visualização mensal/anual</task>
        <task priority="medium">Permitir importar calendário de outra escola</task>
      </tasks>
      <deliverables>
        <deliverable>Tabela calendario_escolar com RLS</deliverable>
        <deliverable>Página /dashboard/calendario funcional</deliverable>
        <deliverable>Frequência calcula dias letivos corretamente</deliverable>
      </deliverables>
      <dependencies>
        <dependency>Fase 1 completa (LGPD não bloqueia tecnicamente, mas é prioridade)</dependency>
      </dependencies>
      <verification>
        <check>CRUD de eventos funciona (criar, editar, deletar)</check>
        <check>Eventos aparecem por escola (RLS)</check>
        <check>Frequência exclui feriados do cálculo</check>
        <check>pnpm typecheck passa</check>
        <check>pnpm build passa</check>
      </verification>
      <do_prompt>009-calendario-escolar-do</do_prompt>
    </phase>

    <phase number="3" name="polish-e-testes" weeks="5-6" deadline="2026-01-25">
      <objective>Estabilização, testes e correção de bugs</objective>
      <features>
        <feature id="POLISH">Ajustes finais pré-lançamento</feature>
      </features>
      <tasks>
        <task priority="high">Testar fluxos completos em ambiente de staging</task>
        <task priority="high">Corrigir bugs identificados</task>
        <task priority="high">Verificar responsividade mobile</task>
        <task priority="medium">Revisar mensagens de erro em português</task>
        <task priority="medium">Testar com dados reais (escola piloto)</task>
        <task priority="low">Documentar mudanças no CHANGELOG</task>
      </tasks>
      <deliverables>
        <deliverable>Sistema testado e estável</deliverable>
        <deliverable>Bugs críticos corrigidos</deliverable>
        <deliverable>CHANGELOG atualizado</deliverable>
      </deliverables>
      <dependencies>
        <dependency>Fases 1 e 2 completas</dependency>
      </dependencies>
      <verification>
        <check>Fluxo de cadastro completo funciona</check>
        <check>Frequência com calendário funciona</check>
        <check>Sem erros no console (Chrome DevTools)</check>
        <check>Mobile funciona</check>
      </verification>
      <do_prompt>010-polish-pre-lancamento-do</do_prompt>
    </phase>

    <phase number="4" name="buffer-treinamento" weeks="7-8" deadline="2026-01-31">
      <objective>Buffer para imprevistos e preparação de usuários</objective>
      <features>
        <feature id="BUFFER">Contingência e treinamento</feature>
      </features>
      <tasks>
        <task priority="high">Resolver issues emergentes</task>
        <task priority="medium">Preparar material de treinamento básico</task>
        <task priority="medium">Fazer deploy final em produção</task>
        <task priority="low">Comunicar mudanças aos usuários</task>
      </tasks>
      <deliverables>
        <deliverable>Sistema em produção estável</deliverable>
        <deliverable>Usuários informados das novidades</deliverable>
      </deliverables>
      <dependencies>
        <dependency>Fase 3 completa</dependency>
      </dependencies>
      <verification>
        <check>Produção estável por 48h sem incidentes</check>
        <check>Feedback inicial de usuários positivo</check>
      </verification>
      <do_prompt>N/A - execução manual</do_prompt>
    </phase>
  </phases>

  <do_prompts_to_create>
    <prompt number="008" name="lgpd-compliance-do">
      <description>Implementar LGPD: Política de Privacidade + Termo de Consentimento</description>
      <features>F011, F013</features>
      <estimated_effort>3-4 dias</estimated_effort>
    </prompt>
    <prompt number="009" name="calendario-escolar-do">
      <description>Implementar Calendário Escolar com integração de frequência</description>
      <features>F009</features>
      <estimated_effort>5-7 dias</estimated_effort>
    </prompt>
    <prompt number="010" name="polish-pre-lancamento-do">
      <description>Testes, bugs e ajustes finais</description>
      <features>POLISH</features>
      <estimated_effort>5-7 dias</estimated_effort>
    </prompt>
  </do_prompts_to_create>

  <out_of_scope>
    <deferred_to_2026>
      <feature id="F015">Transporte Escolar</feature>
      <feature id="F016">Módulo Nutrição</feature>
      <feature id="F020">Integração WhatsApp</feature>
      <feature id="F018">Educacenso (deadline maio/2026)</feature>
      <feature id="F025">Dashboard Coordenador</feature>
      <feature id="F027">Dashboard Nutricionista</feature>
      <feature id="F010">Grade Curricular (parcial existe)</feature>
      <feature id="F019">Onboarding/Tour</feature>
      <feature id="F021">Central de Ajuda expandida</feature>
    </deferred_to_2026>
    <rationale>
      Com apenas 8 semanas até o ano letivo, focamos apenas no que é:
      1. Legalmente obrigatório (LGPD)
      2. Funcionalmente bloqueante (Calendário para frequência)

      Todas as outras features podem ser adicionadas durante o ano letivo
      sem impactar a operação básica do sistema.
    </rationale>
  </out_of_scope>

  <risks>
    <risk severity="high">
      <description>Atraso em LGPD expõe município a risco legal</description>
      <mitigation>Prioridade máxima, começar imediatamente</mitigation>
    </risk>
    <risk severity="medium">
      <description>Calendário não integrar corretamente com frequência existente</description>
      <mitigation>Testar extensivamente, manter fallback</mitigation>
    </risk>
    <risk severity="medium">
      <description>Bugs descobertos tarde demais</description>
      <mitigation>2 semanas de buffer (fase 4)</mitigation>
    </risk>
    <risk severity="low">
      <description>Resistência de usuários a mudanças</description>
      <mitigation>Mudanças são aditivas, não quebram fluxos existentes</mitigation>
    </risk>
  </risks>

  <metadata>
    <confidence level="high">
      Escopo mínimo bem definido, codebase já maduro.
    </confidence>
    <assumptions>
      - Desenvolvedor disponível full-time nas 8 semanas
      - Acesso a Supabase para migrations
      - Secretaria de Educação aprova texto da política LGPD
    </assumptions>
    <open_questions>
      - Texto da política de privacidade: usar template ou jurídico do município?
      - Escola piloto para testes: qual das 9?
    </open_questions>
  </metadata>
</plan>
