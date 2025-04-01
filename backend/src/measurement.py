import time
import csv
from threading import Event
from src.config import MEASUREMENTS_DIR
import src.state as state

def record_measurement(filepath: str, stop_event: Event, start_time: float,
                       calibration_slope: float, calibration_intercept: float):
    """
    Records measurement data to a CSV file at 100ms intervals until stop_event is set.
    Each row contains:
      - elapsed_ms: elapsed time (in milliseconds) since the start of the recording.
      - average_cycle_time_us: the current average cycle time (in microseconds).
      - water_level_mm: calculated using:
            water_level_mm = calibration_slope * average_cycle_time_us + calibration_intercept

    Only records a measurement if the calculated water level (water_level_mm) is above 0.
    """
    try:
        with open(filepath, mode="w", newline="") as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(
                ["elapsed_ms", "average_cycle_time_us", "water_level_mm"])
            while not stop_event.is_set():
                current_time = time.time()
                elapsed_ms = (current_time - start_time) * 1000  # to ms
                with state.api_data_lock:
                    avg = state.latest_avg_cycle_time
                # If no average cycle time is available, treat it as 0
                avg_value = avg if avg is not None else 0
                water_level_mm = calibration_slope * avg_value + calibration_intercept
                # Only record measurements with water level above 0
                if water_level_mm > 0:
                    writer.writerow(
                        [f"{elapsed_ms:.2f}", avg_value, water_level_mm])
                    csvfile.flush()
                stop_event.wait(0.1)
    except Exception as e:
        print(f"Error while recording measurement: {e}")
