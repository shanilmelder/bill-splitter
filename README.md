# Bill Splitter

Split a restaurant bill between the people at the table without doing the
arithmetic yourself.

All split arithmetic and all bill state live in the browser. The backend is a
thin ASP.NET Core host: it exposes a health probe and serves the built
single-page app. There is deliberately **no split-calculation endpoint** — that
keeps the app working offline and avoids duplicating the rounding algorithm in
two languages.

## Layout

```
backend/BillSplitter.sln
backend/src/BillSplitter.Api/          ASP.NET Core minimal API host (net10.0)
backend/tests/BillSplitter.Api.Tests/  xUnit integration tests (WebApplicationFactory)
frontend/                              React 19 + Vite + TypeScript + Tailwind + Vitest
```

## Prerequisites

- .NET SDK 10.0
- Node.js 20+ and npm

## Backend

Run the API host (listens on `http://localhost:5170`):

```bash
cd backend/src/BillSplitter.Api
dotnet run
```

Run the backend tests:

```bash
cd backend
dotnet test
```

### HTTP surface

| Endpoint | Response |
| --- | --- |
| `GET /api/health` | `200 application/json` — `{ "status": "ok", "version": "0.1.0" }` |
| any other `/api/*` | `404 application/problem+json` — RFC 9457 ProblemDetails |
| any other path | `wwwroot/index.html` (SPA fallback), or `404` when the SPA has not been published |

The host starts successfully when `wwwroot` is absent or empty — in development
the Vite dev server hosts the frontend instead.

## Frontend

The frontend lives in `frontend/` and is added by the frontend work for this
ticket. Once it is present:

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, proxies /api to http://localhost:5170
npm test        # Vitest + React Testing Library
npm run build   # emits frontend/dist
```

## Publishing

Built assets are never committed. At publish time, copy the frontend build
output into the API's web root, then publish the API:

```bash
cd frontend
npm ci
npm run build

# from the repo root — copy frontend/dist into the API web root
rm -rf backend/src/BillSplitter.Api/wwwroot
mkdir -p backend/src/BillSplitter.Api/wwwroot
cp -r frontend/dist/. backend/src/BillSplitter.Api/wwwroot/

cd backend
dotnet publish src/BillSplitter.Api/BillSplitter.Api.csproj -c Release
```

On Windows PowerShell, the copy step is:

```powershell
Remove-Item -Recurse -Force backend/src/BillSplitter.Api/wwwroot -ErrorAction SilentlyContinue
Copy-Item -Recurse frontend/dist backend/src/BillSplitter.Api/wwwroot
```
