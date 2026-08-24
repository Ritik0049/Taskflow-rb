# TaskFlow API

Backend for a small multi-tenant project management tool. Users belong to organizations, create projects and tasks, assign work to each other, and get email notifications through a background worker.

Node.js with Express and TypeScript, PostgreSQL through Prisma, Redis with BullMQ for the queue, all running in Docker Compose.

Architecture and design decisions are further down in this file.

## Running it

You need Docker Desktop. That's it.

    git clone https://github.com/Ritik0049/Taskflow-rb.git
    cd Taskflow-rb
    cp .env.example .env
    docker compose up --build

That brings up the API, the worker, Postgres and Redis. Migrations run automatically when the API starts.

To load sample data:

    npm install
    npm run seed

API is on http://localhost:3000, Swagger UI on http://localhost:3000/docs.

## Test logins

Password for all of them is Password123!

alice@acme.test is an org admin at Acme. bob@acme.test and carol@acme.test are members at Acme. dave@globex.test is an org admin at Globex and erin@globex.test is a member there.

Two organizations with no shared users, so you can log in as Alice and try to hit a Globex project to see the 403.

## Environment

Copy .env.example to .env. The defaults work for local development. The real .env is gitignored.

One thing worth knowing: Postgres is mapped to host port 5433 rather than 5432. I already had Postgres installed on my machine holding the default port. Inside Docker the API talks to postgres:5432 over the internal network, so the 5433 mapping only matters if you run Prisma commands from your host.

## Tests

    docker compose up -d postgres-test
    npm test

23 tests across 4 files. Coverage report with npm run test:coverage.

Tests run against a separate database on port 5434 so they never touch dev data. Every table gets truncated before each test.

## API docs

Swagger UI is at /docs while the API is running.

The Postman collection is in postman/. Import it and it works as-is. There's a baseUrl collection variable if your API isn't on port 3000, and the Login request grabs the access token automatically so you don't have to paste it into every other request.

## How it's put together

Routes hand off to controllers, controllers validate input with Zod and call services, and services do the work. Services are the only layer that touches Prisma. Middleware handles auth, rate limiting and error formatting.

The worker shares the same codebase but runs a different entry point, so it can scale separately from the API.

    Client -> Express API -> Postgres
                  |
                  v
               Redis queue -> Worker -> email

## Decisions worth explaining

Organization scoping happens server-side. The org comes from the JWT and the user's org_members row, resolved on every request. Nothing reads org_id from the request body or params. Every query in the service layer filters on it.

Tasks have no org_id column. Tenancy goes task to project to org through a nested where clause. I could have copied org_id onto tasks to save a join, but then it's a value that can drift out of sync with the project it belongs to. Preferred the join.

Asking for another org's project returns 403 with nothing in the body. The lookup scopes by org first, and if that misses it checks whether the ID exists at all, so a made-up ID gets 404 and a real one belonging to someone else gets 403. Soft-deleted things return 404 even to their own org.

On foreign keys: org to projects is RESTRICT, because deleting an org that still has projects should fail rather than quietly wipe them. Project to tasks, task to assignments and task to comments are all CASCADE since those rows are meaningless on their own. User to comments is RESTRICT, because deleting a user shouldn't delete the discussion they were part of.

For auth, passwords use bcrypt at cost 12. Access tokens last 15 minutes. Refresh tokens last 7 days and are stored as SHA-256 hashes rather than plaintext, so a database leak doesn't hand someone a week of valid sessions. Refresh tokens rotate on use. Login returns the same error whether the email is unknown or the password is wrong, so you can't use it to find out who has an account.

The assign endpoint writes the assignment, enqueues the job, then responds. If the enqueue throws, the assignment gets deleted. Doing it the other way round, queue first and write second, risks emailing someone about an assignment that doesn't exist, which felt worse than the assignment failing outright. A proper outbox pattern would be the real answer but that's more than this needed.

Retries are 3 attempts with 1s, 2s and 4s backoff. After that the job goes to a dead letter queue and GET /jobs/:id reports it as failed. Assigning the same person to the same task twice within 5 seconds is deduplicated with a deterministic job ID. Email processing is capped at 50 per minute.

Primary keys are UUIDs rather than auto-incrementing integers, since sequential IDs let you guess your way into other tenants' data.

## Schema

Eight tables: organizations, users, org_members, projects, tasks, task_assignments, comments and refresh_tokens.

The refresh_tokens table isn't in the spec's list, but the requirement to store revocable refresh tokens in the database implies it.

Status and priority are real Postgres enums, not strings.

Indexes are in prisma/schema.prisma with a comment above each one saying why it's there. They match what the API actually filters on: org scoping, project plus status, project plus priority, due date and assignee.

Migrations are in prisma/migrations/, generated by Prisma. Prisma doesn't do automatic down migrations, so rolling back means prisma migrate resolve --rolled-back followed by a corrective forward migration.

## What I left out

I ran out of time on these and made the call to ship the core properly instead. There are no comment endpoints, though the table and seed data are there. No full-text search on tasks, no bulk status updates, and no cursor pagination since offset is implemented and the spec allows either.

Bonuses that did make it in: soft deletes, refresh token rotation, logout all devices, assignment deduplication, email rate limiting, a coverage report, and a test checking that assignment actually enqueues a job.
