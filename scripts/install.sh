#!/usr/bin/env bash
set -euo pipefail

# ─── Caesar Installer ───────────────────────────────────────────────────
VERSION="0.1.0"

# ─── Design System (from DESIGN.md) ────────────────────────────────────
GOLD='\033[38;2;201;168;76m'
INK='\033[38;2;250;250;249m'
MUTED='\033[38;2;168;162;158m'
DIM='\033[2m'
RED='\033[38;2;192;57;43m'
GREEN='\033[38;2;90;138;94m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Logo ───────────────────────────────────────────────────────────────
show_logo() {
  clear
  echo ""
  echo -e "  ${GOLD}${BOLD}"
  echo "   ██████╗ █████╗ ███████╗ ███████╗ █████╗ ██████╗ "
  echo "  ██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗██╔══██╗"
  echo "  ██║     ███████║███████╗ █████╗  ███████║██████╔╝"
  echo "  ██║     ██╔══██║╚════██║ ██╔══╝  ██╔══██║██╔══██╗"
  echo "  ╚██████╗██║  ██║███████║ ███████╗██║  ██║██║  ██║"
  echo "   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"
  echo -e "${RESET}"
  echo -e "  ${DIM}  self-sovereign password manager  v${VERSION}${RESET}"
  echo ""
}

# ─── Progress Bar ───────────────────────────────────────────────────────
BAR_WIDTH=40
PHASE_CURRENT=0
PHASE_TOTAL=5

draw_bar() {
  local label="$1"
  local pct=$(( PHASE_CURRENT * 100 / PHASE_TOTAL ))
  local filled=$(( PHASE_CURRENT * BAR_WIDTH / PHASE_TOTAL ))
  local empty=$(( BAR_WIDTH - filled ))

  local bar=""
  for ((i=0; i<filled; i++)); do bar+="━"; done
  if [ "$empty" -gt 0 ]; then
    bar+="╸"
    for ((i=1; i<empty; i++)); do bar+="─"; done
  fi

  printf "\r  ${GOLD}${bar}${RESET}  ${INK}${pct}%%${RESET}  ${MUTED}${label}${RESET}  "
}

next_phase() {
  PHASE_CURRENT=$((PHASE_CURRENT + 1))
}

# ─── Status Messages ────────────────────────────────────────────────────
ok() {
  echo -e "    ${GREEN}${BOLD}✓${RESET}  ${INK}${BOLD}$1${RESET}"
}

fail() {
  echo -e "    ${RED}${BOLD}✗${RESET}  ${INK}$1${RESET}"
}

info() {
  echo -e "      ${MUTED}$1${RESET}"
}

# ─── Dependency Checks ─────────────────────────────────────────────────
check_deps() {
  local node_ok=false docker_ok=false

  if command -v node &>/dev/null; then
    local ver
    ver=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
    if [ "$ver" -ge 22 ]; then
      ok "Node.js ${BOLD}$(node --version)${RESET}"
      node_ok=true
    else
      fail "Node.js $(node --version) — ${RED}need v22+${RESET}"
    fi
  else
    fail "Node.js ${RED}not found${RESET}"
  fi

  if command -v docker &>/dev/null; then
    if docker info &>/dev/null 2>&1; then
      ok "Docker ${BOLD}running${RESET}"
      docker_ok=true
    else
      fail "Docker installed but ${RED}daemon not running${RESET}"
    fi
  else
    fail "Docker ${RED}not found${RESET}"
  fi

  if [ "$node_ok" = true ] && [ "$docker_ok" = true ]; then
    return 0
  fi
  return 1
}

install_deps() {
  echo -e "      ${DIM}Installing missing dependencies...${RESET}"

  if ! command -v node &>/dev/null || [ "$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)" -lt 22 ]; then
    if command -v apt-get &>/dev/null; then
      curl -fsSL https://deb.nodesource.com/setup_22.x 2>/dev/null | sudo -E bash - 2>/dev/null
      sudo apt-get install -y -qq nodejs 2>/dev/null
    elif command -v brew &>/dev/null; then
      brew install node@22 2>/dev/null
    else
      fail "Install Node.js 22+ from https://nodejs.org and re-run"
      exit 1
    fi
    ok "Node.js installed"
  fi

  if ! command -v docker &>/dev/null || ! docker info &>/dev/null 2>&1; then
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -qq 2>/dev/null
      sudo apt-get install -y -qq docker.io docker-compose-plugin 2>/dev/null
      sudo usermod -aG docker "$USER" 2>/dev/null
      sudo systemctl start docker 2>/dev/null
      sleep 3
    elif command -v brew &>/dev/null; then
      brew install --cask docker 2>/dev/null
      open /Applications/Docker.app 2>/dev/null
      local retries=0
      until docker info &>/dev/null 2>&1; do
        sleep 3
        retries=$((retries + 1))
        if [ "$retries" -ge 30 ]; then
          fail "Docker failed to start within 90 seconds"
          exit 1
        fi
      done
    else
      fail "Install Docker from https://docs.docker.com/get-docker/ and re-run"
      exit 1
    fi
    ok "Docker installed"
  fi
}

# ─── Detect Browser ────────────────────────────────────────────────────
detect_browser() {
  if [ -d "$HOME/.zen" ] || [ -d "$HOME/.config/zen" ]; then
    echo "zen"
  else
    echo "firefox"
  fi
}

# ─── Trust CA in Firefox/NSS ───────────────────────────────────────────
trust_ca() {
  local ca_file="$HOME/.caesar/ca.pem"
  [ -f "$ca_file" ] || return 0

  # Shared NSS database
  local shared_nss="$HOME/.pki/nssdb"
  if [ -f "$shared_nss/cert9.db" ]; then
    local tmp_ca
    tmp_ca=$(mktemp)
    cp "$ca_file" "$tmp_ca"
    certutil -d "sql:$shared_nss" -A -t "C,," -n "Caesar Vault CA" -i "$tmp_ca" 2>/dev/null && ok "CA trusted in shared NSS" || true
    rm -f "$tmp_ca"
  fi

  # Firefox profiles
  for base_dir in "$HOME/.mozilla/firefox" "$HOME/.config/mozilla/firefox" "$HOME/.zen" "$HOME/.config/zen"; do
    [ -d "$base_dir" ] || continue
    for profile in "$base_dir"/*/; do
      if [ -f "${profile}cert9.db" ]; then
        local tmp_ca
        tmp_ca=$(mktemp)
        cp "$ca_file" "$tmp_ca"
        certutil -d "sql:${profile}" -A -t "C,," -n "Caesar Vault CA" -i "$tmp_ca" 2>/dev/null && ok "CA trusted in $(basename "$profile")" || true
        rm -f "$tmp_ca"
      fi
    done
  done
}

# ─── Main Flow ──────────────────────────────────────────────────────────
main() {
  show_logo

  echo -e "  ${MUTED}Setting up your vault manager...${RESET}"
  echo ""

  # ── Phase 1: Dependencies ──
  next_phase
  draw_bar "Checking dependencies"
  echo ""
  if ! check_deps; then
    install_deps
  fi
  echo ""

  # ── Phase 2: Install Caesar ──
  next_phase
  draw_bar "Installing Caesar"
  echo ""

  local pkg_dir
  pkg_dir="$(cd "$(dirname "$0")/.." && pwd)"
  (cd "$pkg_dir" && npm run build) || { fail "Build failed"; exit 1; }
  npm install -g "$pkg_dir"
  ok "Caesar v${VERSION} installed globally"
  echo ""

  # ── Phase 3: Initialize Vault ──
  next_phase
  draw_bar "Initializing vault"
  echo ""

  if [ -f "$HOME/.caesar/config.json" ]; then
    info "Vault already exists at ${BOLD}~/.caesar/${RESET}"
    echo -ne "      ${MUTED}Reinitialize? (y/N): ${RESET}"
    read -r choice
    if [[ "$choice" =~ ^[yY] ]]; then
      rm -rf "$HOME/.caesar"
      caesar init
      ok "Vault reinitialized"
    else
      ok "Keeping existing vault"
    fi
  else
    echo ""
    info "${MUTED}You'll be asked to create a master password.${RESET}"
    info "${RED}${BOLD}This password encrypts your entire vault.${RESET}"
    info "${RED}${BOLD}There is no recovery if you forget it.${RESET}"
    echo ""
    caesar init
    ok "Vault created at ${BOLD}~/.caesar/${RESET}"
  fi

  # Trust CA in Firefox/NSS
  info "Trusting TLS CA in browser..."
  trust_ca
  echo ""

  # ── Phase 4: Start Server ──
  next_phase
  draw_bar "Starting server"
  echo ""

  # Pre-create ipfs directories so Docker doesn't create them as root
  mkdir -p "$HOME/.caesar/ipfs/blocks" "$HOME/.caesar/ipfs/datastore"

  if curl -sk https://127.0.0.1:9876/lock -X POST &>/dev/null 2>&1; then
    ok "Server already running"
  else
    docker compose -f "$pkg_dir/docker-compose.yml" up -d
    info "Waiting for server to be ready..."
    local retries=0
    while ! curl -sk https://127.0.0.1:9876/lock -X POST &>/dev/null 2>&1; do
      sleep 1
      retries=$((retries + 1))
      if [ "$retries" -ge 30 ]; then
        fail "Server didn't start. Run: ${BOLD}docker compose logs${RESET}"
        exit 1
      fi
    done
    ok "Server running on ${BOLD}https://127.0.0.1:9876${RESET}"
  fi
  echo ""

  # ── Phase 5: Build Extension ──
  next_phase
  draw_bar "Building Firefox extension"
  echo ""

  local ext_dir
  ext_dir="$pkg_dir/extension-ui"

  if [ -d "$ext_dir" ]; then
    (
      cd "$ext_dir"
      npm install
      npm run package
    )

    if [ -f "$ext_dir/artifacts/caesar-0.1.0.xpi" ]; then
      ok "Extension built: extension-ui/artifacts/caesar-0.1.0.xpi"
    elif [ -d "$ext_dir/dist" ]; then
      ok "Extension built: extension-ui/dist/"
    else
      fail "Extension build failed — run: cd extension-ui && npm run package"
    fi
  else
    info "Extension source not found, skipping"
  fi
  echo ""

  # ── Done ──
  draw_bar "Done"
  echo ""
  echo ""
  local browser
  browser=$(detect_browser)
  echo -e "  ${GREEN}${BOLD}✓  Caesar is ready.${RESET}"
  echo ""
  echo -e "  ${INK}${BOLD}Quick start:${RESET}"
  echo ""
  echo -e "  ${GOLD}caesar${RESET} ${BOLD}launch${RESET}       Open ${browser} with extension auto-loaded"
  echo ""
  echo -e "  ${DIM}Commands:${RESET}"
  echo -e "  ${GOLD}caesar${RESET} ${BOLD}start${RESET}        Start the server"
  echo -e "  ${GOLD}caesar${RESET} ${BOLD}stop${RESET}         Stop the server"
  echo -e "  ${GOLD}caesar${RESET} ${BOLD}launch${RESET}       Open ${browser} with extension"
  echo -e "  ${GOLD}caesar${RESET} ${BOLD}install-extension${RESET}  Build extension only"
  echo -e "  ${GOLD}caesar${RESET} ${BOLD}sync${RESET}         Sync vault from IPFS"
  echo ""
}

main "$@"
