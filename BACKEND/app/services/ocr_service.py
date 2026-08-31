import os
import sys
import logging

logger = logging.getLogger("NWIS.OCR")

# Add parent directory so multimodal_extractor can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


class OCRService:
    """
    Enterprise OCR service wrapping EasyOCR-based document intelligence.
    Lazy-loads the heavy neural model on first use.
    """

    def __init__(self):
        self._engine = None

    def _load_engine(self):
        if self._engine is None:
            logger.info("Loading Neural OCR Engine (EasyOCR)...")
            from multimodal_extractor import ProductionDocumentIntelligence
            self._engine = ProductionDocumentIntelligence()
            logger.info("Neural OCR Engine ready.")

    def extract_text(self, file_path: str) -> str:
        """Extract text from an image or PDF file using deep learning OCR."""
        self._load_engine()
        return self._engine.extract_text_from_document(file_path)

    @staticmethod
    def classify_text(raw_text: str) -> dict:
        """
        AI Feature Engine: classifies extracted text into categories
        and detects drilling anomalies with risk scoring.
        """
        detected_entities = []
        has_anomaly = False
        risk_score = 1
        text_lower = raw_text.lower()

        # ── Stuck Pipe Indicators ────────────────────────────
        stuck_keywords = ["stuck", "stuck pipe", "pipe stuck", "overpull", "tight hole", "pack-off"]
        for kw in stuck_keywords:
            if kw in text_lower:
                has_anomaly = True
                detected_entities.append("Stuck Pipe Indicator")
                risk_score = max(risk_score, 8)
                break

        # ── Torque Anomaly ───────────────────────────────────
        torque_keywords = ["torque spike", "high torque", "torque increase", "erratic torque"]
        for kw in torque_keywords:
            if kw in text_lower:
                has_anomaly = True
                detected_entities.append("Mechanical Torque Spike")
                risk_score = max(risk_score, 7)
                break

        # ── Mud Loss Indicators ──────────────────────────────
        loss_keywords = ["losses", "mud loss", "lost circulation", "partial loss", "total loss", "seepage"]
        for kw in loss_keywords:
            if kw in text_lower:
                has_anomaly = True
                detected_entities.append("Mud Loss / Lost Circulation")
                risk_score = max(risk_score, 8)
                break

        # ── Kick / Well Control ──────────────────────────────
        kick_keywords = ["kick", "well control", "influx", "gas cut", "flow check positive"]
        for kw in kick_keywords:
            if kw in text_lower:
                has_anomaly = True
                detected_entities.append("Kick / Well Control Event")
                risk_score = max(risk_score, 10)
                break

        # ── Wellbore Instability ─────────────────────────────
        instability_keywords = ["cavings", "borehole collapse", "wellbore instability", "hole enlargement", "breakout"]
        for kw in instability_keywords:
            if kw in text_lower:
                has_anomaly = True
                detected_entities.append("Wellbore Instability")
                risk_score = max(risk_score, 6)
                break

        # ── H2S / Safety ─────────────────────────────────────
        safety_keywords = ["h2s", "hydrogen sulfide", "toxic gas", "blowout"]
        for kw in safety_keywords:
            if kw in text_lower:
                has_anomaly = True
                detected_entities.append("Safety Hazard (H2S/Blowout)")
                risk_score = 10
                break

        return {
            "data_category": "Incident Observation" if has_anomaly else "Routine Daily Log",
            "risk_score": risk_score,
            "detected_entities": detected_entities,
            "has_anomaly": has_anomaly
        }


# Singleton instance
ocr_service = OCRService()
