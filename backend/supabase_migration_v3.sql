-- =============================================
-- Migration v3: Consolidacao de planos e disponibilidade
-- Data: 2026-03-13
-- =============================================

-- 1. Consolidar planos publicos em FREE | PRO
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_plan_check;

UPDATE profiles
SET plan = 'pro'
WHERE plan IN ('starter', 'enterprise');

ALTER TABLE profiles
  ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'pro'));

-- 2. Garantir tabela de disponibilidade para agenda
CREATE TABLE IF NOT EXISTS availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    weekday INT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INT NOT NULL DEFAULT 30 CHECK (slot_duration > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_availability_tenant_weekday
  ON availability(tenant_id, weekday);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own availability" ON availability;
CREATE POLICY "Users can manage own availability"
  ON availability FOR ALL
  USING (auth.uid() = tenant_id);

DROP TRIGGER IF EXISTS availability_updated_at ON availability;
CREATE TRIGGER availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
