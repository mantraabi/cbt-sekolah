#!/bin/bash
# auto-backup.sh — Backup MySQL database CBT
# Jalankan via cron: 0 2 * * * /path/to/auto-backup.sh
# Artinya: setiap jam 02:00 pagi

# ============================================
# KONFIGURASI (sesuaikan dengan .env)
# ============================================
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-cbt_db}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
BACKUP_DIR="./backups"
RETENTION_DAYS=30  # Hapus backup lebih dari 30 hari

# ============================================
# PROSES BACKUP
# ============================================
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="backup_cbt_${DATE}.sql.gz"
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# Buat direktori backup jika belum ada
mkdir -p "$BACKUP_DIR"

# Dump database + compress
mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" 2>/dev/null | gzip > "$FILEPATH"

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$FILEPATH" | cut -f1)
    echo "[$(date)] ✅ Backup berhasil: $FILENAME ($SIZE)"
    
    # Hapus backup lama (> RETENTION_DAYS hari)
    find "$BACKUP_DIR" -name "backup_cbt_*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
    echo "[$(date)] 🧹 Backup lama (> ${RETENTION_DAYS} hari) dihapus"
else
    echo "[$(date)] ❌ Backup gagal!"
    rm -f "$FILEPATH"  # Hapus file kosong jika gagal
fi
