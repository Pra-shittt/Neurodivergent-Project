import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from api.routes import router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = None
    app.state.run_in_threadpool = run_in_threadpool
    try:
        from app.hybrid_engine import HybridEngine

        app.state.engine = await asyncio.to_thread(HybridEngine)
        logger.info("HybridEngine and SentenceTransformer initialized")
    except Exception:
        logger.exception("Failed to initialize the NLP model")
    yield


app = FastAPI(title="AI Journal NLP Engine", lifespan=lifespan)

# Allow cross-origin requests from development and deployed frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api.main:app", host="0.0.0.0", port=int(os.getenv("PORT", "7860")))
