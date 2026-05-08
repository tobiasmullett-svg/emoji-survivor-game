# Deploying Emoji Survivor to a VPS

This guide walks you through self-hosting the game on any Linux VPS so you can
play it from anywhere with an internet connection.

---

## Prerequisites

Your VPS needs:
- A public IP address (your hosting provider gives you this)
- **Docker** and **Docker Compose** installed (see below)
- Port **80** open in your VPS firewall / security group

---

## 1. Install Docker on your VPS

SSH into your VPS and run these commands (works on Ubuntu 22.04 / 24.04 and
Debian):

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group so you don't need sudo every time
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker is running
docker --version
docker compose version
```

> **Other distros** — follow the official guide at https://docs.docker.com/engine/install/

---

## 2. Copy the code to your VPS

**Option A — Git (recommended)**

```bash
# On the VPS
git clone https://github.com/<your-username>/<your-repo>.git emoji-survivor
cd emoji-survivor
```

**Option B — rsync from your local machine**

```bash
# Run this on your LOCAL machine, not on the VPS
rsync -avz --exclude node_modules --exclude dist --exclude .git \
  ./ user@YOUR_VPS_IP:~/emoji-survivor/
```

---

## 3. Build and start the game

```bash
# Inside the emoji-survivor directory on the VPS
docker compose up -d --build
```

The first build downloads base images and compiles the app — it takes **3–5 minutes**.
Subsequent restarts are instant because Docker caches the build layers.

Check that the container is running:

```bash
docker compose ps
```

You should see `emoji-survivor` with status `Up`.

---

## 4. Open the game in your browser

Navigate to:

```
http://YOUR_VPS_IP
```

Replace `YOUR_VPS_IP` with the public IP address shown in your hosting
control panel.

---

## 5. (Optional) Use a domain name instead of an IP

1. Point an `A` record at your VPS IP in your DNS provider (e.g. Cloudflare,
   Namecheap).
2. Wait for DNS to propagate (~5 minutes with Cloudflare, up to 48 hours
   elsewhere).
3. Visit `http://yourdomain.com` — it should load the game.

---

## 6. (Optional) Add HTTPS with a free Let's Encrypt certificate

Install Certbot on the VPS and use the nginx plugin:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot edits the nginx config automatically and sets up auto-renewal.
After this your game will be available at `https://yourdomain.com`.

> You need a real domain name (step 5) before HTTPS will work.

---

## Updating the game

Whenever you push new code, SSH into your VPS and run:

```bash
cd ~/emoji-survivor
git pull
docker compose up -d --build
```

Docker rebuilds only the layers that changed, so this is fast.

---

## Useful commands

| Command | What it does |
|---------|-------------|
| `docker compose up -d --build` | Build image and start container in background |
| `docker compose down` | Stop and remove the container |
| `docker compose restart` | Restart without rebuilding |
| `docker compose logs -f` | Stream container logs |
| `docker compose ps` | Show container status |

---

## Firewall quick-reference (Ubuntu UFW)

```bash
sudo ufw allow 22    # SSH — make sure this is allowed before enabling ufw
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS (if you add a certificate later)
sudo ufw enable
sudo ufw status
```
