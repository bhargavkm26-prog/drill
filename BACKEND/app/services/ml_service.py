import os
import logging
import joblib
import numpy as np
import pandas as pd
from typing import Optional, List
from app.config import settings

logger = logging.getLogger("NWIS.ML")

# Feature columns matching the trained LightGBM models
FEATURE_COLUMNS = [
    "Depth", "ROP_mean_5min", "WOB_mean", "RPM_mean", "Torque_mean_5min",
    "SPP_mean", "MudWeight", "ECD", "HistoricalLossCount",
    "HistoricalStuckPipeCount", "FormationRiskScore", "FlowRate",
    "Inclination", "Azimuth", "DistanceToNearestRiskWell",
    "Torque_trend", "SPP_trend", "ROP_trend",
]

# ── Physics Constraint Thresholds (Upper Assam Basin) ────────
TORQUE_TREND_SPIKE_THRESHOLD = 15.0   # kNm trend indicating mechanical issue
ECD_OVERBALANCE_LIMIT = 1.2           # SG above mud weight → overpressure risk
ROP_DROP_THRESHOLD = -20.0            # Sudden ROP drop → potential pack-off
MIN_FLOW_RATE = 100.0                 # GPM below which hole cleaning fails


class MLService:
    """
    Production ML engine for drilling risk prediction.
    Uses trained LightGBM models + SHAP explainability + physics constraints.
    """

    def __init__(self):
        self._model_stuck = None
        self._model_loss = None
        self._shap_explainer_stuck = None
        self._shap_explainer_loss = None
        self._models_loaded = False

    def load_models(self):
        """Load trained LightGBM model artifacts from disk."""
        if self._models_loaded:
            return

        stuck_path = os.path.join(settings.MODEL_DIR, "stuck_pipe_model.pkl")
        loss_path = os.path.join(settings.MODEL_DIR, "mud_loss_model.pkl")

        try:
            if os.path.exists(stuck_path):
                self._model_stuck = joblib.load(stuck_path)
                logger.info("Stuck Pipe model loaded.")
            else:
                logger.warning(f"Stuck Pipe model not found at {stuck_path}")

            if os.path.exists(loss_path):
                self._model_loss = joblib.load(loss_path)
                logger.info("Mud Loss model loaded.")
            else:
                logger.warning(f"Mud Loss model not found at {loss_path}")

            # Initialize SHAP explainers for tree-based models
            self._init_shap_explainers()
            self._models_loaded = True

        except Exception as e:
            logger.error(f"Failed to load ML models: {e}")

    def _init_shap_explainers(self):
        """Initialize SHAP TreeExplainer for each LightGBM model."""
        try:
            import shap
            if self._model_stuck is not None:
                self._shap_explainer_stuck = shap.TreeExplainer(self._model_stuck)
                logger.info("SHAP explainer initialized for Stuck Pipe model.")
            if self._model_loss is not None:
                self._shap_explainer_loss = shap.TreeExplainer(self._model_loss)
                logger.info("SHAP explainer initialized for Mud Loss model.")
        except ImportError:
            logger.warning("SHAP library not installed. Explainability will use rule-based fallback.")
        except Exception as e:
            logger.warning(f"SHAP initialization failed: {e}. Using rule-based fallback.")

    @property
    def is_ready(self) -> bool:
        return self._model_stuck is not None and self._model_loss is not None

    def predict(self, telemetry: dict) -> dict:
        """
        Full prediction pipeline:
        1. LightGBM probability prediction
        2. Physics-based constraint checks
        3. SHAP feature explanations
        4. Combined risk assessment
        """
        if not self.is_ready:
            return {"error": "ML models not loaded"}

        # Build input DataFrame matching training feature order
        input_df = pd.DataFrame([{col: telemetry.get(col, 0) for col in FEATURE_COLUMNS}])

        # ── 1. ML Probabilities ──────────────────────────────
        prob_stuck = float(self._model_stuck.predict_proba(input_df)[0][1]) * 100
        prob_loss = float(self._model_loss.predict_proba(input_df)[0][1]) * 100

        # ── 2. Physics Constraint Warnings ───────────────────
        physics_warnings = self._check_physics_constraints(telemetry)

        # ── 3. Active Warning Detection ──────────────────────
        active_warnings = []
        if prob_stuck > 70:
            active_warnings.append("Stuck Pipe Probability Exceeds 70%")
        if prob_loss > 70:
            active_warnings.append("Severe Mud Loss Probability Exceeds 70%")
        if prob_stuck > 50:
            active_warnings.append("Elevated Stuck Pipe Risk")
        if prob_loss > 50:
            active_warnings.append("Elevated Mud Loss Risk")

        # Determine overall severity
        is_critical = (
            prob_stuck > 70
            or prob_loss > 70
            or len(physics_warnings) >= 2
        )
        is_warning = (
            prob_stuck > 50
            or prob_loss > 50
            or len(physics_warnings) >= 1
        )

        if is_critical:
            severity = "CRITICAL"
        elif is_warning:
            severity = "WARNING"
        else:
            severity = "NORMAL"

        # ── 4. SHAP Explanations ─────────────────────────────
        shap_explanations = self._compute_shap(input_df, prob_stuck, prob_loss, telemetry)

        return {
            "stuck_pipe_risk_percent": round(prob_stuck, 2),
            "mud_loss_risk_percent": round(prob_loss, 2),
            "severity": severity,
            "active_warnings": active_warnings if active_warnings else ["None"],
            "physics_warnings": physics_warnings,
            "shap_explanations": shap_explanations,
            "alert": is_critical,
        }

    def _check_physics_constraints(self, telemetry: dict) -> List[str]:
        """Apply domain-specific physics rules that no ML model captures perfectly."""
        warnings = []

        torque_trend = telemetry.get("Torque_trend", 0)
        ecd = telemetry.get("ECD", 0)
        mud_weight = telemetry.get("MudWeight", 0)
        rop_trend = telemetry.get("ROP_trend", 0)
        flow_rate = telemetry.get("FlowRate", 0)
        rpm = telemetry.get("RPM_mean", 0)
        wob = telemetry.get("WOB_mean", 0)

        # Torque spike detection
        if torque_trend > TORQUE_TREND_SPIKE_THRESHOLD:
            warnings.append(
                f"Torque Spike Detected: Trend = {torque_trend:.1f} kNm "
                f"(threshold: {TORQUE_TREND_SPIKE_THRESHOLD} kNm). "
                "Possible mechanical obstruction or formation pack-off."
            )

        # ECD overbalance
        ecd_delta = ecd - mud_weight
        if ecd_delta > ECD_OVERBALANCE_LIMIT:
            warnings.append(
                f"ECD Overbalance: ECD ({ecd:.2f} SG) exceeds mud weight "
                f"({mud_weight:.2f} SG) by {ecd_delta:.2f} SG. "
                "Risk of induced fracture and mud losses."
            )

        # Sudden ROP drop
        if rop_trend < ROP_DROP_THRESHOLD:
            warnings.append(
                f"Sudden ROP Drop: Trend = {rop_trend:.1f} m/hr. "
                "Possible tight hole, bit balling, or formation change."
            )

        # Low flow rate
        if 0 < flow_rate < MIN_FLOW_RATE:
            warnings.append(
                f"Low Flow Rate: {flow_rate:.0f} GPM (minimum: {MIN_FLOW_RATE} GPM). "
                "Insufficient hole cleaning — cuttings accumulation risk."
            )

        # Stall detection (RPM ~0 but WOB active)
        if rpm < 5 and wob > 5:
            warnings.append(
                f"Rotary Stall: RPM={rpm:.0f} with WOB={wob:.1f} klbs active. "
                "Drill string may be stuck."
            )

        return warnings

    def _compute_shap(self, input_df: pd.DataFrame, prob_stuck: float, prob_loss: float, telemetry: dict) -> List[dict]:
        """
        Compute real SHAP values if explainer is available.
        Falls back to rule-based importance if SHAP library is unavailable.
        """
        explanations = []

        # ── Try Real SHAP ────────────────────────────────────
        if self._shap_explainer_stuck is not None:
            try:
                # Use the model with higher risk for explanation
                if prob_stuck >= prob_loss:
                    shap_values = self._shap_explainer_stuck.shap_values(input_df)
                    model_name = "Stuck Pipe"
                else:
                    shap_values = self._shap_explainer_loss.shap_values(input_df)
                    model_name = "Mud Loss"

                # SHAP returns [class_0_vals, class_1_vals] for binary classification
                if isinstance(shap_values, list):
                    # Use class 1 (positive/risk class) SHAP values
                    vals = shap_values[1][0]
                else:
                    vals = shap_values[0]

                # Pair features with SHAP values and sort by absolute impact
                feature_shap_pairs = list(zip(FEATURE_COLUMNS, vals))
                feature_shap_pairs.sort(key=lambda x: abs(x[1]), reverse=True)

                total_abs = sum(abs(v) for _, v in feature_shap_pairs) or 1.0

                # Return top 6 most impactful features
                for feature, shap_val in feature_shap_pairs[:6]:
                    contribution = (abs(shap_val) / total_abs) * 100
                    explanations.append({
                        "feature": feature,
                        "value": round(float(telemetry.get(feature, 0)), 4),
                        "shap_value": round(float(shap_val), 4),
                        "impact": "Increases Risk" if shap_val > 0 else "Decreases Risk",
                        "contribution_percent": round(contribution, 1),
                    })

                return explanations

            except Exception as e:
                logger.warning(f"SHAP computation failed: {e}. Using rule-based fallback.")

        # ── Rule-Based Fallback ──────────────────────────────
        return self._rule_based_explanation(telemetry, prob_stuck, prob_loss)

    def _rule_based_explanation(self, telemetry: dict, prob_stuck: float, prob_loss: float) -> List[dict]:
        """
        When SHAP is unavailable, provide physics-informed explanations
        based on domain knowledge of drilling hazard indicators.
        """
        explanations = []

        # Scoring based on known risk correlations
        factors = [
            ("Torque_mean_5min", telemetry.get("Torque_mean_5min", 0), 20.0, "High torque indicates mechanical resistance"),
            ("ECD", telemetry.get("ECD", 0), 12.0, "High ECD increases fracture risk"),
            ("MudWeight", telemetry.get("MudWeight", 0), 12.0, "Mud weight affects wellbore stability"),
            ("Torque_trend", telemetry.get("Torque_trend", 0), 10.0, "Rising torque trend signals developing issue"),
            ("WOB_mean", telemetry.get("WOB_mean", 0), 15.0, "Excessive WOB increases stuck pipe risk"),
            ("Depth", telemetry.get("Depth", 0), 3000.0, "Deeper formations carry higher risk"),
        ]

        total_score = 0
        scored = []
        for name, value, threshold, reason in factors:
            score = min(abs(value / threshold), 3.0) if threshold else 0
            scored.append((name, value, score, reason))
            total_score += score

        total_score = total_score or 1.0

        for name, value, score, reason in sorted(scored, key=lambda x: x[2], reverse=True):
            explanations.append({
                "feature": name,
                "value": round(float(value), 4),
                "shap_value": round(score, 4),
                "impact": "Increases Risk" if score > 1.0 else "Decreases Risk",
                "contribution_percent": round((score / total_score) * 100, 1),
            })

        return explanations


# Singleton instance
ml_service = MLService()
