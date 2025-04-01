import time
from threading import Event
import pigpio
from src.config import PI, SIGNAL_PIN
import src.state as state

def edge_callback(gpio, level, tick):
    """
    Callback invoked on a rising edge.
    """
    with state.data_lock:
        if state.last_tick is not None:
            cycle_time = pigpio.tickDiff(state.last_tick, tick)
            state.cycle_times.append(cycle_time)
            state.edge_count += 1
        state.last_tick = tick

def monitor_gpio(stop_event: Event):
    """
    Monitors the GPIO pin for rising edges and periodically updates shared state.
    """
    if not state.pigpio_enabled:
        # Update API data with a default value when pigpio is disabled.
        while not stop_event.is_set():
            with state.api_data_lock:
                state.latest_avg_cycle_time = 10
                state.last_update_time = time.time()
                state.edge_count_in_period = 0
            stop_event.wait(0.1)
        return

    try:
        # Set up the GPIO pin for edge detection.
        PI.set_mode(SIGNAL_PIN, pigpio.INPUT)
        PI.set_pull_up_down(SIGNAL_PIN, pigpio.PUD_DOWN)
        cb = PI.callback(SIGNAL_PIN, pigpio.RISING_EDGE, edge_callback)

        # Monitor and update the API shared data.
        while not stop_event.is_set():
            time.sleep(0.01)
            with state.data_lock:
                current_cycle_times = state.cycle_times.copy()
                current_edge_count = state.edge_count
                state.cycle_times.clear()
                state.edge_count = 0

            avg = None
            if current_edge_count > 0 and current_cycle_times:
                avg = sum(current_cycle_times) / len(current_cycle_times)

            with state.api_data_lock:
                state.latest_avg_cycle_time = avg
                state.last_update_time = time.time()
                state.edge_count_in_period = current_edge_count

    except Exception as e:
        print(f"Error in GPIO monitoring: {e}")
    finally:
        if state.pigpio_enabled and PI.connected:
            cb.cancel()
            PI.stop()

def test_pigpio():
    """
    Tests if pigpio can be used for edge detection.
    Returns True if successful, otherwise False.
    """
    try:
        PI.set_mode(SIGNAL_PIN, pigpio.INPUT)
        PI.set_pull_up_down(SIGNAL_PIN, pigpio.PUD_DOWN)
        test_cb = PI.callback(SIGNAL_PIN, pigpio.RISING_EDGE, lambda g, l, t: None)
        test_cb.cancel()
        return True
    except Exception as e:
        print(f"Warning: pigpio not working for edge detection: {e}")
        return False
