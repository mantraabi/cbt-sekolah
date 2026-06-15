#!/bin/bash
# db-restore.sh — Restore database dari backup
# Usage: bash db-restore.sh /path/to/backup.sql.gz

BACKUP_FILE=$1
DB_NAME="db_cbt_sekolah"
DB_USER="user_cbt"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: bash db-restore.sh /path/to/backup.sql.gz"
    echo ""
    echo "Backup tersedia:"
    ls -lh /opt/cbt-backups/*.sql.gz 2>/dev/null || echo "  (tidak ada backup)"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ File tidak ditemukan: $BACKUP_FILE"
    exit 1
fi

echo "=== Restore Database CBT ==="
echo "File: $BACKUP_FILE"
echo "Target: $DB_NAME"
echo ""
read -p "⚠️  Data lama akan TIMPA! Lanjut? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "Batal."
    exit 0
fi

echo "[1/2] Extract & restore..."
gunzip -c "$BACKUP_FILE" | mysql -u $DB_USER -p $DB_NAME

echo "[2/2] Verifikasi..."
TABLES=$(mysql -u $DB_USER -p$DB_PASS -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';" -sN 2>/dev/null)
echo "  Tables: $TABLES"

echo ""
echo "✅ Restore selesai!"
echo "  Restart server: pm2 restart server-cbt"
