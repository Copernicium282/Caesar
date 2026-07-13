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
  echo -e "    ${MUTED}~/.caesar/${RESET}          vault data, TLS certs, wallet"
  echo -e "    ${MUTED}caesar${RESET}               globally installed CLI"
  echo -e "    ${MUTED}caesar-caesar${RESET}        Docker image & containers"
  echo -e "    ${MUTED}vaultchain_caesar_data${RESET}  MongoDB volume"
  echo ""
  echo -ne "  ${RED}${BOLD}Are you sure? (y/N): ${RESET}"
  read -r choice
  if [[ ! "$choice" =~ ^[yY]$ ]]; then
    echo -e "\n  ${MUTED}Cancelled.${RESET}"
    exit 0
  fi
}

# ─── Main Flow ──────────────────────────────────────────────────────────
main() {
  show_logo

  confirm

  # ── Step 1: Stop containers ──
  step "Stopping containers"
  if docker ps -q --filter "name=vaultchain" 2>/dev/null | grep -q .; then
    docker compose -f "$(dirname "$0")/../docker-compose.yml" down 2>/dev/null || true
    ok "Containers stopped"
  else
    info "No running containers"
  fi

  # ── Step 2: Remove Docker resources ──
  step "Removing Docker resources"
  docker rm -f vaultchain-caesar-1 vaultchain-mongo-1 2>/dev/null && ok "Containers removed" || info "No containers to remove"
  docker image rm vaultchain-caesar 2>/dev/null && ok "Image removed" || info "No image to remove"
  docker volume rm vaultchain_caesar_data 2>/dev/null && ok "Volume removed" || info "No volume to remove"
  docker network rm vaultchain_default 2>/dev/null && ok "Network removed" || info "No network to remove"

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
    # Root-owned files from Docker need sudo
    if [ -n "$(find "$HOME/.caesar" -user root 2>/dev/null)" ]; then
      info "Some files owned by root (from Docker), using sudo..."
      sudo chmod -R 777 "$HOME/.caesar" 2>/dev/null || true
    fi
    rm -rf "$HOME/.caesar" 2>/dev/null
    if [ ! -d "$HOME/.caesar" ]; then
      ok "Vault data removed (~/.caesar/)"
    else
      fail "Could not fully remove ~/.caesar/ — some files may need manual cleanup"
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
