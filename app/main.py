
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
  return {"message": "Claude is starting to take over the world! *cough* I mean, tasked is ALIVE!"}
