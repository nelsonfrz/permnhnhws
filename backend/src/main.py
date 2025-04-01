from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from contextlib import asynccontextmanager
from threading import Thread, Event
from src.config import MEASUREMENTS_DIR
import src.state as state
from src.gpio import test_pigpio, monitor_gpio
from src.routes import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not test_pigpio():
        state.pigpio_enabled = False
        print("Warning: pigpio disabled. Edge detection will not run and average cycle time will be 0.")
    else:
        state.pigpio_enabled = True

    stop_event = Event()
    monitor_thread = Thread(target=monitor_gpio, args=(stop_event,))
    monitor_thread.start()
    yield
    stop_event.set()
    monitor_thread.join()

app = FastAPI(lifespan=lifespan)

# CORS configuration.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/files", StaticFiles(directory=MEASUREMENTS_DIR), name="measurements")

app.include_router(router)

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001)
