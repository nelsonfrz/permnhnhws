from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import time
import os
import csv
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit
from scipy.stats import linregress

from threading import Event, Thread

import src.state as state
from src.config import MEASUREMENTS_DIR, CONFIG_DIR
from src.measurement import record_measurement


router = APIRouter(prefix="/api")


class Calibration(BaseModel):
    calibration_slope: float
    calibration_intercept: float


@router.get("/cycle_time")
def get_cycle_time():
    with state.api_data_lock:
        response = {
            "timestamp": state.last_update_time,
            "edge_count": state.edge_count_in_period,
            "average_cycle_time_us": state.latest_avg_cycle_time,
        }
    if response["average_cycle_time_us"] is None:
        response["message"] = "No edges detected in last measurement period"
    return response


@router.get("/health")
def health_check():
    # Local import to avoid circular dependency issues.
    from src.config import PI
    return {"status": "ok", "pigpio_connected": state.pigpio_enabled and PI.connected}


@router.post("/measurements/start")
def start_measurement(calibration: Calibration):
    """
    Starts a new measurement recording session using calibration parameters.
    """
    try:
        with state.measurement_lock:
            if state.measurement_in_progress:
                raise HTTPException(
                    status_code=400, detail="Measurement already in progress.")
            state.measurement_in_progress = True

        state.measurement_start_time = time.time()
        state.measurement_filename = f"measurement_{int(state.measurement_start_time)}.csv"
        filepath = os.path.join(MEASUREMENTS_DIR, state.measurement_filename)

        state.measurement_stop_event = Event()
        state.measurement_thread = Thread(
            target=record_measurement,
            args=(
                filepath,
                state.measurement_stop_event,
                state.measurement_start_time,
                calibration.calibration_slope,
                calibration.calibration_intercept,
            ),
            daemon=True
        )
        state.measurement_thread.start()

        return {
            "message": "Measurement recording started. When ready, POST to /api/measurements/stop to finish the recording."
        }
    except Exception as e:
        print(e)


@router.post("/measurements/stop")
def stop_measurement():
    """
    Stops the current measurement recording session and computes metadata for the recording.
    """
    with state.measurement_lock:
        if not state.measurement_in_progress:
            raise HTTPException(
                status_code=400, detail="No measurement in progress to stop.")
        state.measurement_in_progress = False

    state.measurement_stop_event.set()
    state.measurement_thread.join()

    # Compute metadata from the CSV file.
    csv_filepath = os.path.join(MEASUREMENTS_DIR, state.measurement_filename)
    row_count = 0
    duration_ms = 0.0
    try:
        with open(csv_filepath, "r", newline="") as csvfile:
            reader = csv.DictReader(csvfile)
            rows = list(reader)
            row_count = len(rows)
            if rows:
                # Use the elapsed_ms value from the last row as the recording duration.
                last_row = rows[-1]
                duration_ms = float(last_row["elapsed_ms"])
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing measurement file: {e}")

    metadata = {
        "filename": state.measurement_filename,
        "created_at": state.measurement_start_time,
        "duration_ms": duration_ms,
        "row_count": row_count,
    }

    # Save metadata to a JSON file (with the same base name as the CSV).
    metadata_filename = state.measurement_filename.replace(".csv", ".json")
    metadata_filepath = os.path.join(MEASUREMENTS_DIR, metadata_filename)
    try:
        with open(metadata_filepath, "w") as f:
            json.dump(metadata, f)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error saving metadata: {e}")

    file_link = f"/api/files/{state.measurement_filename}"
    return {"message": "Measurement recording finished.", "file_link": file_link, "metadata": metadata}


@router.get("/measurements")
def list_measurements():
    """
    Lists all analysis of measurement recordings.
    """
    try:
        files = os.listdir(MEASUREMENTS_DIR)
        metadata_files = [f for f in files if f.endswith(
            ".json") and f.startswith("measurement_")]
        analysis_images = [f for f in files if f.startswith(
            "analysis_") and f.endswith(".png")]
        measurements = []
        for meta_file in metadata_files:
            meta_path = os.path.join(MEASUREMENTS_DIR, meta_file)
            with open(meta_path, "r") as f:
                meta = json.load(f)
            meta["file_link"] = f"/api/files/{meta['filename']}"
            measurements.append(meta)
        measurements.sort(key=lambda m: m.get("created_at", 0), reverse=True)
        analysis_links = [f"/api/files/{img}" for img in analysis_images]
        return {"measurements": measurements, "analysis_images": analysis_links}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error listing measurements: {e}")

class AnalysisRequest(BaseModel):
    filename: str
    start_elapsed: float
    end_elapsed: float
    bins: int
    conversion_factor: float

def safe_format(x, fmt):
    return format(x, fmt) if x is not None and np.isfinite(x) else "NaN"

@router.post("/measurements/analyse")
def analyse_measurement(analysis: AnalysisRequest):
    file_path = os.path.join(MEASUREMENTS_DIR, analysis.filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "Measurement file not found.")
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        raise HTTPException(500, f"Error reading CSV file: {e}")

    start_elapsed = analysis.start_elapsed if analysis.start_elapsed not in [None, 0] else df["elapsed_ms"].min()
    end_elapsed = analysis.end_elapsed if analysis.end_elapsed not in [None, 0] else df["elapsed_ms"].max()
    df = df[(df["elapsed_ms"] >= start_elapsed) & (df["elapsed_ms"] <= end_elapsed)]
    if df.empty:
        raise HTTPException(400, "No data within specified elapsed time range.")

    df = df[df["water_level_mm"] > 0]  # Remove non-positive water levels
    if df.empty:
        raise HTTPException(400, "No valid water level data after filtering.")

    t = df["elapsed_ms"]
    h = df["water_level_mm"]

    try:
        def exp_func(t_in, a, b):
            return a * np.exp(b * t_in)
        t_offset = t.iloc[0]
        t_scale = (t.iloc[-1] - t.iloc[0]) if (t.iloc[-1] - t.iloc[0]) > 0 else 1000.0
        h_scale = h.iloc[0] if h.iloc[0] > 0 else (h.mean() if h.mean() > 0 else 1.0)
        t_fit = (t - t_offset) / t_scale
        h_fit = h / h_scale
        p0 = [1.0, -0.00001 * t_scale]
        popt, _ = curve_fit(exp_func, t_fit.values, h_fit.values, p0=p0, maxfev=10000)
        a_s, b_s = popt
        fitted_h = h_scale * exp_func(t_fit, a_s, b_s)
        dt = t.diff()
        h_prev = fitted_h.shift(1)
        with np.errstate(divide="ignore", invalid="ignore"):
            ks_exp = analysis.conversion_factor / dt * np.log(h_prev / fitted_h)
        ks_exp_clean = ks_exp[np.isfinite(ks_exp)]
        if ks_exp_clean.empty:
            method1_ks_mean, method1_ks_std = None, None
        else:
            method1_ks_mean = np.mean(ks_exp_clean)
            method1_ks_std = np.std(ks_exp_clean)
    except Exception as e:
        raise HTTPException(500, f"Exponential regression failed: {e}")

    try:
        lr_result = linregress(t, np.log(h))
        method2_ks = -lr_result.slope * analysis.conversion_factor
        r_squared = lr_result.rvalue ** 2
    except Exception as e:
        raise HTTPException(500, f"Linear regression failed: {e}")

    fig, axs = plt.subplots(2, 2, figsize=(12, 10))
    axs = axs.flatten()
    axs[0].scatter(t, h, color="blue")
    axs[0].plot(t, fitted_h, color="red")
    axs[0].set_xlabel("Elapsed Time (ms)")
    axs[0].set_ylabel("Water Level (mm)")
    axs[0].set_title("Water Level vs Time")
    axs[1].scatter(t, np.log(h), color="blue")
    axs[1].plot(t, lr_result.slope * t + lr_result.intercept, color="red")
    axs[1].set_xlabel("Elapsed Time (ms)")
    axs[1].set_ylabel("ln(Water Level)")
    axs[1].set_title("Log Water Level vs Time")
    valid_ks = ks_exp.dropna()
    axs[2].hist(valid_ks, bins=analysis.bins, color="green", alpha=0.7)
    axs[2].set_xlabel("$k_s$")
    axs[2].set_ylabel("Frequency")
    ks_dict = {
        "Silty clay": 0.0003,
        "Silty clay loam": 0.0012,
        "Sandy clay": 0.0020,
        "Clay": 0.0033,
        "Clay loam": 0.0043,
        "Silt": 0.0042,
        "Silt loam": 0.0075,
        "Loam": 0.0173,
        "Sandy clay loam": 0.0218,
        "Sandy loam": 0.0737,
        "Loamy sand": 0.2432,
        "Sand": 0.4950
    }
    nearest_soil_texture = min(ks_dict, key=lambda k: abs(ks_dict[k] / 6000 - method2_ks))
    axs[3].axis("off")
    summary = (
        f"1. Exponential Regression\n"
        f"  $k_s$: {safe_format(method1_ks_mean, '.3e')}\n"
        f"  $\sigma$: {safe_format(method1_ks_std, '.3e')}\n\n"
        f"2. Linear Regression\n"
        f"  $k_s$: {safe_format(method2_ks, '.3e')}\n"
        f"  $R^2$: {safe_format(r_squared, '.5f')}\n\n"
        f"Conversion factor: {analysis.conversion_factor}\n"
        f"Measurement: {analysis.filename}\n"
        f"Nearest soil texture: {nearest_soil_texture}"
    )
    axs[3].text(0.1, 0.5, summary, fontsize=12)
    plt.tight_layout()
    analysis_filename = f"analysis_{int(time.time())}.png"
    analysis_filepath = os.path.join(MEASUREMENTS_DIR, analysis_filename)
    try:
        plt.savefig(analysis_filepath)
        plt.close(fig)
    except Exception as e:
        raise HTTPException(500, f"Failed to save analysis image: {e}")

    return {
        "message": "Analysis completed successfully.",
        "analysis_file": f"/api/files/{analysis_filename}",
        "results": {
            "ks_exponential": method1_ks_mean if method1_ks_mean is None else float(method1_ks_mean),
            "ks_exponential_std": method1_ks_std if method1_ks_std is None else float(method1_ks_std),
            "ks_linear": method2_ks if method2_ks is None else float(method2_ks),
            "ks_linear_r_squared": r_squared if r_squared is None else float(r_squared),
        },
    }


class DataPoint(BaseModel):
    x: float
    y: float


class CalibrationData(BaseModel):
    calibration_points: List[DataPoint]
    slope: float
    intercept: float


# Path to save the calibration data
CALIBRATION_FILE = os.path.join(CONFIG_DIR, "calibration.json")


def compute_default_regression(points):
    n = len(points)
    if n < 2:
        return 0, 0
    sumX = sum(pt['x'] for pt in points)
    sumY = sum(pt['y'] for pt in points)
    sumXY = sum(pt['x'] * pt['y'] for pt in points)
    sumXX = sum(pt['x'] * pt['x'] for pt in points)
    m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    b = (sumY - m * sumX) / n
    return m, b


@router.post("/calibration/save")
def save_calibration(calibration: CalibrationData):
    try:
        with open(CALIBRATION_FILE, "w") as f:
            json.dump(calibration.dict(), f)
        return {"message": "Calibration saved successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error saving calibration: {e}")


@router.get("/calibration")
def get_calibration():
    if not os.path.exists(CALIBRATION_FILE):
        # Return default calibration data if none is saved.
        default_points = [
            {"x": 1, "y": 31},
            {"x": 2, "y": 58},
            {"x": 3, "y": 85},
            {"x": 4, "y": 112},
            {"x": 5, "y": 139},
            {"x": 6, "y": 166},
            {"x": 7, "y": 193},
            {"x": 8, "y": 220}
        ]
        m, b = compute_default_regression(default_points)
        return {"calibration_points": default_points, "slope": m, "intercept": b}
    try:
        with open(CALIBRATION_FILE, "r") as f:
            data = json.load(f)
        return data
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error loading calibration: {e}")
