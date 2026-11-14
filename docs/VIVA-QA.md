# VIVA preparation — MultiEnv Docker deployment

## 1. Suggested live demonstration (3–5 minutes)

1. Open Docker Desktop and show the three running containers.
2. In PowerShell, run `docker compose ps` to show status and health.
3. Open `http://localhost:3000` and explain that Nginx serves the React frontend.
4. Open `http://localhost:3000/dev`. Show the development ticket data and create a ticket named `VIVA development test`.
5. Open `http://localhost:3000/prod`. Show the separate production data and create `VIVA production test`.
6. Run `Invoke-RestMethod http://localhost:3001/api/health` and `Invoke-RestMethod http://localhost:3002/api/health`.
7. Run `docker compose logs --tail=20 backend-dev backend-prod frontend` and explain that logs are collected by Docker.
8. Finish by showing `docker-compose.yml` and the Dockerfiles.

## 2. Common VIVA questions and answers

### Q1. What is Docker?
Docker is a platform for packaging and running applications in containers. A container includes the application and its runtime dependencies, which makes the application easier to build and run consistently.

### Q2. What is a Docker image?
An image is the packaged template used to create a container. In this project, Docker builds separate images for the development backend, production backend, and frontend.

### Q3. What is a container?
A container is a running instance of an image. This project runs three containers at the same time.

### Q4. What is Dockerfile?
A Dockerfile is a set of instructions used to build an image. It specifies the base image, working directory, files, dependencies, exposed port, and startup command.

### Q5. Why do we use Docker Compose?
Docker Compose defines and manages multiple related services in one YAML file. One command builds and starts the frontend and both backends, and Compose creates their shared network.

### Q6. Why are there two backend containers?
They represent two independent environments. Development uses Flask's built-in development server on port 3001. Production uses Gunicorn on port 3002. Each backend has its own environment file and sample ticket data.

### Q7. How does the frontend communicate with the backends?
The browser sends requests to the frontend's Nginx server. Nginx proxies `/api/dev/` to the Compose service `backend-dev` and `/api/prod/` to `backend-prod`. Docker's internal DNS resolves those service names on `multienv-network`.

### Q8. Why does the browser use localhost instead of backend container names?
The browser runs outside the Docker network, so it cannot normally resolve Compose service names. It connects to a published host port. Nginx, which runs inside Docker, can resolve the backend service names.

### Q9. What is the purpose of `ports` in Compose?
`ports` publishes a container port on the host. For example, `127.0.0.1:3000:80` maps host port 3000 to port 80 inside the frontend container.

### Q10. What is the difference between `ports` and `expose`?
`ports` publishes a port to the host. `expose` documents or makes a port available to other containers on a network without publishing it to the host. This assignment publishes the backend ports for direct local testing.

### Q11. What is a Docker network?
A Docker network allows containers to communicate. Compose creates the `multienv-network` bridge network and provides service-name DNS.

### Q12. What is a health check?
A health check runs a command inside a container to check whether its service is responding. Compose uses the result to show `healthy` or `unhealthy` and to wait for backends before starting the frontend.

### Q13. How do you see container logs?
Use `docker compose logs -f` for all services or `docker compose logs -f backend-dev` for one service.

### Q14. How do you rebuild after changing code?
Run `docker compose up -d --build` from the folder containing `docker-compose.yml`.

### Q15. How do you stop the application?
Run `docker compose down`. This stops and removes the containers and the Compose network. It does not remove locally built images by default.

### Q16. What happens if port 3000 is already in use?
Docker cannot bind the frontend port. I would identify the process using `netstat -ano | findstr :3000`, stop the conflicting process, or change the host-side port in Compose.

### Q17. What is the difference between the development and production Dockerfiles?
Both use Python as the base image and install Flask. The development image starts `python app.py`, which runs Flask's built-in server. The production image also installs Gunicorn and starts the Flask WSGI application with Gunicorn workers.

### Q18. Why use a multi-stage frontend Dockerfile?
The first stage uses Node.js to install dependencies and compile React into static files. The final stage uses Nginx to serve only the compiled files and proxy API requests. Node.js and the source build environment are not needed in the final runtime image.

### Q19. Why is the frontend API URL `/api/dev/...` instead of `http://backend-dev:3001/...`?
The frontend JavaScript runs in the user's browser, not inside the container. The browser uses the same-origin Nginx URL. Nginx then routes the request internally to the backend container.

### Q20. Does this demo save tickets permanently?
No. The sample app stores tickets in memory to keep the assignment focused on Docker. Data is lost when the backend container is recreated. A real application should use a persistent database or storage service.

### Q21. Why is EC2 not used?
The assignment permits a local environment. Docker Desktop provides the required local container runtime, so there is no EC2 instance or AWS security group to configure for this submission.

### Q22. How would you make this deployment available to other users?
I would deploy it to an appropriate host or cloud environment, publish only required ports, configure DNS and HTTPS, add authentication and secrets management, use a persistent database, apply least-privilege network rules, and configure monitoring and backups.

## 3. Commands worth memorizing

```powershell
docker version
docker compose version
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs -f
docker compose down
```

## 4. One-sentence architecture summary

"Docker Compose builds and runs a React frontend container and two separate Flask backend containers on a private bridge network; Nginx routes development and production API requests to the correct backend, while the browser accesses the application through localhost ports 3000, 3001, and 3002."
