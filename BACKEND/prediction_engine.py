import joblib
import pandas as pd


FEATURES = [
    'Depth',
    'ROP_mean_5min',
    'WOB_mean',
    'RPM_mean',
    'Torque_mean_5min',
    'SPP_mean',
    'MudWeight',
    'ECD',
    'HistoricalLossCount',
    'HistoricalStuckPipeCount',
    'FormationRiskScore',
    'FlowRate',
    'Inclination',
    'Azimuth',
    'DistanceToNearestRiskWell',
    'Torque_trend',
    'SPP_trend',
    'ROP_trend'
]


# Load models once when the application starts
stuck_model = joblib.load("models/stuck_pipe_model.pkl")
mud_loss_model = joblib.load("models/mud_loss_model.pkl")


def get_risk_level(probability):
    """
    Convert probability into a simple risk level.
    """

    if probability < 0.10:
        return "LOW"
    elif probability < 0.50:
        return "MEDIUM"
    else:
        return "HIGH"


def predict_risk(data):
    """
    Run Stuck Pipe and Mud Loss predictions.

    data must contain all 18 required features.
    """

    # Check that all required features are present
    missing_features = [
        feature for feature in FEATURES
        if feature not in data
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {missing_features}"
        )

    # Check that all feature values are numeric
    for feature in FEATURES:
        if not isinstance(data[feature], (int, float)):
            raise ValueError(
                f"{feature} must be a numeric value"
            )

    # Convert input into a DataFrame
    input_data = pd.DataFrame([data])

    # Ensure correct feature order
    input_data = input_data[FEATURES]

    # Stuck Pipe prediction
    stuck_prediction = stuck_model.predict(input_data)[0]
    stuck_probability = stuck_model.predict_proba(input_data)[0][1]

    # Mud Loss prediction
    mud_loss_prediction = mud_loss_model.predict(input_data)[0]
    mud_loss_probability = mud_loss_model.predict_proba(input_data)[0][1]

    return {
        "stuck_pipe": {
            "prediction": int(stuck_prediction),
            "probability": float(stuck_probability),
            "risk_level": get_risk_level(stuck_probability)
        },
        "mud_loss": {
            "prediction": int(mud_loss_prediction),
            "probability": float(mud_loss_probability),
            "risk_level": get_risk_level(mud_loss_probability)
        }
    }