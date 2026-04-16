# CivicShield AI

AI-powered weather risk and safety planner with radar-style insights, city comparison, and astronomy-aware context.

## Tech Stack

- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- Free weather and environmental APIs

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Build

```bash
npm run build
```

## Upload To GitHub (Quick)

1. Create an empty repository on GitHub.
2. Run these commands in this project folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

If `origin` already exists:

```bash
git remote set-url origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## Notes

- Keep API usage free-tier compliant.
- If geolocation is denied, city search still works.