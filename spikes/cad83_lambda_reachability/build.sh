#!/usr/bin/env bash
# CAD-83 spike: build build/spike.zip for an arm64 python3.12 Lambda.
# Needs: python3 with pip, zip, file, and bin/speediance-cli (linux/arm64).
set -euo pipefail

cd "$(dirname "$0")"

COROS_MCP="git+https://github.com/cygnusb/coros-mcp@2964e23be7425e7d8092271c677b09f2ccc530cd"
BINARY="bin/speediance-cli"
ZIP="build/spike.zip"
MAX_BYTES=$((50 * 1024 * 1024)) # Lambda direct-upload limit

if [[ ! -f "$BINARY" ]]; then
  echo "ERROR: $BINARY is missing. Put the linux/arm64 speediance-cli there first (see README)." >&2
  exit 1
fi
if ! file "$BINARY" | grep -Eq 'aarch64|ARM aarch64'; then
  echo "ERROR: $BINARY is not a linux/arm64 (aarch64) binary:" >&2
  file "$BINARY" >&2
  exit 1
fi

rm -rf package wheels build
mkdir -p package wheels build

# coros-mcp is pure Python: build its wheel locally, install it without its deps.
python3 -m pip wheel --no-deps -w wheels/ "$COROS_MCP"
python3 -m pip install --no-deps --no-index --find-links wheels/ coros-mcp -t package/

# CAD-95: the backend's own pins (anthropic), minus coros-mcp, installed above.
grep -v '^coros-mcp' ../../backend/requirements.txt >build/backend-requirements.txt

# The modules coros-mcp actually uses plus the backend's, as manylinux arm64
# wheels for Python 3.12.
python3 -m pip install -r requirements.txt -r build/backend-requirements.txt \
  --platform manylinux2014_aarch64 \
  --only-binary=:all: \
  --python-version 3.12 \
  --implementation cp \
  -t package/

cp handler.py __init__.py package/
# CAD-95 plan mode imports backend.week_suggestion. Copy the source files only: never
# .venv, .env or token caches.
mkdir -p package/backend/planners package/backend/prompts
cp ../../backend/*.py package/backend/
cp ../../backend/planners/*.py package/backend/planners/
cp ../../backend/prompts/* package/backend/prompts/
cp "$BINARY" package/speediance-cli
chmod +x package/speediance-cli

(cd package && zip -qr9 "../$ZIP" .)

size=$(wc -c <"$ZIP" | tr -d ' ')
echo "Built $ZIP ($((size / 1024 / 1024)) MB, $size bytes)"
if ((size > MAX_BYTES)); then
  echo "ERROR: $ZIP is over 50 MB, the Lambda direct-upload limit. Upload it via S3 instead (see README)." >&2
  exit 1
fi
