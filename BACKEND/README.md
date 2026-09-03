# OIL eRTMAC - Backend API & Simulator

This is the FastAPI backend and virtual rig simulator for the Oil India eRTMAC predictive engine.

## ⚠️ Important: Dataset Required
Because the Equinor Volve telemetry dataset is over 400MB, it is not tracked in this GitHub repository. 

**To run the simulator, you MUST:**
1. Get the `OIL_DEMO_DATASET.csv` file (Download it here: `https://drive.google.com/file/d/1ttT4GV7AoFyV37m-F-VEMcgP_dsSS9BX/view?usp=sharing` or ask the team lead).
2. Place `OIL_DEMO_DATASET.csv` directly inside this `BACKEND` folder.

## How to Run the Backend
You will need two terminals to run the full simulation.

**Terminal 1: Start the AI API**
```bash
pip install -r requirements.txt
uvicorn main:app --reload