# TrialTwin

**Clinical trial representation simulator. Built on a scientometric audit of 98 NCCN-cited RCC studies (MIT Critical Data).**

TrialTwin runs a vectorized Monte Carlo simulation of a planned clinical trial and projects the likely demographic and geographic composition of the enrolled cohort. It reports a Representation Equity Score (RES), Jensen-Shannon divergence and empirical Chi-Square rate against disease-burden baselines, and a ranked list of computational site recommendations.

**TrialTwin simulates. It does not predict.**

---

## Run it (Docker)

Requires Docker + Docker Compose. Optionally [Ollama](https://ollama.com) on the host machine for LLM-generated recommendation rationale (graceful fallback if absent).

```bash
# Optional: pull the small LLM for rationale generation
ollama pull qwen2.5:3b

# Start everything
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

## Run it (local dev, no Docker)

**Backend:**

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 --app-dir ..
```

(Or from the project root: `PYTHONPATH=. uvicorn backend.main:app --reload`.)

**Frontend:**

```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE=http://localhost:8000 npm run dev
```

## Architecture

```
trialtwin/
├── backend/
│   ├── main.py                          # FastAPI app, SSE streaming, SQLite persistence
│   ├── schemas.py                       # Pydantic v2 schemas
│   ├── db.py                            # aiosqlite persistence
│   ├── data/                            # All JSON priors (with _provenance keys)
│   │   ├── rcc_incidence.json           # GLOBOCAN 2022 regional shares (sums to 1.000)
│   │   ├── enrollment_priors.json       # Per-country participation + accessibility
│   │   ├── demographic_priors.json      # Sex/age by country (with fallback flags)
│   │   ├── seer_us_demographics.json    # US race (non-Hispanic) + Hispanic ethnicity
│   │   ├── audit_98_studies.json        # 98 NCCN-cited RCC studies metadata
│   │   └── country_metadata.json        # ISO codes, names, regions, centroids
│   ├── simulation/
│   │   ├── monte_carlo.py               # Chunked, vectorized NumPy core
│   │   ├── orchestrator.py              # Runs full pipeline in a worker process
│   │   ├── rq.py                        # RQ + RES (geometric mean, ε = 1e-4)
│   │   ├── stats.py                     # JSD + empirical Chi-Square rate
│   │   ├── recommendations.py           # ΔRES ranking with mini-simulations
│   │   ├── utils.py                     # largest-remainder, age-eligibility
│   │   └── data_loader.py               # Cached + validated data access
│   ├── llm/
│   │   ├── ollama_client.py             # JSON-schema-bound Ollama client
│   │   └── rationale.py                 # 2-sentence rationale + deterministic fallback
│   ├── parsers/
│   │   └── trial_text_parser.py         # Rules-based free-text → config dict
│   ├── docs/                            # validation_note.md, res_epsilon_sensitivity.md
│   └── tests/                           # Smoke test for the engine
└── frontend/
    ├── app/                             # Next.js 14 app router pages
    ├── components/                      # ui/forms/results/map/audit primitives
    ├── lib/                             # api client, Zustand store, formatters
    └── tailwind.config.ts               # All custom colors + fonts registered
```

## Statistical methodology — short version

- **RQ** = (enrolled share of region) / (incidence share of region).
- **RES** = weighted geometric mean of RQ values, weights = global incidence shares, with ε = 1×10⁻⁴ for log-stability. Sensitivity-tested across [1e-5, 1e-3]; rank order is stable.
- **JSD** = Jensen-Shannon divergence between projected and incidence baseline. Symmetric, bounded [0, 1].
- **Chi-Square empirical rate** = fraction of simulated runs whose Chi-Square statistic exceeds the α = 0.05 critical value. Avoids the spurious analytical p-value problem of using a single mean vector with very large N.
- Random seeds are deterministic per chunk so a stored seed reproduces an entire run.

## Volunteered limitations

1. Priors reflect publication patterns, not clinical recruitment feasibility.
2. Regional shares sum to 1 (compositional data) — independence assumptions do not hold.
3. Race/ethnicity simulation is calibrated against US SEER data only.

## Not for use in IRB submission or trial protocol design.

This is a research planning sandbox. The science is the moat — the UI presents it.
