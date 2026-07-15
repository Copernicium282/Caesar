#!/usr/bin/env bash
set -euo pipefail

# ─── Caesar Uninstaller ─────────────────────────────────────────────────
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
  echo -e "  ${RED}${BOLD}"
  echo "   ██████╗ █████╗ ███████╗ ███████╗ █████╗ ██████╗ "
  echo "  ██╔════╝██╔══██╗██╔════╝ ██╔════╝██╔══██╗██╔══██╗"
  echo "  ██║     ███████║███████╗ █████╗  ███████║██████╔╝"
  echo "  ██║     ██╔══██║╚════██║ ██╔══╝  ██╔══██║██╔══██╗"
  echo "  ╚██████╗██║  ██║███████║ ███████╗██║  ██║██║  ██║"
  echo "   ╚═════╝╚═╝  ╚═╝╚══════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝"
  echo -e "${RESET}"
  echo -e "  ${DIM}  uninstaller  v${VERSION}${RESET}"
  echo ""
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

step() {
  echo ""
  echo -e "  ${GOLD}${BOLD}▸${RESET}  ${INK}${BOLD}$1${RESET}"
}

# ─── Confirmation ───────────────────────────────────────────────────────
confirm() {
  echo ""
  echo -e "  ${RED}${BOLD}This will remove:${RESET}"
  echo -e "    ${MUTED}~/.caesar/${RESET}             vault data, TLS certs, wallet"
  echo -e "    ${MUTED}caesar${RESET}                  globally installed CLI"
  echo -e "    ${MUTED}vaultchain Docker resources${RESET}  containers, images, volumes"
  echo -e "    ${MUTED}Caesar Vault CA${RESET}         from Firefox/NSS trust stores"
  echo ""
  echo -ne "  ${RED}${BOLD}Are you sure? (y/N): ${RESET}"
  read -r choice
  if [[ ! "$choice" =~ ^[yY]$ ]]; then
    echo -e "\n  ${MUTED}Cancelled.${RESET}"
    exit 0
  fi
}

# ─── Remove CA from Firefox/NSS ────────────────────────────────────────
remove_ca() {
  local shared_nss="$HOME/.pki/nssdb"
  if [ -f "$shared_nss/cert9.db" ]; then
    certutil -d "sql:$shared_nss" -D -n "Caesar Vault CA" 2>/dev/null && ok "CA removed from shared NSS" || true
  fi

  for base_dir in "$HOME/.mozilla/firefox" "$HOME/.config/mozilla/firefox" "$HOME/.zen" "$HOME/.config/zen"; do
    [ -d "$base_dir" ] || continue
    for profile in "$base_dir"/*/; do
      if [ -f "${profile}cert9.db" ]; then
        certutil -d "sql:${profile}" -D -n "Caesar Vault CA" 2>/dev/null && ok "CA removed from $(basename "$profile")" || true
      fi
    done
  done
}

# ─── Main Flow ──────────────────────────────────────────────────────────
main() {
  show_logo

  confirm

  # ── Step 1: Stop and remove Docker resources ──
  step "Removing Docker resources"
  local compose_file
  compose_file="$(dirname "$0")/../docker-compose.yml"
  if docker compose -f "$compose_file" down --volumes --rmi local 2>/dev/null; then
    ok "Docker containers, images, and volumes removed"
  else
    # Fallback: try manual cleanup
    if docker ps -a --filter "name=vaultchain" --format '{{.Names}}' 2>/dev/null | grep -q .; then
      docker rm -f $(docker ps -a --filter "name=vaultchain" -q) 2>/dev/null && ok "Containers removed" || info "No containers to remove"
    else
      info "No running containers"
    fi
  fi

  # ── Step 2: Remove CA from Firefox trust stores ──
  step "Removing CA from browser trust stores"
  remove_ca

  # ── Step 3: Uninstall npm package ──
  step "Uninstalling npm package"
  if command -v caesar &>/dev/null; then
    npm uninstall -g caesar-vault 2>/dev/null && ok "npm package removed" || fail "Failed to remove npm package"
  else
    info "Not installed globally"
  fi

  # ── Step 4: Remove vault data ──
  step "Removing vault data"
  if [ -d "$HOME/.caesar" ]; then
    if ! rm -rf "$HOME/.caesar" 2>/dev/null || [ -d "$HOME/.caesar" ]; then
      info "Some files need elevated permissions, using sudo..."
      sudo rm -rf "$HOME/.caesar" 2>/dev/null
    fi
    if [ ! -d "$HOME/.caesar" ]; then
      ok "Vault data removed (~/.caesar/)"
    else
      fail "Could not fully remove ~/.caesar/ — manual cleanup needed"
      info "Run: sudo rm -rf $HOME/.caesar"
    fi
  else
    info "No vault directory found"
  fi

  # ── Done ──
  echo ""
  echo ""
  echo -e "  ${GREEN}${BOLD}✓  Caesar has been uninstalled.${RESET}"
  echo ""
}

main "$@"
