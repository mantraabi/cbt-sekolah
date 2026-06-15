#!/bin/bash
# db-setup.sh — Setup MySQL di VPS untuk CBT
# Jalankan sebagai root: sudo bash db-setup.sh

echo "=== Setup MySQL untuk CBT ==="

# ============================================
# 1. INSTALL MYSQL
# ============================================
echo "[1/5] Install MySQL..."
apt update -y
apt install mysql-server mysql-client -y
systemctl start mysql
systemctl enable mysql

# ============================================
# 2. SECURE INSTALLATION
# ============================================
echo "[2/5] Secure MySQL..."
# Set root password & remove test DB
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'GANTI_PASSWORD_ROOT_DISINI';"
mysql -e "DELETE FROM mysql.user WHERE User='';"
mysql -e "DROP DATABASE IF EXISTS test;"
mysql -e "FLUSH PRIVILEGES;"

# ============================================
# 3. BUAT DATABASE & USER
# ============================================
echo "[3/5] Buat database CBT..."
DB_NAME="db_cbt_sekolah"
DB_USER="user_cbt"
DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)

mysql -u root -p"GANTI_PASSWORD_ROOT_DISINI" <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

echo ""
echo "=== Database Info ==="
echo "  DB_NAME: ${DB_NAME}"
echo "  DB_USER: ${DB_USER}"
echo "  DB_PASS: ${DB_PASS}"
echo "  DB_HOST: localhost"
echo ""
echo "  SIMPAN INFO INI! Masukkan ke .env server-cbt"
echo ""

# ============================================
# 4. OPTIMASI MYSQL UNTUK CBT
# ============================================
echo "[4/5] Optimasi MySQL..."
cat > /etc/mysql/conf.d/cbt-optimization.cnf <<EOF
[mysqld]
# CBT Optimization
max_connections = 200
innodb_buffer_pool_size = 256M
innodb_log_file_size = 64M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
thread_cache_size = 16
table_open_cache = 400
sort_buffer_size = 2M
read_buffer_size = 2M
read_rnd_buffer_size = 1M
join_buffer_size = 2M

# Timeout
wait_timeout = 600
interactive_timeout = 600

# Charset
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
EOF

systemctl restart mysql

# ============================================
# 5. SETUP AUTO BACKUP
# ============================================
echo "[5/5] Setup auto backup..."
BACKUP_DIR="/opt/cbt-backups"
mkdir -p ${BACKUP_DIR}

# Buat backup script
cat > /usr/local/bin/cbt-backup.sh <<BACKUP
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
FILENAME="backup_cbt_\${DATE}.sql.gz"
mysqldump -u ${DB_USER} -p"${DB_PASS}" ${DB_NAME} 2>/dev/null | gzip > ${BACKUP_DIR}/\${FILENAME}
# Hapus backup > 30 hari
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
echo "[\$(date)] Backup: \${FILENAME}"
BACKUP

chmod +x /usr/local/bin/cbt-backup.sh

# Tambah cron: setiap jam 2 pagi
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cbt-backup.sh >> /var/log/cbt-backup.log 2>&1") | crontab -

echo ""
echo "=== Setup Selesai ==="
echo ""
echo "Backup otomatis: Setiap jam 02:00"
echo "Lokasi backup: ${BACKUP_DIR}"
echo "Retensi: 30 hari"
echo ""
echo "Manual backup: /usr/local/bin/cbt-backup.sh"
echo "Restore: zcat ${BACKUP_DIR}/file.sql.gz | mysql -u ${DB_USER} -p ${DB_NAME}"
echo ""
