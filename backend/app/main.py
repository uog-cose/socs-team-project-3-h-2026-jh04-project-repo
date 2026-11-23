from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import register_exception_handlers

# debug is not passed to FastAPI, because debug mode sends tracebacks to the browser.
app = FastAPI(title="pyMechT GUI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)


@app.get("/health")
def health():
    return {"status": "ok"}