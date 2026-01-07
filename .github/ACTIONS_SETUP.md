# GitHub Actions Setup Guide

This guide will help you set up automated deployment using GitHub Actions.

## Prerequisites

- GitHub repository: `https://github.com/your-username/nz-budget-calculator`
- SSH access to your server (YOUR_SERVER_IP)
- Server app directory: `/mnt/user/appdata/nz-budget-calculator`

## Step 1: Generate SSH Key for GitHub Actions

On your **local computer**, run:

```bash
# Generate a new SSH key (or use existing one)
ssh-keygen -t ed25519 -C "github-actions@budget-app" -f ~/.ssh/github_actions_budget

# Copy the public key to your server
ssh-copy-id -i ~/.ssh/github_actions_budget.pub root@YOUR_SERVER_IP

# Display the private key (you'll need this for GitHub)
cat ~/.ssh/github_actions_budget
```

**IMPORTANT**: Copy the entire private key output (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

## Step 2: Configure GitHub Secrets

1. Go to your GitHub repository: https://github.com/your-username/nz-budget-calculator
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following secrets:

### Required Secrets

| Secret Name | Value | Description |
|------------|-------|-------------|
| `SERVER_HOST` | `YOUR_SERVER_IP` | Your server IP address |
| `SERVER_USER` | `root` | SSH user for the server |
| `SERVER_SSH_KEY` | *Your private key from Step 1* | The entire content of `~/.ssh/github_actions_budget` |
| `JWT_SECRET` | *Generate new secret* | Run `openssl rand -base64 32` to generate |

### How to Add a Secret

1. Click **New repository secret**
2. Enter the **Name** (e.g., `SERVER_HOST`)
3. Enter the **Secret** value
4. Click **Add secret**
5. Repeat for all 4 secrets

## Step 3: Initial Server Setup

Run the commands from `commands.txt` on your **server** to set up the initial environment.

## Step 4: Test the Workflow

### Option 1: Push to main branch

```bash
git add .
git commit -m "Set up GitHub Actions deployment"
git push origin main
```

### Option 2: Manual trigger

1. Go to GitHub repository → **Actions** tab
2. Click on **Deploy to Production** workflow
3. Click **Run workflow** → **Run workflow**

## Step 5: Monitor Deployment

1. Go to GitHub repository → **Actions** tab
2. Click on the running workflow
3. Watch the deployment progress in real-time

## What Happens During Deployment

1. ✅ Checks out your code
2. ✅ Sets up Node.js
3. ✅ Builds the frontend (Vue.js)
4. ✅ Sets up SSH connection
5. ✅ Copies files to server via rsync
6. ✅ Builds Docker image on server
7. ✅ Restarts backend container
8. ✅ Verifies backend health
9. ✅ Reloads nginx
10. ✅ Shows deployment status

## Troubleshooting

### Deployment Failed

Check the GitHub Actions logs:
1. Go to **Actions** tab
2. Click on the failed workflow
3. Expand the failed step to see error details

### SSH Connection Issues

If you see "Permission denied" or "Host key verification failed":

1. Verify `SERVER_SSH_KEY` secret contains the **private key** (not public key)
2. Ensure the public key is added to server's `~/.ssh/authorized_keys`
3. Test SSH manually: `ssh -i ~/.ssh/github_actions_budget root@YOUR_SERVER_IP`

### Backend Health Check Failed

Check backend logs on server:
```bash
ssh root@YOUR_SERVER_IP
docker logs --tail 50 budget-backend
```

### Frontend Not Updating

1. Clear browser cache
2. Check nginx is serving the latest files:
   ```bash
   ssh root@YOUR_SERVER_IP
   ls -la /mnt/user/appdata/nz-budget-calculator/frontend/dist
   docker exec multi-site-nginx nginx -s reload
   ```

## Manual Deployment (Fallback)

If GitHub Actions isn't working, you can still deploy manually:

```bash
./deploy.sh
```

## Workflow Triggers

The workflow runs automatically when:
- You push to the `main` branch
- You manually trigger it from GitHub Actions tab

To disable auto-deployment:
1. Edit `.github/workflows/deploy.yml`
2. Remove the `push:` trigger
3. Keep only `workflow_dispatch:` for manual triggers

## Security Notes

- Never commit the `.env` file
- Never commit SSH private keys
- Keep GitHub secrets secure
- Rotate `JWT_SECRET` periodically

## Links

- **Repository**: https://github.com/your-username/nz-budget-calculator
- **Production URL**: https://budget.example.com
- **Backend API**: http://YOUR_SERVER_IP:3200
- **GitHub Actions Docs**: https://docs.github.com/en/actions

## Support

If you encounter issues:
1. Check GitHub Actions logs
2. Check server logs: `docker logs budget-backend`
3. Verify nginx config: `docker exec multi-site-nginx nginx -t`
4. Test backend health: `curl http://YOUR_SERVER_IP:3200/api/verify`
