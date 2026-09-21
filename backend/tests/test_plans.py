from app.config.plans import PLAN_PRO, has_feature, normalize_plan


def test_legacy_paid_plans_normalize_to_pro() -> None:
    assert normalize_plan("starter") == PLAN_PRO
    assert normalize_plan("enterprise") == PLAN_PRO


def test_phase_two_integrations_are_not_entitlements() -> None:
    assert has_feature(PLAN_PRO, "ai_finance_advisor") is False
    assert has_feature(PLAN_PRO, "ai_finance_advanced") is False
    assert has_feature(PLAN_PRO, "whatsapp_agent") is False
