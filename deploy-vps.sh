#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# PhotoCraft AI Studio - Linux VPS Deployment Script
# Target VPS Path: /var/www/pts_spl/data/www/pts.splworks.com
# ==============================================================================

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="0.9.0"

echo "======================================================="
echo "  Deploying PhotoCraft AI Studio ($VERSION)"
echo "  Path: $APP_DIR"
echo "======================================================="

cd "$APP_DIR"

# 1. Download PhotoCraft Linux Headless Engine (photocraft-cli) if missing
ARCH="$(uname -m)"
if [ "$ARCH" = "x86_64" ]; then
  BIN_SUBDIR="linux-x64"
  TAR_NAME="photocraft-${VERSION}-linux-x86_64.tar.gz"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  BIN_SUBDIR="linux-arm64"
  TAR_NAME="photocraft-${VERSION}-linux-aarch64.tar.gz"
else
  BIN_SUBDIR=""
  TAR_NAME=""
fi

if [ -n "$BIN_SUBDIR" ] && [ ! -x "$APP_DIR/release-bin/$BIN_SUBDIR/photocraft-cli" ]; then
  echo "[1/3] Downloading PhotoCraft Linux CLI ($TAR_NAME)..."
  mkdir -p "$APP_DIR/release-bin/$BIN_SUBDIR"
  TMP_DIR="$(mktemp -d)"
  URL="https://github.com/storytold/photocraft/releases/download/v${VERSION}/${TAR_NAME}"
  if curl -fL --retry 3 -o "$TMP_DIR/$TAR_NAME" "$URL"; then
    tar -xzf "$TMP_DIR/$TAR_NAME" -C "$TMP_DIR"
    FOUND_CLI="$(find "$TMP_DIR" -type f -name 'photocraft-cli' | head -n 1 || true)"
    if [ -n "$FOUND_CLI" ]; then
      cp "$FOUND_CLI" "$APP_DIR/release-bin/$BIN_SUBDIR/photocraft-cli"
      chmod +x "$APP_DIR/release-bin/$BIN_SUBDIR/photocraft-cli"
      echo "      Installed photocraft-cli -> release-bin/$BIN_SUBDIR/photocraft-cli"
    else
      echo "      [WARN] photocraft-cli not found in archive; continuing in WebAssembly + AI Router mode."
    fi
  else
    echo "      [WARN] Could not download $URL; continuing in WebAssembly + AI Router mode."
  fi
  rm -rf "$TMP_DIR"
else
  echo "[1/3] PhotoCraft Linux CLI ready."
fi

# 2. Ensure workspace & config directories exist
echo "[2/3] Checking ptscraft-ai directories..."
mkdir -p "$APP_DIR/ptscraft-ai/workspace" "$APP_DIR/ptscraft-ai/config"

# 3. Start or reload with PM2 (if installed)
echo "[3/3] Starting service..."
if command -v pm2 >/dev/null 2>&1; then
  # Use dynamic cwd in case deployed elsewhere, fallback to ecosystem.config.cjs
  if pm2 describe photocraft-ai >/dev/null 2>&1; then
    pm2 reload photocraft-ai --update-env
  else
    PORT="${PORT:-4242}" pm2 start "$APP_DIR/ptscraft-ai/server.js" --name photocraft-ai --cwd "$APP_DIR/ptscraft-ai"
  fi
  pm2 save || true
  echo ""
  echo "Done! PM2 process 'photocraft-ai' is running on http://127.0.0.1:${PORT:-4242}"
else
  echo "[INFO] PM2 chưa được cài đặt. Cài nhanh bằng: npm install -g pm2"
  echo "       Sau đó chạy lại: bash deploy-vps.sh"
fi

echo ""
echo "Cau hinh Nginx / FastPanel Reverse Proxy cho pts.splworks.com:"
echo "  Xem file: $APP_DIR/nginx-pts.splworks.com.conf"
echo "  - AI Studio:       https://pts.splworks.com/"
echo "  - Web Wasm Editor: https://pts.splworks.com/editor/"
