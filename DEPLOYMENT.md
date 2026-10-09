# QRCar / Park Ping — deployment guide

This is for **this** repo only: Angular 20 at the repo root, ASP.NET Core **.NET 10** API in `backend/src/QrCar.Api`.

Live Cloudflare Pages and Render deploys are **not** verified from this machine. Follow the checks in section 7 after you deploy.

Assumed public URLs (change them if your dashboards assign different names):

- Frontend: `https://qrcar.pages.dev`
- API: `https://qrcar-api.onrender.com`

GitHub remote this branch tracks: `https://github.com/dmahmoudd/QRCar.git` (`QRCar`).

---

## 1. Files changed and why

| File | Why |
|---|---|
| `src/environments/environment.production.ts` | Production API URL is `https://qrcar-api.onrender.com/api/v1` (not localhost, not same-origin `/api/v1`). |
| `angular.json` | Production `outputMode` is `static` so Cloudflare Pages can host files. Local `ng serve` still uses SSR. |
| `src/app/app.routes.server.ts` | Scan routes are client-rendered so a static Pages build can succeed. |
| `public/_redirects` | SPA fallback: `/* /index.html 200` so `/c/...` and `/dashboard` work on refresh. |
| `scripts/ensure-spa-index.mjs` + `package.json` `build` | Copies `index.csr.html` → `index.html` (Angular was only emitting the CSR name). |
| `.nvmrc` | Pins **Node 22** so Pages does not build Angular 20 with Node 18. |
| `backend/Dockerfile` | Render has no native .NET runtime. Multi-stage Linux image of `QrCar.Api.dll`. |
| `backend/.dockerignore` | Keeps bin/obj and local secret JSON out of the image. |
| `backend/src/QrCar.Api/Program.cs` | Binds `PORT`; production CORS; HTTPS frontend origin required; EF migrate on Production startup; health JSON with no secrets. |
| `backend/src/QrCar.Infrastructure/QrCodes/FrontendOptions.cs` | `AdditionalOrigins` for extra HTTPS origins (preview/custom domain). |
| `backend/src/QrCar.Infrastructure/DependencyInjection.cs` | Empty connection string fails fast. |
| `backend/src/QrCar.Api/HealthChecks/DatabaseHealthCheck.cs` | `/health/ready` does not return exception text. |
| `backend/src/QrCar.Api/appsettings.json` | Production secrets left empty (filled by Render env vars). |
| `render.yaml` | Blueprint: Docker context `backend`, health `/health/live`, secrets prompted in the dashboard. |
| `.gitignore` | Ignores `.env` and `appsettings.Development.json` so local keys are not committed again. |
| `backend/src/QrCar.Api/appsettings.Development.json.example` | Local template **without** real keys. Copy it to `appsettings.Development.json` on your PC. |

Local development is unchanged: `ng serve` on port 4200, `dotnet run --launch-profile http` on 5035.

---

## 2. Git commands (push to GitHub)

From the repo root (`c:\QRcar app\qr-car-app`). Use remote **`QRCar`** (that is what `master` tracks). Do not commit `appsettings.Development.json` or `.env`.

```powershell
cd "c:\QRcar app\qr-car-app"

git add .nvmrc DEPLOYMENT.md render.yaml .gitignore
git add backend/Dockerfile backend/.dockerignore
git add backend/src/QrCar.Api/appsettings.Development.json.example
git add backend/src/QrCar.Api/appsettings.Development.json

# If Development json is still tracked, stop tracking it but keep the local file:
git rm --cached --ignore-unmatch backend/src/QrCar.Api/appsettings.Development.json

git status
git commit -m "Prepare Cloudflare Pages and Render deployment."
git push QRCar master
```

If GitHub rejected the push because Development secrets were in older commits, **rotate** JWT and encryption keys for production anyway (new keys on Render). Do not paste local keys into the dashboard from this chat.

---

## 3. Exact Cloudflare Pages settings

Dashboard: [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → `dmahmoudd/QRCar`.

| Setting | Value |
|---|---|
| Production branch | `master` |
| Root directory | empty (repo root) |
| Framework preset | None (or Angular, then **override** output directory) |
| **Build command** | `npm run build` |
| **Build output directory** | `dist/qr-car-app/browser` |
| Node | from `.nvmrc` (`22`). Optional env: `NODE_VERSION` = `22` |

Do **not** use Cloudflare’s Angular default `dist/cloudflare`.

After the first deploy, copy the URL (`https://<project>.pages.dev`). If it is not `https://qrcar.pages.dev`, set that origin on Render as `Frontend__BaseUrl`.

---

## 4. Exact Render settings

Render has **no native .NET**. Use Docker.

Dashboard: [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service** → `dmahmoudd/QRCar`.

| Setting | Value |
|---|---|
| Name | `qrcar-api` (gives `https://qrcar-api.onrender.com`) |
| Branch | `master` |
| Runtime | **Docker** |
| Dockerfile path | `backend/Dockerfile` |
| Docker context | `backend` |
| If there is no context field | Root Directory = `backend`, Dockerfile path = `Dockerfile` |
| Instance | **Free** (sleeps after ~15 minutes idle; first hit is slow) |
| Health check path | `/health/live` |
| Docker command | leave empty |

Or **New** → **Blueprint** and use `render.yaml` (you will be prompted for the secret env vars).

---

## 5. Environment variables

### Render (API) — Environment tab, never Git

| Key | Example / notes |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | Azure SQL ADO.NET string (section 6) |
| `Jwt__SigningKey` | ≥ 32 random characters (**new** production key) |
| `Security__EncryptionKey` | Base64 **32-byte** key |
| `Security__IpHashKey` | Base64 **32-byte** key |
| `Frontend__BaseUrl` | `https://qrcar.pages.dev` (or your real Pages origin). **https**, no trailing slash |
| `Frontend__AdditionalOrigins` | optional, comma-separated extra HTTPS origins |

Generate keys in PowerShell:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Run twice (encryption + IP hash). For JWT, another 32+ character random string is enough.

Save with **Save, rebuild, and deploy** the first time.

### Cloudflare Pages

No API secrets. `apiBaseUrl` is baked in at build from `environment.production.ts`.

If the Render host is **not** `qrcar-api.onrender.com`, edit that file, push, and let Pages rebuild.

Optional: `NODE_VERSION` = `22`.

---

## 6. Database and migrations

This API is **SQL Server / EF Core**. It will not use Render Postgres without a rewrite.

**Render does not offer SQL Server.** Use [Azure SQL Database free offer](https://aka.ms/azuresqlhub) (**Start free**): 100,000 vCore seconds/month, 32 GB, up to 10 databases per subscription.

1. Create a database (name e.g. `QrCarDb`) and a SQL login.
2. Copy **Connection strings** → ADO.NET. Insert the real password.
3. Typical shape:

   ```text
   Server=tcp:YOURSERVER.database.windows.net,1433;Initial Catalog=QrCarDb;User ID=YOURUSER;Password=YOURPASSWORD;Encrypt=True;TrustServerCertificate=False;MultipleActiveResultSets=True
   ```

4. Firewall: Render has no stable IPs on the free plan. For a short test you can allow `0.0.0.0`–`255.255.255.255`. That is wide open — tighten later.

**Migrations:** there is no separate migrate job. In Production the API runs `Database.Migrate()` on startup (`InitialCreate`, `AddLocationSharing`). Local Development does **not** auto-migrate.

A new Azure database is empty. Phone numbers encrypted with **new** production keys cannot be decrypted with local keys (and vice versa). Treat cloud as a fresh environment.

---

## 7. How to test (after both hosts are up)

Do not treat deploy as successful until these pass.

1. `https://qrcar-api.onrender.com/health/live` → `{"status":"Healthy"}`
2. `https://qrcar-api.onrender.com/health/ready` → Healthy (database reachable)
3. CORS preflight (use your real Pages origin):

   ```powershell
   curl.exe -i -X OPTIONS "https://qrcar-api.onrender.com/api/v1/auth/login" `
     -H "Origin: https://qrcar.pages.dev" `
     -H "Access-Control-Request-Method: POST" `
     -H "Access-Control-Request-Headers: content-type"
   ```

   Expect `Access-Control-Allow-Origin: https://qrcar.pages.dev`.

4. Open the Pages URL → **Register** → **Login**. Network tab: calls go to `https://qrcar-api.onrender.com/api/v1/...` over **HTTPS**, no CORS errors.
5. Add a car, open its QR URL (`https://<pages>/c/<token>`), refresh that path (SPA fallback).
6. Refresh `/login` and `/dashboard` — you should not get a Cloudflare 404.

Auth uses **JWT in localStorage**, not cookies. No extra cookie/SameSite setup.

---

## 8. Common errors

| What you see | Fix |
|---|---|
| Pages: output directory not found | Output must be `dist/qr-car-app/browser`, not `dist/cloudflare`. |
| Pages build fails on Angular / `ng` | Set Node 22 (`.nvmrc` or `NODE_VERSION`). |
| Pages: refresh on `/dashboard` is 404 | Confirm `_redirects` is inside `browser/` and there is no `404.html`. |
| Render: Docker COPY / restore failed | Docker **context** must be `backend`. Repo-root context looks for `src/` in the wrong place. |
| Render: crash loop, `Frontend:BaseUrl must be the public HTTPS origin` | Set `Frontend__BaseUrl` to the Pages **https** origin, not localhost. |
| Render: `ConnectionStrings:DefaultConnection is not configured` | Add the Azure SQL env var. Double underscore: `ConnectionStrings__DefaultConnection`. |
| `/health/ready` Unhealthy | Firewall blocking Render, wrong password, or database paused (Azure free auto-pause). |
| Browser CORS error | Origin must match exactly (https, no slash). Add preview URLs to `Frontend__AdditionalOrigins`. |
| Mixed content | Frontend `apiBaseUrl` still `http://`. Must be `https://.../api/v1`. |
| Login 404 | Missing `/api/v1` on `apiBaseUrl`. |
| QR opens `localhost` | `Frontend__BaseUrl` on Render is still local. QR URLs are built from that value. |
| First request to Render is ~30–60s | Free instance slept. Hit `/health/live` once, then retry. |
| Cannot decrypt phones / login fails after DB restore | Production keys differ from local. Use the Render keys with that database. |

Suggested order: push → Azure SQL → Render (health checks) → Pages → set `Frontend__BaseUrl` if the Pages URL differed → test login and scan.

---

## 9. MonsterASP.NET / runasp.net (IIS) — why `ERR_CONNECTION_RESET` happens

The Angular app currently calls **`https://qrcar.runasp.net/api/v1`** (`environment.production.ts`).

`appsettings.json` ships with **empty** connection string, JWT key, and encryption keys, and `Frontend:BaseUrl` is still `http://localhost:4200`. On a public host those defaults make the API **crash during startup**. IIS then closes the socket → browser shows `ERR_CONNECTION_RESET` (and `/` never loads).

### Required environment variables (Control Panel → Scripting → Environment variables)

| Name | Value |
|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `ConnectionStrings__DefaultConnection` | MSSQL connection string from the hosting **Databases** panel |
| `Jwt__SigningKey` | ≥ 32 random characters (new for production) |
| `Security__EncryptionKey` | Base64 of **exactly 32** random bytes |
| `Security__IpHashKey` | Base64 of **exactly 32** random bytes |
| `Frontend__BaseUrl` | `https://qrcar.pages.dev` (https, no trailing slash) |

Generate keys:

```powershell
cd "C:\QRcar app\qr-car-app"
powershell -File .\scripts\generate-hosting-secrets.ps1
```

Then **Restart application**. Open `https://YOUR-API-HOST/health/live` — expect `{"status":"Healthy"}`.

If the public API host is **not** `qrcar.runasp.net` (e.g. a `*.monsterasp.net` name), update `src/environments/environment.production.ts`, rebuild, and redeploy Cloudflare Pages.

Enable **Logs → ASP.NET Core debug** if it still fails, and read the first exception (almost always missing connection string / keys / `Frontend:BaseUrl`).
