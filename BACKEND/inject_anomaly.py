import pandas as pd

# 1. Read the extracted Volve CSV
file_name = "Norway-NA-15_47_9-F-9 A depth.csv"
print(f"[*] Loading massive dataset '{file_name}' (this may take a minute)...")

try:
    df = pd.read_csv(file_name, low_memory=False)
except FileNotFoundError:
    print("[-] Error: Make sure you UNZIPPED the file first!")
    exit()

# ==========================================
# 🎯 CHOOSE WHERE THE DISASTER HAPPENS
# ==========================================
disaster_row = 150  # Change this to whatever row you want!
# ==========================================

print(f"[*] Injecting massive Torque Spike and RPM failure at Row {disaster_row}...")

# 2. Modify the specific rows in the dataset to simulate a stuck pipe
# We spike the torque to 55.0 kNm and drop RPM to 0 for 5 rows
df.loc[disaster_row : disaster_row+5, 'SURF_TORQ'] = 55.0  
df.loc[disaster_row : disaster_row+5, 'SURF_RPM'] = 0.0    

# 3. Save it as a brand new file for your Hackathon Demo
demo_file = "OIL_DEMO_DATASET.csv"
df.to_csv(demo_file, index=False)

print(f"[+] Success! Your custom demo data is saved as '{demo_file}'.")