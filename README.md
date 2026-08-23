# Job Application Tracker — Backend API

![Tests](https://github.com/pradeepv777/Job-Application-Tracker-Backend/actions/workflows/test.yml/badge.svg)

A REST API for job seekers to manage their entire placement journey in one place. Track applications, schedule interviews, upload your resume, and get analytics — all secured with JWT authentication.

---

## Features

- **JWT Authentication** — register, login, and protect every route with Bearer tokens
- **Job Applications** — full CRUD with pagination, search, status filter, and multi-field sorting
- **Interview Tracking** — schedule and manage interview rounds linked to applications
- **Resume Management** — upload, download, and delete PDF resumes (5 MB limit)
- **Dashboard** — application count broken down by status
- **Analytics** — salary statistics, success rate, and interview metrics
- **Security** — bcrypt password hashing, ownership checks on every resource, security headers middleware, rate limiting on login

---

## Tech Stack

| Category | Technology |
|---|---|
| Language | Python 3.13 |
| Framework | FastAPI 0.141.1 |
| Server | Uvicorn |
| Database | PostgreSQL 17 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Authentication | JWT via python-jose |
| Password Hashing | Passlib + bcrypt |
| Rate Limiting | SlowAPI |
| Containerization | Docker + Docker Compose |
| Testing | pytest + FastAPI TestClient |
| CI | GitHub Actions |

---

## Prerequisites

- **Docker + Docker Compose** (recommended), or
- **Python 3.13** and a running PostgreSQL 17 instance

---

## Quick Start — Docker (Recommended)

Docker runs the full stack (API + PostgreSQL) with a single command. Migrations run automatically on startup.

### 1. Clone the repository

```bash
git clone https://github.com/pradeepv777/Job-Application-Tracker-Backend.git
cd Job-Application-Tracker-Backend
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=job_application_tracker

DATABASE_URL=postgresql+psycopg://postgres:your-password@db:5432/job_application_tracker

SECRET_KEY=replace-with-a-random-secret-at-least-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

ALLOWED_ORIGINS=http://localhost:5173

UPLOAD_DIR=uploads/resumes
```

Generate a strong secret key:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

> `SECRET_KEY` must be at least 32 characters — the application validates this at startup and will refuse to start if it is too short.

### 3. Build and start

```bash
docker compose up --build
```

Alembic migrations run automatically before the server starts. The API is available at `http://localhost:8000`.

### 4. Stop

```bash
docker compose down
```

To also remove the database volume:

```bash
docker compose down -v
```

---

## Running Locally (Without Docker)

Requires Python 3.13 and a running PostgreSQL instance.

### 1. Clone and set up a virtual environment

```bash
git clone https://github.com/pradeepv777/Job-Application-Tracker-Backend.git
cd Job-Application-Tracker-Backend

# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=job_application_tracker

DATABASE_URL=postgresql+psycopg://postgres:your-password@localhost:5432/job_application_tracker

SECRET_KEY=replace-with-a-random-secret-at-least-32-chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

ALLOWED_ORIGINS=http://localhost:5173

UPLOAD_DIR=uploads/resumes
```

### 4. Apply database migrations

```bash
alembic upgrade head
```

### 5. Start the server

```bash
uvicorn -m app.main:app --reload
```

API available at `http://localhost:8000`.

---

## API Documentation

Interactive docs are available once the server is running:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## API Endpoints

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness check — returns `{"status": "ok"}` |

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register a new user |
| POST | `/auth/login` | No | Login and receive a JWT access token (rate limited: 5/min) |

### Applications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/applications` | Yes | Create a new application |
| GET | `/applications` | Yes | List applications (paginated, filterable, sortable) |
| GET | `/applications/{id}` | Yes | Get a single application |
| PUT | `/applications/{id}` | Yes | Update an application (full replace) |
| DELETE | `/applications/{id}` | Yes | Delete an application and its interviews |

**GET /applications query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 10 | Items per page (max 100) |
| `search` | string | — | Case-insensitive company name filter |
| `status` | string | — | Filter by status |
| `sort_by` | string | `id` | Sort field: `id`, `company`, `salary`, `status` |
| `order` | string | `asc` | Sort direction: `asc`, `desc` |

### Interviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/interviews` | Yes | Create an interview linked to an application |
| GET | `/interviews/application/{id}` | Yes | Get all interviews for an application |
| PUT | `/interviews/{id}` | Yes | Update an interview |
| DELETE | `/interviews/{id}` | Yes | Delete an interview |

### Resume

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/resume/upload` | Yes | Upload a PDF resume (max 5 MB) |
| GET | `/resume` | Yes | Get resume filename metadata |
| GET | `/resume/download` | Yes | Download the resume file |
| DELETE | `/resume` | Yes | Delete the resume |

### Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Yes | Application counts by status |

### Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/analytics` | Yes | Salary stats, status breakdown, interview metrics, success rate |

---

## Authentication

```
POST /auth/register   →   password hashed with bcrypt   →   stored in database
POST /auth/login      →   verify bcrypt hash            →   returns JWT access token

Protected request:
  Authorization: Bearer <token>
      ↓
  Token signature verified
      ↓
  User loaded from database
      ↓
  Route handler runs
```

---

## Database Schema

### users

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| name | String | Not null |
| email | String | Unique, not null |
| hashed_password | String | Not null |
| resume_path | String | Nullable |

### applications

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| user_id | Integer | FK → users.id, not null |
| company | String | Not null |
| role | String | Not null |
| salary | Integer | Not null |
| status | String | Applied / Interview / Offer / Rejected |

### interviews

| Column | Type | Constraints |
|---|---|---|
| id | Integer | Primary key |
| application_id | Integer | FK → applications.id |
| round | String | e.g. Technical Round 1 |
| date | Date | Interview date |
| time | Time | Interview time |
| interviewer | String | |
| notes | String | |
| result | String | Scheduled / Completed / Cancelled |

Deleting an application automatically deletes all its interviews.

---

## Running Tests

The test suite uses a dedicated PostgreSQL database (`test_tracker`) and never touches the production database.

### 1. Create the test database

```bash
psql -U postgres -c "CREATE DATABASE test_tracker;"
```

### 2. Apply migrations to the test database

```bash
DATABASE_URL=postgresql+psycopg://postgres:your-password@localhost:5432/test_tracker alembic upgrade head
```

### 3. Run the tests

```bash
pytest tests/ -v
```

The test suite will use `test_tracker` by default. Override with the `TEST_DATABASE_URL` environment variable if your setup differs.

---

## Project Structure

```
JobApplicationTracker-API/
├── app/
│   ├── auth/
│   │   ├── dependencies.py     # get_current_user dependency (JWT verification)
│   │   ├── hashing.py          # bcrypt password hashing and verification
│   │   └── jwt_handler.py      # JWT creation and verification
│   ├── models/
│   │   ├── user.py             # User SQLAlchemy model
│   │   ├── application.py      # Application SQLAlchemy model
│   │   └── interview.py        # Interview SQLAlchemy model
│   ├── routers/
│   │   ├── auth.py             # POST /auth/register, POST /auth/login
│   │   ├── application.py      # CRUD /applications
│   │   ├── interview.py        # CRUD /interviews
│   │   ├── resume.py           # /resume upload, download, delete
│   │   ├── dashboard.py        # GET /dashboard
│   │   └── analytics.py        # GET /analytics
│   ├── schemas/
│   │   ├── user.py             # UserCreate, RegisterResponse, TokenResponse
│   │   ├── application.py      # Application, ApplicationRead, PaginatedApplicationResponse
│   │   └── interview.py        # InterviewCreate, InterviewRead, InterviewUpdate
│   ├── config.py               # Pydantic settings, reads .env
│   ├── database.py             # SQLAlchemy engine, session, get_db()
│   ├── enums.py                # ApplicationStatus, InterviewResult
│   └── main.py                 # FastAPI app, middleware, routers
├── alembic/
│   └── versions/               # Migration files
├── tests/
│   ├── conftest.py             # Fixtures, test DB setup, dependency overrides
│   ├── test_auth.py            # Authentication tests
│   └── test_applications.py    # Application CRUD and authorization tests
├── .env.example                # Environment variable template
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
└── requirements.txt
```

---

## License

MIT

## Author

**Pradeep**  
GitHub: [@pradeepv777](https://github.com/pradeepv777)
