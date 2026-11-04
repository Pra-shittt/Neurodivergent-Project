from fastapi import APIRouter, HTTPException, Request

from api.schemas import AnalyzeRequest

router = APIRouter()


@router.get("/health")
async def health(request: Request):
    initialized = request.app.state.engine is not None
    return {
        "status": "ok" if initialized else "initializing",
        "model_initialized": initialized,
    }


@router.post("/analyze")
async def analyze(payload: AnalyzeRequest, request: Request):
    engine = request.app.state.engine
    if engine is None:
        raise HTTPException(status_code=503, detail="NLP model is not initialized")
    try:
        return await request.app.state.run_in_threadpool(engine.analyze, payload.text)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Journal analysis failed") from exc
