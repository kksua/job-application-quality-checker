# Job Application Quality Checker

A full-stack application for comparing a candidate CV with a job description, checking ATS readiness, parsing pasted CV text into a structured editable preview, and exporting an A4 PDF CV.

## Stack

- Backend: Python 3.11, FastAPI, Pydantic, pytest, Ruff, mypy
- Frontend: React, TypeScript, Vite, Vitest
- AI features: OpenAI-backed tailoring suggestions and bullet rewriting

## Backend

```bash
cd backend
source .venv/bin/activate
python -m pip install -e ".[dev]"
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`.

Required environment variable for AI features:

```bash
cp .env.example .env
OPENAI_API_KEY=...
```

Core checks:

```bash
ruff format .
ruff check .
mypy app
pytest
```

## Frontend

```bash
cd frontend
npm run dev
```

The app runs at `http://127.0.0.1:5173`.

Optional frontend environment override:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Core checks:

```bash
npm run build
npm run lint
npm run test:run
```

## Launch Checklist

1. Start the backend on port `8000`.
2. Start the frontend on port `5173`.
3. Open the frontend and paste a CV plus job description.
4. Run analysis and confirm results, structured preview, editing, AI tailoring, bullet rewriting, and PDF export.
