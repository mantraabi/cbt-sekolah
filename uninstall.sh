#!/bin/bash
# uninstall.sh — Hapus CBT Sekolah dari VPS
# Pakai: sudo bash uninstall.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="/opt/cbt-sekolah"

echo ""
echo -e "${RED}╔══════════════════════════════════════════╗${NC}"
echo -e "${RED}║  ⚠️  UNINSTALL CBT SEKOLAH               ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "Yang akan dihapus:"
echo "  - Aplikasi CBT (${INSTALL_DIR})"
echo "  - Database MySQL (db_cbt_sekolah)"
echo "  - PM2 process (cbt-server)"
echo "  - Cron backup"
echo ""
read -p "Ketik 'HAPUS' untuk konfirmasi: " confirm

if [ "$confirm" != "HAPUS" ]; then
    echo "Batal."
    exit 0
fi

echo ""
echo "[1/5] Stop server..."
pm2 stop cbt-server 2>/dev/null || true
pm2 delete cbt-server 2>/dev/null || true
pm2 save 2>/dev/null || true

echo "[2/5] Hapus database..."
source ${INSTALL_DIR}/.env 2>/dev/null || true
if [ -n "$DB_NAME" ]; then
    mysql -u root -e "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || \
    mysql -u root -p -e "DROP DATABASE IF EXISTS ${DB_NAME};" 2>/dev/null || true
    mysql -u root -e "DROP USER IF EXISTS '${DB_USER}'@'localhost';" 2>/dev/null || \
    mysql -u root -p -e "DROP USER IF EXISTS '${DB_USER}'@'localhost';" 2>/dev/null || true
fi

echo "[3/5] Hapus file aplikasi..."
rm -rf ${INSTALL_DIR}

echo "[4/5] Hapus backup..."
rm -rf /opt/cbt-backups

echo "[5/5] Hapus cron backup..."
crontab -l 2>/dev/null | grep -v "cbt-backup" | crontab - 2>/dev/null || true
rm -f /usr/local/bin/cbt-backup.sh

echo ""
echo -e "${GREEN}✅ CBT Sekolah berhasil dihapus.${NC}"
echo ""
