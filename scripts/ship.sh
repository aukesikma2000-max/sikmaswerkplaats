#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Gebruik: npm run ship -- \"jouw commit bericht\""
  exit 1
fi

MESSAGE="$1"

echo "Stap 1/4: build draaien..."
npm run build

echo "Stap 2/4: wijzigingen toevoegen..."
git add -A

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Geen wijzigingen om te committen."
  exit 0
fi

echo "Stap 3/4: commit maken..."
git commit -m "$MESSAGE"

echo "Stap 4/4: push naar origin/main..."
git push origin main

echo "Klaar. Wijzigingen staan op GitHub en Vercel start automatisch een deploy."