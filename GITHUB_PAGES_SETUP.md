# GitHub Pages Hosting Guide for RSLogix 500 Simulator

This project has been fully prepared for GitHub Pages hosting (`https://<username>.github.io/<repo-name>/`).
The build configuration uses relative asset paths (`base: './'`) and includes an automated GitHub Actions deployment workflow.

---

## 🚀 Steps to Publish (When You Are Ready)

### Step 1: Initialize Git and Commit
In your terminal, navigate to the project folder:
```bash
cd "C:\Users\funny\.gemini\antigravity\scratch\rslogix-plc-simulator"
git init
git add .
git commit -m "Initial commit of RSLogix 500 PLC Simulator"
```

### Step 2: Create a New GitHub Repository
1. Go to [GitHub](https://github.com/new) and create a new repository (e.g. `rslogix-500-simulator`).
2. Do not check "Add README" (the repository is already prepared).

### Step 3: Link and Push to GitHub
Copy the remote commands from your new GitHub repository:
```bash
git branch -M main
git remote add origin https://github.com/<your-username>/rslogix-500-simulator.git
git push -u origin main
```

### Step 4: Enable GitHub Pages
1. On GitHub, navigate to your repository's **Settings** tab.
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build the app and deploy it!
5. Within 1–2 minutes, your simulator will be live at:
   `https://<your-username>.github.io/rslogix-500-simulator/`

---

## 🔄 How to Push Future Updates (Whenever You Make Changes)

Whenever you add new ladder logic, features, or tweaks, updating your live GitHub Pages site takes just 3 commands:

```bash
cd "C:\Users\funny\.gemini\antigravity\scratch\rslogix-plc-simulator"

# 1. Stage all your changes
git add .

# 2. Commit with a descriptive message
git commit -m "Add math functions, 1/0 bit monitor drawer, and mobile support"

# 3. Push to GitHub
git push
```

**What happens next?**
- GitHub Actions automatically catches your push, builds the production app with Vite, and updates your live GitHub Pages site within 60–90 seconds.
- You don't have to rebuild or configure anything manually!

---

## 🛠 Manual Alternative: Deploying Pre-built `dist/`
If you prefer not using GitHub Actions:
1. Run `npm run build` locally.
2. The built files are in the `dist/` directory.
3. You can push the `dist/` directory or use `gh-pages` npm package:
   ```bash
   npx gh-pages -d dist
   ```
