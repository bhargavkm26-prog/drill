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
    "Depth",
    "ROP_mean_5min",
    "WOB_mean",
    "RPM_mean",
    "Torque_mean_5min",
    "SPP_mean",
    "MudWeight",
    "ECD",
    "HistoricalLossCount",
    "HistoricalStuckPipeCount",
    "FormationRiskScore",
    "FlowRate",
    "Inclination",
    "Azimuth",
    "DistanceToNearestRiskWell",
    "Torque_trend",
    "SPP_trend",
    "ROP_trend",
]


# ── Physics Constraint Thresholds (Upper Assam Basin) ────────
TORQUE_TREND_SPIKE_THRESHOLD = 15.0
ECD_OVERBALANCE_LIMIT = 1.2
ROP_DROP_THRESHOLD = -20.0
MIN_FLOW_RATE = 100.0


class MLService:
    """
    Production ML engine for drilling risk prediction.

    Uses:
    - Trained LightGBM models
    - SHAP explainability
    - Physics constraints
    - Input validation
    """

    def __init__(self):
        self._model_stuck = None
        self._model_loss = None

        self._shap_explainer_stuck = None
        self._shap_explainer_loss = None

        self._models_loaded = False

    def load_models(self):
        """
        Load trained LightGBM model artifacts from disk.

        The service is considered loaded only when BOTH
        required models are successfully available.
        """

        if self._models_loaded and self.is_ready:
            return

        stuck_path = os.path.join(
            settings.MODEL_DIR,
            "stuck_pipe_model.pkl"
        )

        loss_path = os.path.join(
            settings.MODEL_DIR,
            "mud_loss_model.pkl"
        )

        # Reset state before attempting a fresh load
        self._model_stuck = None
        self._model_loss = None

        self._shap_explainer_stuck = None
        self._shap_explainer_loss = None

        self._models_loaded = False

        try:

            # =================================================
            # LOAD STUCK PIPE MODEL
            # =================================================

            if os.path.exists(stuck_path):

                self._model_stuck = joblib.load(
                    stuck_path
                )

                logger.info(
                    "Stuck Pipe model loaded."
                )

            else:

                logger.error(
                    f"Stuck Pipe model not found at "
                    f"{stuck_path}"
                )

            # =================================================
            # LOAD MUD LOSS MODEL
            # =================================================

            if os.path.exists(loss_path):

                self._model_loss = joblib.load(
                    loss_path
                )

                logger.info(
                    "Mud Loss model loaded."
                )

            else:

                logger.error(
                    f"Mud Loss model not found at "
                    f"{loss_path}"
                )

            # =================================================
            # INITIALIZE SHAP
            # =================================================

            self._init_shap_explainers()

            # =================================================
            # FINAL MODEL STATUS
            # =================================================

            self._models_loaded = self.is_ready

            if self._models_loaded:

                logger.info(
                    "All required ML models loaded successfully."
                )

            else:

                logger.error(
                    "ML service initialization incomplete: "
                    "one or more required models are missing."
                )

        except Exception as e:

            self._models_loaded = False

            logger.exception(
                f"Failed to load ML models: {e}"
            )

    def _init_shap_explainers(self):
        """
        Initialize SHAP TreeExplainer for each LightGBM model.
        """

        try:

            import shap

            if self._model_stuck is not None:

                self._shap_explainer_stuck = (
                    shap.TreeExplainer(
                        self._model_stuck
                    )
                )

                logger.info(
                    "SHAP explainer initialized "
                    "for Stuck Pipe model."
                )

            if self._model_loss is not None:

                self._shap_explainer_loss = (
                    shap.TreeExplainer(
                        self._model_loss
                    )
                )

                logger.info(
                    "SHAP explainer initialized "
                    "for Mud Loss model."
                )

        except ImportError:

            logger.warning(
                "SHAP library not installed. "
                "Explainability will use "
                "rule-based fallback."
            )

        except Exception as e:

            logger.warning(
                f"SHAP initialization failed: {e}. "
                "Using rule-based fallback."
            )

    @property
    def is_ready(self) -> bool:

        return (
            self._model_stuck is not None
            and self._model_loss is not None
        )

    def predict(
        self,
        telemetry: dict
    ) -> dict:

        """
        Full prediction pipeline:

        1. Validate telemetry input
        2. LightGBM probability prediction
        3. Physics-based constraint checks
        4. SHAP feature explanations
        5. Combined risk assessment
        """

        if not self.is_ready:

            return {
                "error": "ML models not loaded"
            }

        # =====================================================
        # INPUT VALIDATION
        # =====================================================

        # Check for missing required features

        missing_features = [
            col
            for col in FEATURE_COLUMNS
            if col not in telemetry
        ]

        if missing_features:

            return {
                "error": (
                    "Missing required telemetry features"
                ),
                "missing_features": missing_features
            }

        # Check numeric + finite values

        invalid_features = []

        for col in FEATURE_COLUMNS:

            value = telemetry[col]

            # bool is technically an int in Python,
            # but it is not a valid telemetry measurement.

            if isinstance(value, bool):

                invalid_features.append(col)

            elif not isinstance(
                value,
                (int, float, np.number)
            ):

                invalid_features.append(col)

            elif not np.isfinite(value):

                invalid_features.append(col)

        if invalid_features:

            return {
                "error": "Invalid telemetry values",
                "invalid_features": invalid_features
            }

        # =====================================================
        # BUILD MODEL INPUT
        # =====================================================

        input_df = pd.DataFrame(
            [
                {
                    col: telemetry[col]
                    for col in FEATURE_COLUMNS
                }
            ]
        )

        # =====================================================
        # 1. ML PROBABILITIES
        # =====================================================

        prob_stuck = (
            float(
                self._model_stuck
                .predict_proba(input_df)[0][1]
            )
            * 100
        )

        prob_loss = (
            float(
                self._model_loss
                .predict_proba(input_df)[0][1]
            )
            * 100
        )

        # =====================================================
        # 2. PHYSICS CONSTRAINT WARNINGS
        # =====================================================

        physics_warnings = (
            self._check_physics_constraints(
                telemetry
            )
        )

        # =====================================================
        # 3. ACTIVE WARNING DETECTION
        # =====================================================

        active_warnings = []

        if prob_stuck > 70:

            active_warnings.append(
                "Stuck Pipe Probability Exceeds 70%"
            )

        if prob_loss > 70:

            active_warnings.append(
                "Severe Mud Loss Probability Exceeds 70%"
            )

        if prob_stuck > 50:

            active_warnings.append(
                "Elevated Stuck Pipe Risk"
            )

        if prob_loss > 50:

            active_warnings.append(
                "Elevated Mud Loss Risk"
            )

        if physics_warnings:
            active_warnings.extend(physics_warnings)

        # =====================================================
        # SEVERITY
        # =====================================================

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

        # =====================================================
        # 4. SHAP EXPLANATIONS
        # =====================================================

        shap_explanations = self._compute_shap(
            input_df,
            prob_stuck,
            prob_loss,
            telemetry
        )

        # =====================================================
        # FINAL RESPONSE
        # =====================================================

        return {

            "stuck_pipe_risk_percent": round(
                prob_stuck,
                2
            ),

            "mud_loss_risk_percent": round(
                prob_loss,
                2
            ),

            "severity": severity,

            "active_warnings": (
                active_warnings
                if active_warnings
                else ["None"]
            ),

            "physics_warnings": physics_warnings,

            "shap_explanations": shap_explanations,

            "alert": is_critical,
        }

    def _check_physics_constraints(
        self,
        telemetry: dict
    ) -> List[str]:

        """
        Apply domain-specific physics rules.
        """

        warnings = []

        torque_trend = telemetry.get(
            "Torque_trend",
            0
        )

        ecd = telemetry.get(
            "ECD",
            0
        )

        mud_weight = telemetry.get(
            "MudWeight",
            0
        )

        rop_trend = telemetry.get(
            "ROP_trend",
            0
        )

        flow_rate = telemetry.get(
            "FlowRate",
            0
        )

        rpm = telemetry.get(
            "RPM_mean",
            0
        )

        wob = telemetry.get(
            "WOB_mean",
            0
        )

        # =====================================================
        # TORQUE SPIKE
        # =====================================================

        if torque_trend > TORQUE_TREND_SPIKE_THRESHOLD:

            warnings.append(
                f"Torque Spike Detected: "
                f"Trend = {torque_trend:.1f} kNm "
                f"(threshold: "
                f"{TORQUE_TREND_SPIKE_THRESHOLD} kNm). "
                "Possible mechanical obstruction or "
                "formation pack-off."
            )

        # =====================================================
        # ECD OVERBALANCE
        # =====================================================

        ecd_delta = ecd - mud_weight

        if ecd_delta > ECD_OVERBALANCE_LIMIT:

            warnings.append(
                f"ECD Overbalance: "
                f"ECD ({ecd:.2f} SG) exceeds mud weight "
                f"({mud_weight:.2f} SG) by "
                f"{ecd_delta:.2f} SG. "
                "Risk of induced fracture and mud losses."
            )

        # =====================================================
        # ROP DROP
        # =====================================================

        if rop_trend < ROP_DROP_THRESHOLD:

            warnings.append(
                f"Sudden ROP Drop: "
                f"Trend = {rop_trend:.1f} m/hr. "
                "Possible tight hole, bit balling, "
                "or formation change."
            )

        # =====================================================
        # LOW FLOW RATE
        # =====================================================

        if 0 < flow_rate < MIN_FLOW_RATE:

            warnings.append(
                f"Low Flow Rate: "
                f"{flow_rate:.0f} GPM "
                f"(minimum: {MIN_FLOW_RATE} GPM). "
                "Insufficient hole cleaning — "
                "cuttings accumulation risk."
            )

        # =====================================================
        # ROTARY STALL
        # =====================================================

        if rpm < 5 and wob > 5:

            warnings.append(
                f"Rotary Stall: "
                f"RPM={rpm:.0f} with WOB={wob:.1f} "
                "klbs active. "
                "Drill string may be stuck."
            )

        return warnings

    def _compute_shap(
        self,
        input_df: pd.DataFrame,
        prob_stuck: float,
        prob_loss: float,
        telemetry: dict
    ) -> List[dict]:

        """
        Compute real SHAP values if explainer is available.

        Handles SHAP output formats across SHAP versions,
        including LightGBM binary classifiers.

        Falls back to rule-based importance if SHAP
        is unavailable or computation fails.
        """

        explanations = []

        # =====================================================
        # SELECT MODEL / EXPLAINER BASED ON HIGHER RISK
        # =====================================================

        if prob_stuck >= prob_loss:

            explainer = self._shap_explainer_stuck

        else:

            explainer = self._shap_explainer_loss

        # =====================================================
        # REAL SHAP
        # =====================================================

        if explainer is not None:

            try:

                shap_values = explainer(
                    input_df
                )

                # -------------------------------------------------
                # SHAP can return:
                #
                # 1. list:
                #    [class_0_values, class_1_values]
                #
                # 2. ndarray:
                #    shape = (samples, features)
                #
                # 3. ndarray:
                #    shape = (samples, features, classes)
                #
                # 4. Explanation-like object with .values
                # -------------------------------------------------

                raw_values = getattr(
                    shap_values,
                    "values",
                    shap_values
                )

                # =================================================
                # LIST OUTPUT
                # =================================================

                if isinstance(raw_values, list):

                    if len(raw_values) > 1:

                        vals = np.asarray(
                            raw_values[1]
                        )[0]

                    elif len(raw_values) == 1:

                        vals = np.asarray(
                            raw_values[0]
                        )[0]

                    else:

                        raise ValueError(
                            "SHAP returned an empty list."
                        )

                # =================================================
                # ARRAY OUTPUT
                # =================================================

                else:

                    arr = np.asarray(
                        raw_values
                    )

                    if arr.ndim == 1:

                        # Already one feature vector
                        vals = arr

                    elif arr.ndim == 2:

                        # Normal:
                        # (samples, features)

                        vals = arr[0]

                    elif arr.ndim == 3:

                        # Possible:
                        # (samples, features, classes)
                        #
                        # or:
                        # (samples, classes, features)

                        if arr.shape[-1] == 2:

                            # (samples, features, classes)
                            vals = arr[0, :, 1]

                        elif arr.shape[1] == 2:

                            # (samples, classes, features)
                            vals = arr[0, 1, :]

                        else:

                            raise ValueError(
                                f"Unexpected 3D SHAP shape: "
                                f"{arr.shape}"
                            )

                    else:

                        raise ValueError(
                            f"Unexpected SHAP output shape: "
                            f"{arr.shape}"
                        )

                # =================================================
                # VALIDATE FEATURE COUNT
                # =================================================

                vals = np.asarray(
                    vals,
                    dtype=float
                ).reshape(-1)

                if len(vals) != len(FEATURE_COLUMNS):

                    raise ValueError(
                        f"SHAP returned {len(vals)} values "
                        f"but expected {len(FEATURE_COLUMNS)} "
                        f"features."
                    )

                # =================================================
                # PAIR FEATURES WITH SHAP VALUES
                # =================================================

                feature_shap_pairs = list(
                    zip(
                        FEATURE_COLUMNS,
                        vals
                    )
                )

                # Sort by absolute impact

                feature_shap_pairs.sort(
                    key=lambda x: abs(x[1]),
                    reverse=True
                )

                # =================================================
                # TOTAL ABSOLUTE SHAP IMPACT
                # =================================================

                total_abs = (
                    sum(
                        abs(float(v))
                        for _, v in feature_shap_pairs
                    )
                    or 1.0
                )

                # =================================================
                # RETURN TOP 6 FEATURES
                # =================================================

                for feature, shap_val in (
                    feature_shap_pairs[:6]
                ):

                    shap_val = float(
                        shap_val
                    )

                    contribution = (
                        abs(shap_val)
                        / total_abs
                    ) * 100

                    explanations.append({

                        "feature": feature,

                        "value": round(
                            float(
                                telemetry.get(
                                    feature,
                                    0
                                )
                            ),
                            4
                        ),

                        "shap_value": round(
                            shap_val,
                            4
                        ),

                        "impact": (
                            "Increases Risk"
                            if shap_val > 0
                            else "Decreases Risk"
                        ),

                        "contribution_percent": round(
                            contribution,
                            1
                        ),
                    })

                return explanations

            except Exception as e:

                logger.warning(
                    f"SHAP computation failed: {e}. "
                    "Using rule-based fallback."
                )

        # =====================================================
        # RULE-BASED FALLBACK
        # =====================================================

        return self._rule_based_explanation(
            telemetry,
            prob_stuck,
            prob_loss
        )

    def _rule_based_explanation(
        self,
        telemetry: dict,
        prob_stuck: float,
        prob_loss: float
    ) -> List[dict]:

        """
        When SHAP is unavailable, provide
        physics-informed explanations.
        """

        explanations = []

        factors = [

            (
                "Torque_mean_5min",
                telemetry.get(
                    "Torque_mean_5min",
                    0
                ),
                20.0,
                "High torque indicates mechanical resistance"
            ),

            (
                "ECD",
                telemetry.get(
                    "ECD",
                    0
                ),
                12.0,
                "High ECD increases fracture risk"
            ),

            (
                "MudWeight",
                telemetry.get(
                    "MudWeight",
                    0
                ),
                12.0,
                "Mud weight affects wellbore stability"
            ),

            (
                "Torque_trend",
                telemetry.get(
                    "Torque_trend",
                    0
                ),
                10.0,
                "Rising torque trend signals developing issue"
            ),

            (
                "WOB_mean",
                telemetry.get(
                    "WOB_mean",
                    0
                ),
                15.0,
                "Excessive WOB increases stuck pipe risk"
            ),

            (
                "Depth",
                telemetry.get(
                    "Depth",
                    0
                ),
                3000.0,
                "Deeper formations carry higher risk"
            ),
        ]

        total_score = 0
        scored = []

        for name, value, threshold, reason in factors:

            score = (
                min(
                    abs(value / threshold),
                    3.0
                )
                if threshold
                else 0
            )

            scored.append(
                (
                    name,
                    value,
                    score,
                    reason
                )
            )

            total_score += score

        total_score = (
            total_score
            or 1.0
        )

        for (
            name,
            value,
            score,
            reason
        ) in sorted(
            scored,
            key=lambda x: x[2],
            reverse=True
        ):

            explanations.append({

                "feature": name,

                "value": round(
                    float(value),
                    4
                ),

                "shap_value": round(
                    score,
                    4
                ),

                "impact": (
                    "Increases Risk"
                    if score > 1.0
                    else "Decreases Risk"
                ),

                "contribution_percent": round(
                    (score / total_score) * 100,
                    1
                ),
            })

        return explanations


# Singleton instance
ml_service = MLService()