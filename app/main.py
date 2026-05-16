
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # Runs on startup - creates table if it doesn't exist
    yield      # App runs here
               # Anything after yield would run on shutdown

app = FastAPI(lifespan=lifespan)

@app.get("/")
def root():
  return {"message": "Claude is starting to take over the world! *cough* I mean, tasked is ALIVE!"}
