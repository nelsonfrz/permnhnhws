from threading import Lock

# Shared state for GPIO monitoring
data_lock = Lock()
cycle_times = []
edge_count = 0
last_tick = None

# Shared state for API data (updated periodically)
api_data_lock = Lock()
latest_avg_cycle_time = None
last_update_time = None
edge_count_in_period = 0

# Global measurement state
measurement_in_progress = False
measurement_lock = Lock()
measurement_thread = None
measurement_stop_event = None
measurement_start_time = None
measurement_filename = None

# Flag to indicate if pigpio is enabled
pigpio_enabled = True
