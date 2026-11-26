#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

npm run format:check
npm run test
npm run build
npm run test:e2e
