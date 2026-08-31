import psycopg2

print("Starting Database Password Diagnostics...\n")

# These are the 3 passwords you have mentioned so far
passwords_to_try = ["password", "bkm@20", "admin123"]

found_password = None

for pwd in passwords_to_try:
    print(f"[*] Trying password: {pwd}")
    try:
        # Try to connect directly to PostgreSQL
        conn = psycopg2.connect(
            dbname="drilling_db", 
            user="postgres", 
            password=pwd, 
            host="localhost", 
            port="5432"
        )
        print(f"\n[+] SUCCESS! The actual database password is: {pwd}")
        conn.close()
        found_password = pwd
        break
    except Exception as e:
        print(f"[-] FAILED. It is not '{pwd}'.")

if not found_password:
    print("\n[-] Critical Error: None of the passwords worked.")
    print("We need to reset it using pgAdmin (the visual interface).")