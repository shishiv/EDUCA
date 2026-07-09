# Especificação Técnica: Notificações WhatsApp para Presença de Alunos — EDUCA

**Data:** 2026-07-09
**Versão:** 1.0
**Contexto:** Integração de alertas de frequência escolar via WhatsApp para responsáveis, no sistema de gestão municipal EDUCA.

---

## 1. Recomendação de API WhatsApp

### Decisão: **Meta WhatsApp Business API (Cloud API) via BSP**

| Critério | Meta Cloud API | Evolution API | Z-API | Whapi Cloud |
|---|---|---|---|---|
| **Protocolo** | Oficial Meta | Baileys (não-oficial) | Não-oficial | Não-oficial |
| **Risco de ban** | Nenhum | Moderado (oscilações do Baileys) | Moderado | Moderado |
| **LGPD compliance** | Total (logs Meta) | Responsabilidade do operador | Parcial | Parcial |
| **Template approval** | Obrigatório | Não precisa | Não precisa | Não precisa |
| **Custo/mês (5k alunos)** | ~R$ 300-500 | R$ 50-200 (VPS) | R$ 97 | US$ 30 |
| **Setup** | 1-5 dias (verificação) | Horas (Docker) | 10 min | 5 min |
| **CNPJ necessário** | Sim | Não | Sim | Não |
| **Suporte PT-BR** | Via BSP | Comunidade | Sim | Não |
| **Escalabilidade** | Ilimitada (Meta) | Limitada ao VPS | Ilimitada | Ilimitada |

### Justificativa

1. **Órgão público + LGPD**: Prefeituras estão sob auditoria de TCE/TCM. Usar protocolo não-oficial (Baileys) para comunicação com responsáveis de alunos expõe o município a risco de vazamento de dados e questionamento legal. A Meta Cloud API oferece logs de entrega, consentimento rastreável e conformidade com a LGPD.

2. **Categoria de mensagem correta**: Notificações de frequência escolar se enquadram em **Utility** (R$ 0,04-0,05/msg), a categoria mais barata depois de autenticação. Isso torna o custo viável mesmo para municípios pequenos.

3. **Template aprovado = previsibilidade**: Mensagens de utilidade pública (frequência, reunião, recuperação) têm alta taxa de aprovação de template na Meta. Uma vez aprovados, funcionam sem risco de bloqueio.

4. **Evolução natural**: O EDUCA já tem conformidade INEP, LGPD e Bolsa Família. Adicionar uma API oficial mantém a coerência do projeto.

### Provedor BSP Recomendado

Para o MVP, recomenda-se **WhatsAppNow** (Message Central) ou **Zavu** como BSP brasileiro:
- Onboarding gerenciado em português
- Suporte a Pix (futuro: pagamento de taxas escolares)
- SDK Node.js/TypeScript nativo
- Sem taxa de setup, pay-as-you-go

### Alternativa para Desenvolvimento/Testes

**Evolution API** (Docker, self-hosted) para ambiente de desenvolvimento e testes:
- Sem custo de licença
- Rápido de subir (`docker compose up`)
- Ideal para testar o fluxo de notificações sem gastar com mensagens reais
- **NUNCA usar em produção** para dados reais de alunos — apenas para homologação

---

## 2. Diagrama de Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUXO DE NOTIFICAÇÃO WHATSAPP                    │
└─────────────────────────────────────────────────────────────────────────┘

                          ┌──────────────────┐
                          │   PROFESSOR      │
                          │  (Web/Mobile)    │
                          └────────┬─────────┘
                                   │
                         1. Marca chamada
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   frequencia (tabela)    │
                    │   presente = false        │
                    └────────────┬─────────────┘
                                 │
                   2. Trigger / Edge Function
                    ┌────────────┴─────────────┐
                    │  check_attendance_alert  │
                    │  (PostgreSQL trigger OR   │
                    │   Supabase Edge Function) │
                    └────────────┬─────────────┘
                                 │
                   3. Calcula % de frequência
                      do aluno nos últimos 30 dias
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  % < 80%?                │
                    │  OR falta injustificada?  │
                    └──────┬───────────┬───────┘
                           │           │
                         SIM          NÃO
                           │           │
                           ▼           ▼
                    ┌──────────┐   (fim — sem
                    │  Enfileira│    notificação)
                    │  notif.  │
                    └────┬─────┘
                         │
                   4. Supabase Edge Function
                      OR background worker
                         │
                         ▼
              ┌─────────────────────┐
              │  notification_queue  │
              │  (tabela)            │
              │  status = 'pending'  │
              └─────────┬───────────┘
                        │
                   5. Worker processa fila
                      (cron job a cada 5 min)
                        │
                        ▼
              ┌─────────────────────┐
              │  Monta template     │
              │  + dados do aluno   │
              └─────────┬───────────┘
                        │
                   6. Envia via WhatsApp
                      Business API
                        │
                        ▼
              ┌─────────────────────┐
              │  Meta WhatsApp      │
              │  Cloud API          │
              └─────────┬───────────┘
                        │
                   7. Entrega no celular
                      do responsável
                        │
                        ▼
              ┌─────────────────────┐
              │  notification_log   │
              │  status = 'sent'    │
              │  + message_id Meta  │
              └─────────────────────┘

    ┌─────────────────────────────────────────────────────┐
    │              TIPOS DE NOTIFICAÇÃO                    │
    ├─────────────────────────────────────────────────────┤
    │                                                     │
    │  A. Alerta de Falta (gatilho: chamada salva)        │
    │     "Seu filho João faltou na aula de hoje (Mat.)   │
    │      Frequência atual: 75% — abaixo dos 80%         │
    │      recomendados pelo Bolsa Família."              │
    │                                                     │
    │  B. Risco Bolsa Família (gatilho: % < 80%)          │
    │     "A frequência de Maria está em 72%.              │
    │      Se continuar assim, a família pode perder       │
    │      o Bolsa Família. Procure a escola."            │
    │                                                     │
    │  C. Recuperação de Notas (gatilho: nota < média)    │
    │     "João está em recuperação em Matemática.         │
    │      A prova final será dia 15/12."                 │
    │                                                     │
    │  D. Reunião de Pais (gatilho: calendário escolar)   │
    │     "Reunião de pais na Escola Municipal São José   │
    │      dia 20/08 às 19h. Sua presença é importante."  │
    │                                                     │
    └─────────────────────────────────────────────────────┘
```

---

## 3. Schema Supabase para a Feature

### 3.1 Tabelas Novas

```sql
-- =============================================================================
-- NOTIFICAÇÕES WHATSAPP — Schema de Dados
-- =============================================================================

-- 1. notification_templates: Templates de mensagem aprovados no Meta
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,              -- ex: 'alerta_falta', 'risco_bolsa_familia'
  categoria TEXT NOT NULL CHECK (categoria IN ('utility', 'marketing', 'authentication')),
  meta_template_id TEXT,                   -- ID do template no Meta WABA
  meta_template_status TEXT DEFAULT 'pending',  -- pending | approved | rejected
  conteudo_template TEXT NOT NULL,         -- Template com placeholders {{1}}, {{2}}
  variaveis TEXT[] NOT NULL,               -- ['aluno_nome', 'escola_nome', 'frequencia', ...]
  idioma TEXT DEFAULT 'pt_BR',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. notification_queue: Fila de notificações a enviar
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  responsavel_id UUID NOT NULL REFERENCES responsaveis(id),
  template_id UUID NOT NULL REFERENCES notification_templates(id),
  variaveis JSONB NOT NULL,                -- {"1": "João", "2": "Escola Municipal...", "3": "75"}
  telefone_destino TEXT NOT NULL,          -- Telefone do responsável no momento do envio
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  tentativas INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  erro TEXT,                               -- Mensagem de erro da API
  meta_message_id TEXT,                    -- ID da mensagem no Meta
  agendado_para TIMESTAMPTZ,               -- Para notificações agendadas (reunião)
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. notification_log: Histórico completo de notificações
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID REFERENCES notification_queue(id),
  escola_id UUID NOT NULL REFERENCES escolas(id),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  responsavel_id UUID NOT NULL REFERENCES responsaveis(id),
  template_id UUID NOT NULL REFERENCES notification_templates(id),
  tipo_notificacao TEXT NOT NULL,          -- 'falta', 'risco_bf', 'recuperacao', 'reuniao'
  variaveis_enviadas JSONB,
  telefone_destino TEXT NOT NULL,
  status TEXT NOT NULL,                    -- 'sent', 'failed', 'read', 'delivered'
  meta_message_id TEXT,
  meta_status_entrega TEXT,                -- Status de delivery do Meta
  custo_mensagem NUMERIC(10, 4),           -- Custo real em R$
  enviado_em TIMESTAMPTZ DEFAULT now(),
  lido_em TIMESTAMPTZ,                     -- Quando o responsável leu (webhook Meta)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. notification_preferences: Preferências por responsável
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  responsavel_id UUID NOT NULL REFERENCES responsaveis(id),
  aluno_id UUID NOT NULL REFERENCES alunos(id),
  notificacao_falta BOOLEAN DEFAULT true,
  notificacao_risco_bf BOOLEAN DEFAULT true,
  notificacao_recuperacao BOOLEAN DEFAULT true,
  notificacao_reuniao BOOLEAN DEFAULT true,
  horario_inicio TIME DEFAULT '08:00',     -- Janela de notificação
  horario_fim TIME DEFAULT '20:00',
  lgpd_consentimento BOOLEAN DEFAULT false,
  lgpd_data_consentimento TIMESTAMPTZ,
  opt_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (responsavel_id, aluno_id)
);

-- 5. whatsapp_config: Configuração por escola/município
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id UUID REFERENCES escolas(id),   -- NULL = config global do município
  provider TEXT DEFAULT 'meta_cloud' CHECK (provider IN ('meta_cloud', 'evolution_api')),
  meta_phone_number_id TEXT,               -- ID do número no Meta WABA
  meta_business_account_id TEXT,           -- WABA ID
  meta_access_token_encrypted TEXT,        -- Token criptografado (não texto plano)
  evolution_api_url TEXT,                   -- URL da Evolution API (dev/test)
  evolution_api_key_encrypted TEXT,         -- API key criptografada
  webhook_secret TEXT,                      -- Segredo para validar webhooks do Meta
  webhook_url TEXT,                         -- URL pública para receber webhooks
  ativo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_escola ON notification_queue(escola_id);
CREATE INDEX idx_notification_queue_agendado ON notification_queue(agendado_para)
  WHERE status = 'pending';
CREATE INDEX idx_notification_log_aluno ON notification_log(aluno_id);
CREATE INDEX idx_notification_log_responsavel ON notification_log(responsavel_id);
CREATE INDEX idx_notification_log_data ON notification_log(enviado_em);
CREATE INDEX idx_notification_preferences_resp ON notification_preferences(responsavel_id);
```

### 3.2 Gatilhos (Triggers)

```sql
-- =============================================================================
-- TRIGGER: Disparar notificação quando frequência for registrada
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_attendance_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_aluno_id UUID;
  v_matricula_id UUID;
  v_turma_id UUID;
  v_escola_id UUID;
  v_aluno_nome TEXT;
  v_escola_nome TEXT;
  v_frequencia_percent NUMERIC;
  v_responsavel RECORD;
  v_template_id UUID;
  v_ja_alertou_hoje BOOLEAN;
BEGIN
  -- Só dispara para faltas (presente = false)
  IF NEW.presente = true THEN
    RETURN NEW;
  END IF;

  -- Busca dados da matrícula
  SELECT m.aluno_id, m.turma_id INTO v_aluno_id, v_matricula_id
  FROM matriculas m WHERE m.id = NEW.matricula_id;

  SELECT t.escola_id INTO v_escola_id
  FROM turmas t WHERE t.id = v_matricula_id;

  -- Busca nome do aluno e escola
  SELECT a.nome_completo INTO v_aluno_nome
  FROM alunos a WHERE a.id = v_aluno_id;

  SELECT e.nome INTO v_escola_nome
  FROM escolas e WHERE e.id = v_escola_id;

  -- Calcula frequência nos últimos 30 dias letivos
  SELECT ROUND(
    (COUNT(CASE WHEN f.presente = true THEN 1 END)::NUMERIC /
     NULLIF(COUNT(f.id), 0)) * 100, 2)
  INTO v_frequencia_percent
  FROM frequencia f
  WHERE f.matricula_id = NEW.matricula_id
    AND f.data_aula >= CURRENT_DATE - INTERVAL '30 days';

  -- Verifica se já notificou este responsável sobre este aluno hoje
  -- (evita spam de múltiplas faltas no mesmo dia)

  -- Para cada responsável ativo do aluno
  FOR v_responsavel IN
    SELECT r.id, r.telefone, r.nome, ar.pode_receber_comunicados
    FROM aluno_responsaveis ar
    JOIN responsaveis r ON r.id = ar.responsavel_id
    WHERE ar.aluno_id = v_aluno_id
      AND ar.ativo = true
      AND ar.pode_receber_comunicados = true
      AND r.telefone IS NOT NULL
  LOOP
    -- Verifica opt-out e preferências
    -- (lógica de verificação será na Edge Function)

    -- Insere na fila de notificação
    INSERT INTO notification_queue (
      escola_id, aluno_id, responsavel_id, template_id,
      variaveis, telefone_destino, status
    ) VALUES (
      v_escola_id, v_aluno_id, v_responsavel.id,
      (SELECT id FROM notification_templates WHERE nome = 'alerta_falta' AND ativo = true LIMIT 1),
      jsonb_build_object(
        '1', v_aluno_nome,
        '2', v_escola_nome,
        '3', v_frequencia_percent::TEXT
      ),
      v_responsavel.telefone,
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_frequencia_insert
  AFTER INSERT ON frequencia
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attendance_notification();

-- =============================================================================
-- TRIGGER: Alerta de risco Bolsa Família (quando % cai abaixo de 80%)
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_bolsa_familia_risk()
RETURNS TRIGGER AS $$
DECLARE
  v_aluno RECORD;
  v_responsavel RECORD;
  v_frequencia_percent NUMERIC;
  v_ultimo_alerta TIMESTAMPTZ;
BEGIN
  -- Busca aluno com NIS e Bolsa Família
  SELECT a.id, a.nome_completo, a.nis, a.bolsa_familia,
         m.id AS matricula_id, t.escola_id, e.nome AS escola_nome
  INTO v_aluno
  FROM alunos a
  JOIN matriculas m ON m.aluno_id = a.id AND m.situacao = 'ativa'
  JOIN turmas t ON t.id = m.turma_id
  JOIN escolas e ON e.id = t.escola_id
  WHERE a.id = (SELECT aluno_id FROM matriculas WHERE id = NEW.matricula_id)
    AND a.bolsa_familia = true
    AND a.nis IS NOT NULL;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calcula frequência
  SELECT ROUND(
    (COUNT(CASE WHEN f.presente = true THEN 1 END)::NUMERIC /
     NULLIF(COUNT(f.id), 0)) * 100, 2)
  INTO v_frequencia_percent
  FROM frequencia f
  WHERE f.matricula_id = NEW.matricula_id
    AND f.data_aula >= CURRENT_DATE - INTERVAL '30 days';

  -- Só alerta se estiver abaixo de 80%
  IF v_frequencia_percent >= 80 THEN
    RETURN NEW;
  END IF;

  -- Verifica último alerta (máximo 1 por semana)
  SELECT MAX(enviado_em) INTO v_ultimo_alerta
  FROM notification_log
  WHERE aluno_id = v_aluno.id
    AND tipo_notificacao = 'risco_bf'
    AND enviado_em > NOW() - INTERVAL '7 days';

  IF v_ultimo_alerta IS NOT NULL THEN
    RETURN NEW;  -- Já alertou esta semana
  END IF;

  -- Enfileira alerta para cada responsável
  FOR v_responsavel IN
    SELECT r.id, r.telefone, r.nome
    FROM aluno_responsaveis ar
    JOIN responsaveis r ON r.id = ar.responsavel_id
    WHERE ar.aluno_id = v_aluno.id
      AND ar.ativo = true
      AND ar.pode_receber_comunicados = true
      AND r.telefone IS NOT NULL
  LOOP
    INSERT INTO notification_queue (
      escola_id, aluno_id, responsavel_id, template_id,
      variaveis, telefone_destino, status
    ) VALUES (
      v_aluno.escola_id, v_aluno.id, v_responsavel.id,
      (SELECT id FROM notification_templates WHERE nome = 'risco_bolsa_familia' AND ativo = true LIMIT 1),
      jsonb_build_object(
        '1', v_aluno.nome_completo,
        '2', v_frequencia_percent::TEXT,
        '3', v_aluno.escola_nome
      ),
      v_responsavel.telefone,
      'pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER after_frequencia_bolsa_familia
  AFTER INSERT ON frequencia
  FOR EACH ROW
  WHEN (NEW.presente = false)
  EXECUTE FUNCTION trigger_bolsa_familia_risk();
```

### 3.3 Feature Flag

```sql
-- Registrar no sistema de feature flags existente
INSERT INTO feature_flags (flag_name, description)
VALUES ('whatsapp_notifications', 'Modulo de notificacoes WhatsApp para responsaveis')
ON CONFLICT (flag_name) DO NOTHING;
```

### 3.4 RLS Policies

```sql
-- RLS para notification_queue
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escola pode ver suas notificacoes"
  ON notification_queue FOR SELECT
  TO authenticated
  USING (
    escola_id IN (
      SELECT escola_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- RLS para notification_log (mesma lógica)
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Escola pode ver seu historico"
  ON notification_log FOR SELECT
  TO authenticated
  USING (
    escola_id IN (
      SELECT escola_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'gestor_sme')
    )
  );

-- RLS para notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Responsavel pode ver suas preferencias"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (
    responsavel_id IN (
      SELECT id FROM responsaveis WHERE id = notification_preferences.responsavel_id
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid()
      AND tipo_usuario IN ('admin', 'gestor_sme', 'diretor')
    )
  );
```

---

## 4. Estimativa de Custo Mensal — Município Médio (5.000 alunos)

### Premissas

| Variável | Valor | Fonte |
|---|---|---|
| Alunos ativos | 5.000 | Município médio brasileiro (IBGE) |
| Dias letivos/mês | 22 | Calendário escolar MEC |
| Faltas/dia (média) | 10% = 500 alunos | Taxa média Brasil (INEP 2024) |
| Responsáveis por aluno | 1,5 (média) | Mães + pais/responsáveis |
| Notificações de falta/mês | 500 faltas/dia x 22 dias = 11.000 | Calculado |
| Alertas Bolsa Família/mês | 5% dos alunos BF = 250 alertas | Estimativa conservadora |
| Recuperação/mês | 1x por bimestre = 1.250 | 25% dos alunos |
| Reunião de pais/mês | 1 por escola = 10 escolas | Média município médio |
| Custo/msg Utility (Meta) | R$ 0,045 | Meta pricing 2026 (via BSP) |
| Custo/msg Marketing (Meta) | R$ 0,35 | Meta pricing 2026 |
| Taxa BSP | 20% sobre custo Meta | Média de mercado |

### Cálculo

| Tipo | Msg/mês | Categoria | Custo Meta | Custo c/ BSP |
|---|---|---|---|---|
| Alerta de falta | 11.000 | Utility | R$ 495 | R$ 594 |
| Risco Bolsa Família | 250 | Utility | R$ 11 | R$ 13 |
| Recuperação de notas | 1.250 | Utility | R$ 56 | R$ 67 |
| Reunião de pais | 10 | Utility | R$ 0,45 | R$ 0,54 |
| **Total** | **12.510** | | **R$ 562** | **R$ 675** |

### Custo por Aluno

| Métrica | Valor |
|---|---|
| Custo/aluno/mês | R$ 0,14 |
| Custo/aluno/ano | R$ 1,62 |
| Custo por escola/mês (500 alunos) | R$ 67,50 |
| Custo município médio/ano | R$ 8.100 |

### Comparação com Alternativas

| Provedor | Custo/mês (5k alunos) | Observação |
|---|---|---|
| Meta Cloud API + BSP | ~R$ 675 | Recomendado para produção |
| Evolution API (VPS) | ~R$ 100 (VPS) | Apenas dev/test — risco de ban |
| Z-API | R$ 97 (1 instância) | Precisa de 2+ instâncias para escala |
| Whapi Cloud | US$ 30 (~R$ 165) | Bom custo, mas não-oficial |

**Conclusão de custo:** Para um município de 5.000 alunos, o custo operacional via Meta Cloud API é de aproximadamente **R$ 675/mês** — menos de R$ 0,14 por aluno. Comparado ao custo de um servidor público dedicado a telefonemas para responsáveis, o ROI é imediato.

---

## 5. MVP Scope — Demo Funcional em 7 Dias

### Dia 1-2: Infraestrutura

- [ ] Provisionar conta Meta Business + WABA via BSP (WhatsAppNow ou Zavu)
- [ ] Subir Evolution API em Docker para dev/test
- [ ] Criar as 5 tabelas do schema no Supabase (migration)
- [ ] Configurar feature flag `whatsapp_notifications`

### Dia 3-4: Templates e Worker

- [ ] Criar e aprovar 2 templates no Meta:
  - `alerta_falta`: "{{1}}, seu filho(a) {{2}} faltou na aula de hoje na {{3}}. Frequencia atual: {{4}}%."
  - `risco_bolsa_familia`: "{{1}}, a frequencia de {{2}} esta em {{3}}% na {{4}}. Abaixo dos 80% exigidos pelo Bolsa Familia."
- [ ] Implementar Edge Function `process-notification-queue` (Supabase)
- [ ] Configurar cron job (pg_cron ou Vercel Cron) a cada 5 min
- [ ] Implementar webhook handler para status de entrega

### Dia 5-6: Integração com o App

- [ ] Trigger `after_frequencia_insert` no PostgreSQL
- [ ] Página de configuração em `/dashboard/configuracoes/whatsapp`
- [ ] Painel de notificações enviadas em `/dashboard/notificacoes`
- [ ] Formulário de consentimento LGPD para responsáveis
- [ ] Testar fluxo completo: marcar falta → trigger → fila → worker → WhatsApp

### Dia 7: Testes e Ajustes

- [ ] Testar com 5 responsáveis reais (ou voluntários)
- [ ] Verificar delivery rate, tempo de entrega
- [ ] Ajustar limites de rate (Meta: ~80 msg/s por número)
- [ ] Documentar setup para novos municípios
- [ ] Gravar demo em vídeo (para PR e OSS traction)

### O que NÃO está no MVP

- Dashboard de analytics de notificações
- Templates de recuperação e reunião (adiar para v2)
- Suporte a múltiplos números WhatsApp por escola
- Chatbot de resposta automática
- Integração com Pix

---

## 6. Diferencial Competitivo para OSS Traction

### Por que esta feature é decisiva

1. **Mercado de 5.570 municípios**: 96% das prefeituras brasileiras ainda usam papel ou sistemas legados sem notificação. Quem tem WhatsApp tem o canal que os pais realmente abrem.

2. **Bolsa Família é lei**: O governo federal exige 80% de frequência. Perder o benefício por falta de comunicação é um risco real que prefeituras precisam mitigar. O EDUCA já tem o monitoramento — o WhatsApp fecha o ciclo.

3. **Taxa de abertura vs. canais tradicionais**:
   - Circular impressa: ~30% de alcance
   - E-mail: ~20% de abertura
   - SMS: ~60% de leitura
   - **WhatsApp Utility: ~95% de entrega, ~85% de leitura em 1 hora**

4. **LGPD como barreira de entrada**: Soluções não-oficiais (Evolution, Z-API) não podem ser usadas por prefeituras sem risco jurídico. O EDUCA com Meta Cloud API é a única opção OSS que oferece compliance de verdade.

5. **Custo acessível**: R$ 0,14/aluno/mês é trivial comparado ao custo de uma secretária fazendo ligações. Para um município de 5.000 alunos, o custo anual de ~R$ 8.100 é menor que o salário de um funcionário público por 2 meses.

6. **Efeito demonstração**: Um prefeito que vê "Seu filho faltou hoje" no WhatsApp do pai entende o valor do sistema em segundos. É a feature mais vendável do EDUCA.

### Posicionamento para o Claude for Open Source Program

| Critério | Como o WhatsApp Notifications atende |
|---|---|
| **Atividade recente** | Feature nova = commits, PRs, issues |
| **Comunidade visível** | Prefeituras interessadas = discussões, stars |
| **Impacto social** | Educação pública + Bolsa Família = claro |
| **Inovação técnica** | Provider-agnostic WhatsApp layer + Edge Functions |
| **Documentação** | GUIA-RAPIDO + template de implantação municipal |

### Roadmap de Tração (30 dias)

| Semana | Ação | Métrica |
|---|---|---|
| 1 | MVP funcional + demo video | 1 PR merged |
| 2 | Post no LinkedIn + grupos de gestão escolar BR | 5 stars, 1 issue |
| 3 | Abordar 3 prefeituras piloto (via GitHub Discussions) | 2 discussions ativas |
| 4 | Case de uso documentado + post no DEV.to/HackerNews | 20 stars, 1 fork |

---

## 7. Considerações Técnicas Adicionais

### Rate Limiting

- Meta Cloud API: ~80 mensagens/segundo por número telefônico
- Para 5.000 alunos com ~500 faltas/dia, o pico é ~11 msg/min — muito abaixo do limite
- Usar fila (`notification_queue`) com backoff exponencial em caso de 429

### Webhooks

- Meta envia webhooks para: `sent`, `delivered`, `read`, `failed`
- Implementar endpoint em `/api/webhooks/whatsapp` (Next.js API route)
- Validar assinatura com `webhook_secret` da tabela `whatsapp_config`
- Atualizar `notification_log.meta_status_entrega` e `notification_log.lido_em`

### LGPD

- Consentimento explícito em `notification_preferences.lgpd_consentimento`
- Opt-out a qualquer momento (via link na própria mensagem)
- Logs de consentimento imutáveis em `notification_log`
- Direito de esquecimento: apagar `notification_log` do aluno quando solicitado
- DPO configurável por município (já existe no `.env.example`)

### Provider-Agnostic Layer

- Seguir o padrão do `PROVIDER-AGNOSTIC-ROADMAP.md`
- Criar `WhatsAppAdapter` interface:
  ```typescript
  interface WhatsAppAdapter {
    sendTemplate(params: SendTemplateParams): Promise<SendResult>
    getMessageStatus(messageId: string): Promise<MessageStatus>
    handleWebhook(payload: unknown): Promise<WebhookEvent>
  }
  ```
- Implementações: `MetaCloudAdapter` (produção), `EvolutionAdapter` (dev/test)
- Facilitar migração futura sem reescrever lógica de negócio

---

## Resumo Executivo

| Item | Decisão |
|---|---|
| **API recomendada** | Meta WhatsApp Business Cloud API via BSP (WhatsAppNow/Zavu) |
| **Custo mensal (5k alunos)** | ~R$ 675 (R$ 0,14/aluno) |
| **Tempo de MVP** | 7 dias |
| **Tabelas novas** | 5 (notification_templates, notification_queue, notification_log, notification_preferences, whatsapp_config) |
| **Triggers** | 2 (falta, risco Bolsa Família) |
| **Diferencial competitivo** | Única solução OSS com WhatsApp oficial + LGPD + Bolsa Família para municípios brasileiros |
