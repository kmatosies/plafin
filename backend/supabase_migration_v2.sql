-- =============================================
-- Migration: Planos FREE/STARTER/PRO + Usage Counters + Notifications
-- Data: 2026-03-02
-- Execute este script no SQL Editor do Supabase
-- =============================================

-- =============================================
-- 1. Atualizar enum de planos em profiles
-- =============================================

-- Renomear coluna plan para aceitar novos valores
-- (Supabase não tem ENUM nativo com ALTER, então usamos CHECK constraint)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'starter', 'pro'));

-- Migrar usuários com plano 'enterprise' para 'pro'
UPDATE profiles SET plan = 'pro' WHERE plan = 'enterprise';

-- Adicionar campo de status da assinatura
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'
  CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing'));

-- Adicionar campo de expiração (para controle de downgrade)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Adicionar campo Stripe para plano STARTER
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- =============================================
-- 2. Tabela de Contadores de Uso (usage_counters)
-- =============================================
-- Mantém contadores atômicos por tenant/período para evitar
-- queries de COUNT() pesadas a cada request.

CREATE TABLE IF NOT EXISTS usage_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    -- Exemplos de metric: 'transactions_month', 'clients_total'
    period TEXT NOT NULL DEFAULT 'all',
    -- Formato para mensal: 'YYYY-MM'  |  Para vitalício: 'all'
    current_value INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, metric, period)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_metric
  ON usage_counters(user_id, metric, period);

-- Habilitar RLS
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- Apenas leitura pelo próprio usuário (escrita é feita pelo service_role via API)
CREATE POLICY "Users can view own usage counters"
  ON usage_counters FOR SELECT
  USING (auth.uid() = user_id);


-- =============================================
-- 3. Tabela de Notificações (notifications_outbox)
-- =============================================
-- Fila de notificações para entrega garantida e auditoria.
-- O job/cron escreve aqui; um worker processa e envia.

CREATE TABLE IF NOT EXISTS notifications_outbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    -- Tipos: 'EXPIRATION_5_DAYS' | 'PLAN_DOWNGRADED' | 'PAYMENT_FAILED'
    channel TEXT NOT NULL DEFAULT 'email',
    -- Canais: 'email' | 'whatsapp' (futuro PRO)
    status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    payload JSONB NOT NULL DEFAULT '{}',
    -- payload: { "email_to": "...", "subject": "...", "name": "..." }
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_outbox_pending
  ON notifications_outbox(status, scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_notifications_outbox_user
  ON notifications_outbox(user_id, created_at DESC);

-- RLS: usuário pode ver suas próprias notificações
ALTER TABLE notifications_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications_outbox FOR SELECT
  USING (auth.uid() = user_id);


-- =============================================
-- 4. Função SQL para incremento atômico de contador
-- =============================================
-- Usa INSERT ... ON CONFLICT para garantir atomicidade sem race conditions.

CREATE OR REPLACE FUNCTION increment_usage_counter(
    p_user_id UUID,
    p_metric TEXT,
    p_period TEXT DEFAULT 'all',
    p_delta INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_value INT;
BEGIN
    INSERT INTO usage_counters (user_id, metric, period, current_value)
    VALUES (p_user_id, p_metric, p_period, p_delta)
    ON CONFLICT (user_id, metric, period)
    DO UPDATE SET
        current_value = usage_counters.current_value + p_delta,
        updated_at = NOW()
    RETURNING current_value INTO new_value;

    RETURN new_value;
END;
$$;


-- =============================================
-- 5. Função SQL para reiniciar contador de transações mensais
-- =============================================
-- Chamada no início de cada mês (ou pode ser chamada pelo job).
-- Zera todos os contadores 'transactions_month' do período anterior (se houver).
-- Na arquitectura de period='YYYY-MM', isso acontece automaticamente
-- (cada mês é uma linha separada).

-- Nenhuma função necessária: cada mês tem seu próprio registro.


-- =============================================
-- 6. Função para verificar e enfileirar notificações de expiração
-- =============================================
-- Chamada diariamente via job (cron/pg_cron).
-- Verifica assinaturas que expiram em 5 dias e insere notificação,
-- evitando duplicatas via ON CONFLICT DO NOTHING.

CREATE OR REPLACE FUNCTION queue_expiration_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notif_count INT := 0;
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT p.id AS user_id,
               p.email,
               p.full_name,
               p.plan,
               p.subscription_expires_at
        FROM profiles p
        WHERE p.subscription_status = 'active'
          AND p.plan IN ('starter', 'pro')
          AND p.subscription_expires_at IS NOT NULL
          AND p.subscription_expires_at::DATE = (CURRENT_DATE + INTERVAL '5 days')::DATE
          -- Evitar duplicata: não enfileirar se já existe notificação pendente/enviada hoje
          AND NOT EXISTS (
              SELECT 1 FROM notifications_outbox n
              WHERE n.user_id = p.id
                AND n.type = 'EXPIRATION_5_DAYS'
                AND n.created_at::DATE = CURRENT_DATE
          )
    LOOP
        INSERT INTO notifications_outbox (
            user_id, type, channel, status, payload, scheduled_for
        ) VALUES (
            rec.user_id,
            'EXPIRATION_5_DAYS',
            'email',
            'pending',
            jsonb_build_object(
                'email_to', rec.email,
                'name', rec.full_name,
                'plan', rec.plan,
                'expires_at', rec.subscription_expires_at
            ),
            NOW()
        );
        notif_count := notif_count + 1;
    END LOOP;

    RETURN notif_count;
END;
$$;


-- =============================================
-- 7. Trigger: atualizar subscription_status ao expirar
-- =============================================
-- Opcional: pode ser feito via job Python também.
-- Esta função faz downgrade para FREE quando subscription_expires_at passou.

CREATE OR REPLACE FUNCTION auto_downgrade_expired_subscriptions()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    downgrade_count INT;
BEGIN
    UPDATE profiles
    SET
        plan = 'free',
        subscription_status = 'canceled',
        stripe_subscription_id = NULL
    WHERE plan IN ('starter', 'pro')
      AND subscription_expires_at IS NOT NULL
      AND subscription_expires_at < NOW()
      AND subscription_status = 'active';

    GET DIAGNOSTICS downgrade_count = ROW_COUNT;
    RETURN downgrade_count;
END;
$$;
