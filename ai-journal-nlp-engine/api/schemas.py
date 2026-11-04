from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20_000)


class HealthResponse(BaseModel):
    status: str
    model_initialized: bool
