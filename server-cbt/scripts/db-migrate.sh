#!/bin/bash
# db-migrate.sh — Migrasi database dari lokal ke VPS
# Jalankan dari komputer lokal

echo "=== Migrasi Database CBT ke VPS ==="

# ============================================
# KONFIGURASI (isi sesuai kebutuhan)
# ============================================
VPS_HOST="user@ip-vps"
VPS_PATH="/opt/server-cbt"

# Database lokal
LOCAL_DB="db_cbt_sekolah"
LOCAL_USER="root"
LOCAL_PASS=""

# Database VPS (ambil dari db-setup.sh output)
VPS_DB="db_cbt_sekolah"
VPS_USER="user_cbt"
VPS_PASS="GANTI_DENGAN_PASSWORD_VPS"

# ============================================
# PROSES MIGRASI
# ============================================

echo "[1/4] Export database lokal..."
mysqldump -u ${LOCAL_USER} ${LOCAL_PASS:+-p"$LOCAL_PASS"} ${LOCAL_DB} > /tmp/cbt_export.sql
echo "  Export: $(wc -l < /tmp/cbt_export.sql) baris"

echo "[2/4] Compress..."
gzip /tmp/cbt_export.sql
echo "  File: /tmp/cbt_export.sql.gz ($(du -h /tmp/cbt_export.sql.gz | cut -f1))"

echo "[3/4] Upload ke VPS..."
scp /tmp/cbt_export.sql.gz ${VPS_HOST}:/tmp/

echo "[4/4] Import ke VPS..."
ssh ${VPS_HOST} << REMOTE
    echo "  Extract..."
    gunzip /tmp/cbt_export.sql.gz
    echo "  Import..."
    mysql -u ${VPS_USER} -p"${VPS_PASS}" ${VPS_DB} < /tmp/cbt_export.sql
    echo "  Cleanup..."
    rm /tmp/cbt_export.sql
    echo "  Done!"
REMOTE

# Cleanup lokal
rm /tmp/cbt_export.sql.gz 2>/dev/null

echo ""
echo "=== Migrasi Selesai ==="
echo ""
echo "Langkah selanjutnya:"
echo "  1. SSH ke VPS: ssh ${VPS_HOST}"
echo "  2. Cek data: mysql -u ${VPS_USER} -p -e 'SELECT COUNT(*) FROM ${VPS_DB}.users;'"
echo "  3. Update .env di VPS dengan credentials yang benar"
echo "  4. Jalankan server: cd ${VPS_PATH} && npm start"
echo ""
