import os
import pigpio

SIGNAL_PIN = 23  # BCM numbering
PI = pigpio.pi("localhost", 8888)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEASUREMENTS_DIR = os.path.join(BASE_DIR, "measurements")
CONFIG_DIR = os.path.join(BASE_DIR, "config")
os.makedirs(MEASUREMENTS_DIR, exist_ok=True)
os.makedirs(CONFIG_DIR, exist_ok=True)
