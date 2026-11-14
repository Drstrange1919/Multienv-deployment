# Step-by-step deployment guide (Windows + Docker Desktop)

This guide assumes a local Windows computer and uses Docker for the application runtime. You do not need to install Python, Node.js, Flask, or Nginx directly on Windows.

## Part A — Prepare Windows and Docker Desktop

### Step 1: Check your computer

Docker Desktop's current Windows requirements include a supported Windows 10/11 version, WSL 2 version 2.1.5 or later for the WSL backend, 8 GB RAM, a 64-bit processor with SLAT, and hardware virtualization enabled in BIOS/UEFI. Check the live requirements before installation: <https://docs.docker.com/desktop/setup/install/windows-install/>.

### Step 2: Install or update WSL 2

1. Open **PowerShell as Administrator**.
2. Run:

   ```powershell
   wsl --install
   ```

3. Restart Windows if it asks you to.
4. Open PowerShell again and run:

   ```powershell
   wsl --update
   wsl --version
   ```

If WSL is already installed, `wsl --update` updates it. Docker Desktop can use its WSL 2 backend without you installing a separate Linux distribution for this project.

### Step 3: Install Docker Desktop

1. Open <https://docs.docker.com/desktop/setup/install/windows-install/>.
2. Download Docker Desktop for your computer's processor (most Windows laptops/desktops are x86-64).
3. Run the installer.
4. Choose the **WSL 2** backend when the installer asks.
5. Finish the installation and restart Windows if requested.
6. Open **Docker Desktop** from the Windows Start menu.
7. Accept the terms if prompted and wait until Docker Engine is running.

Do not switch Docker to Windows containers for this project. The provided images are Linux containers.

### Step 4: Confirm Docker is installed

Open a normal PowerShell window and run:

```powershell
docker version
docker compose version
```

You should see both a Docker client/server version and a Docker Compose version. If the server section is missing, Docker Desktop's engine may not be running yet.

## Part B — Open the project

### Step 5: Extract the project ZIP

1. Download and extract `multienv-deployment.zip`.
2. Open the extracted `multienv-deployment` folder.
3. Confirm that `docker-compose.yml` is directly inside that folder.

Example location:

```text
C:\Users\YourUser\Downloads\multienv-deployment\docker-compose.yml
```

### Step 6: Open PowerShell in the project folder

In File Explorer, open the `multienv-deployment` folder, click the address bar, type `powershell`, and press Enter. PowerShell should open in the correct folder.

Confirm by running:

```powershell
Get-ChildItem
```

You should see `docker-compose.yml`, `backend`, `frontend`, `docs`, and `submission`.

## Part C — Build and start the containers

### Step 7: Validate the Docker Compose configuration

```powershell
docker compose config
```

This checks the Compose YAML and displays the resolved configuration. If it prints a configuration rather than an error, continue.

### Step 8: Build images and start all services

```powershell
docker compose up -d --build
```

What this command does:

- `up`: creates and starts the services.
- `-d`: runs them in the background.
- `--build`: builds the images from the Dockerfiles before starting.

The first run needs to download base images and frontend dependencies, so it can take longer than later starts.

### Step 9: Check container status

```powershell
docker compose ps
```

You should see these three services:

- `multienv-frontend`
- `multienv-backend-dev`
- `multienv-backend-prod`

Wait a short moment for health checks to complete. The status should become `healthy`. If a service exits or becomes unhealthy, read its logs:

```powershell
docker compose logs --tail=100 backend-dev
docker compose logs --tail=100 backend-prod
docker compose logs --tail=100 frontend
```

## Part D — Open and test the application

### Step 10: Open the dashboard

Open a browser and visit:

`http://localhost:3000`

You should see the MultiEnv Ticket Desk dashboard and the health status of both backend environments.

### Step 11: Test development

Open:

`http://localhost:3000/dev`

Expected result:

- Development tickets appear.
- The environment heading says Development.
- The API connection status says connected.
- You can create a test ticket using the form.

### Step 12: Test production

Open:

`http://localhost:3000/prod`

Expected result:

- Different sample production tickets appear.
- The environment heading says Production.
- The API connection status says connected.
- You can create a test ticket using the form.

### Step 13: Test the backend APIs directly

Run these commands in PowerShell:

```powershell
Invoke-RestMethod http://localhost:3001/api/health
Invoke-RestMethod http://localhost:3002/api/health
Invoke-RestMethod http://localhost:3001/api/tickets
Invoke-RestMethod http://localhost:3002/api/tickets
```

Development health should report `environment: development`; production health should report `environment: production`.

### Step 14: Prove frontend-to-backend proxy routing

The browser sends same-origin requests to Nginx; Nginx forwards them to the correct backend using Docker's internal DNS names:

```powershell
Invoke-RestMethod http://localhost:3000/api/dev/health
Invoke-RestMethod http://localhost:3000/api/prod/health
```

Both should return JSON. This verifies the frontend container can resolve and reach the backend service names on the Compose network.

## Part E — Capture evidence for your assignment

Create screenshots after the containers have reached healthy status. See `../evidence/README.md` for the exact screenshot checklist and suggested filenames. Use Windows Snipping Tool (`Win + Shift + S`) and save the images in the `evidence` folder.

Recommended evidence:

1. Docker Desktop Containers view showing all three running containers.
2. PowerShell output from `docker compose ps`.
3. Browser dashboard at `http://localhost:3000`.
4. Browser development page at `http://localhost:3000/dev` with development tickets.
5. Browser production page at `http://localhost:3000/prod` with production tickets.
6. PowerShell outputs from both backend health tests and both proxied health tests.
7. Logs from `docker compose logs --tail=50`.

Do not submit screenshots of a command that failed as proof of a successful deployment. Failed attempts can be included separately with a short explanation in your troubleshooting notes.

## Part F — Stop and restart

Stop and remove the containers and network:

```powershell
docker compose down
```

Start them again later:

```powershell
docker compose up -d
```

Rebuild after changing source code or Dockerfiles:

```powershell
docker compose up -d --build
```

## Network and infrastructure explanation for the report

- **Compute:** your local computer runs Docker Desktop and the Docker Engine (WSL 2 backend).
- **Containers:** one frontend container and two Flask backend containers.
- **Network:** Docker Compose creates a bridge network named `multienv-network`.
- **Service discovery:** containers reach each other by Compose service name (`backend-dev` and `backend-prod`), not by hard-coded container IP address.
- **Published ports:** host port 3000 maps to frontend container port 80; 3001 maps to backend-dev 3001; 3002 maps to backend-prod 3002.
- **Security:** all host ports are bound to `127.0.0.1`, so the demo can be accessed from the local computer only. No EC2 security group is applicable.
- **Health checks:** Compose checks each backend's `/api/health` endpoint and the frontend's `/health` endpoint.
- **Restart policy and logs:** services use `unless-stopped`; Docker logs are available with `docker compose logs`.

## Assumptions and known limitations

- The original application source was not part of the supplied brief. This scaffold is a runnable demonstration of the required architecture and endpoints.
- The sample tickets are in-memory arrays. No data survives backend container recreation.
- There is no database, login, HTTPS certificate, or external cloud dependency.
- The production Flask app is served by Gunicorn, while development uses Flask's built-in server.
- This is not a hardened internet-facing production deployment.

## Part G — Push the project to a public GitHub repository

1. Sign in to GitHub and create a new **Public** repository named `multienv-deployment-[YourName]`. Leave the option to add a README unchecked.
2. Install Git for Windows if required. Git is for source-code submission only; it is not part of the application runtime.
3. Open PowerShell in the project root and run the following commands, replacing the repository URL:

   ```powershell
   git init
   git add .
   git commit -m "Initial multi-environment Docker deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/multienv-deployment-YOURNAME.git
   git push -u origin main
   ```

4. Open the public GitHub repository in a browser and confirm the files are present.
5. Update `submission/submission-info.txt` with your actual name, public repository URL, deployment status, and submission date. Commit and push the update.
