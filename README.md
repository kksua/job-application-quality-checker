<p align="center">
  <img
    src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=36&pause=1500&color=6C5FC7&center=true&vCenter=true&width=950&lines=Job+Application+Quality+Checker"
    alt="Job Application Quality Checker"
  />
</p>

<p align="center">
  A full-stack CV analysis tool that compares a candidate CV with a job description, checks ATS readiness, identifies skill gaps, generates AI-assisted improvements and exports CV as a pdf.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-6C5FC7?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-8B7FE8?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-6C5FC7?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-8B7FE8?style=for-the-badge&logo=openai&logoColor=white" />
</p>

---

**Live application:**  [Joblyst](https://joblyst-ai.vercel.app/)

**Demo video:**  




https://github.com/user-attachments/assets/c53f4dab-907a-4e45-b1d4-6d99ffcf4a66



> The demo shows the workflow from CV analysis to structured editing, AI tailoring and bullet rewriting.

---

## About the Project

Job Application Quality Checker is a full-stack application designed to help candidates understand how well their CV matches a specific job description and improve it before applying.

Users can paste or upload a CV, analyse it against a target role, review ATS readiness and skill gaps, generate AI-assisted improvements, edit the structured CV and export the final version.

---

## Main Features

- CV vs job description analysis using plain text or pdf as input
- Weighted job-match score 
- ATS readiness analysis
- AI-generated job-specific headline and summary
- AI bullet rewriting for experience and projects
- Editable CV sections
- PDF CV export

---

## Tech Stack


<p>
  <img src="https://img.shields.io/badge/Frontend-6C5FC7?style=for-the-badge&logoColor=white" />
  &nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;   React · TypeScript · Vite · Vitest · CSS
</p>

<p>
  <img src="https://img.shields.io/badge/Backend-8B7FE8?style=for-the-badge&logoColor=white" />
  &nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;   Python 3.11+ · FastAPI · Pydantic · pytest · Ruff · mypy
</p>

<p>
  <img src="https://img.shields.io/badge/AI-9B8FE0?style=for-the-badge&logoColor=white" />
  &nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;   OpenAI API · Structured AI Responses · Prompt-Based CV Tailoring · Fact-Preservation Guardrails
</p>

<p>
  <img src="https://img.shields.io/badge/DevOps-B8AEF0?style=for-the-badge&logoColor=white" />
  &nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;&nbsp;   Git · GitHub · GitHub Actions · Vercel
</p>

---

## Installation

### Clone the repository
```bash
git clone https://github.com/kksua/job-application-quality-checker.git
cd job-application-quality-checker
```

### Backend setup
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

### Frontend

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

---

## Future improvements

- AI tailoring for imported CV pdf
- Better PDF layout extraction
- docx CV export
- Job URL import
- Multiple CV templates
- Multilingual CV tailoring
- Before vs after match-score comparison
- User accounts



