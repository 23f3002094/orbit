from fastapi import FastAPI


app = FastAPI(
    title="Orbit API",
    version="0.1.0",
    description="API for the Orbit productivity app.",
)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Report whether the API process is available."""
    return {"status": "ok"}
