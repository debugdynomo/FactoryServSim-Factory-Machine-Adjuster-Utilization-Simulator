import requests
import time

BASE_URL = "https://factoryservsim-factory-machine-adjuster.onrender.com/api"
session = requests.Session()

def create_owner():
    print("Registering owner...")
    res = session.post(f"{BASE_URL}/auth/register/owner", json={
        "factory_id": "STARK-NEW-01",
        "factory_name": "Stark Industries (New)",
        "owner_name": "Tony Stark",
        "email": "tony@stark-industries-new.com",
        "password": "password123"
    })
    print(res.status_code, res.text)

def create_manager():
    print("Registering manager...")
    res = session.post(f"{BASE_URL}/auth/register/manager", json={
        "factory_id": "STARK-NEW-01",
        "manager_name": "Pepper Potts",
        "email": "pepper@stark-industries-new.com",
        "password": "password123"
    })
    print(res.status_code, res.text)

def login():
    print("Logging in owner...")
    res = session.post(f"{BASE_URL}/auth/login", json={
        "factory_id": "STARK-NEW-01",
        "email": "tony@stark-industries-new.com",
        "password": "password123"
    })
    print(res.status_code, res.text)
    if res.status_code == 200:
        token = res.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})

def update_rates():
    print("Setting adjuster rates...")
    for rate in [{"name": "Mechanic", "rate": 50}, {"name": "Electrician", "rate": 75}]:
        res = session.put(f"{BASE_URL}/owner/adjuster-categories/{rate['name']}?hourly_rate={rate['rate']}")
        print(res.status_code, res.text)

def run_simulation():
    print("Running simulation as owner...")
    payload = {
        "simulation_time": 8,
        "machine_categories": [{"name": "Assembly Arm", "count": 10, "mttf": 100, "mean_repair_time": 2}],
        "adjusters": [{"id": 1, "name": "Mechanic", "expertise": ["Assembly Arm"]}],
    }
    res = session.post(f"{BASE_URL}/simulation/run?save_report=true&report_name=Arc Reactor Assembly", json=payload)
    print(res.status_code, "Simulation complete")

if __name__ == "__main__":
    create_owner()
    create_manager()
    login()
    update_rates()
    run_simulation()
