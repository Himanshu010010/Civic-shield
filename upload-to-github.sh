#!/usr/bin/env bash

set -e

if [ -z "$1" ]; then
  echo "Usage: ./upload-to-github.sh https://github.com/USERNAME/REPOSITORY.git"
  exit 1
fi

REPO_URL="$1"

if [ ! -d ".git" ]; then
  git init
fi

git add .

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "Project upload"
fi

git branch -M main

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git push -u origin main

echo "Uploaded successfully to: $REPO_URL"