#!/bin/bash
# ============================================================
# CBT SEKOLAH — ONE-LINE INSTALLER
# ============================================================
# Pakai: curl -sL https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/install.sh | bash
# Atau:  wget -qO- https://raw.githubusercontent.com/mantraabi/cbt-sekolah/main/install.sh | bash
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Config
INSTALL_DIR="/opt/cbt-sekolah"
REPO_URL="https://github.com/mantraabi/cbt-sekolah/archive/refs/heads/main.tar.gz"
NODE_VERSION="20"

# ============================================================
# FUNCTIONS
# ============================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                  ║${NC}"
    echo -e "${CYAN}║   ${GREEN}🏫 CBT SEKOLAH — Installer v1.0${CYAN}               ║${NC}"
    echo -e "${CYAN}║   ${BLUE}Computer Based Test untuk Sekolah${CYAN}              ║${NC}"
    echo -e "${CYAN}║                                                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
}

log() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

step() {
    echo ""
    echo -e "${BLUE}━━━ $1 ━━━${NC}"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Jalankan sebagai root: sudo bash install.sh"
    fi
}

check_os() {
    if [ -f /etc/debian_version ]; then
        OS="debian"
        PKG_MGR="apt"
    elif [ -f /etc/redhat-release ]; then
        OS="redhat"
        PKG_MGR="yum"
    else
        error "OS tidak didukung. Gunakan Ubuntu/Debian/CentOS."
    fi
    log "OS terdeteksi: $OS"
}

# ============================================================
# INSTALL STEPS
# ============================================================

install_system_deps() {
    step "1/8 Install System Dependencies"
    
    if [ "$PKG_MGR" = "apt" ]; then
        apt update -y
        apt install -y curl wget git build-essential
    else
        yum update -y
        yum install -y curl wget git gcc-c++ make
    fi
    
    log "System dependencies terinstall"
}

install_nodejs() {
    step "2/8 Install Node.js ${NODE_VERSION}"
    
    if command -v node &> /dev/null; then
        CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
            log "Node.js sudah terinstall: $(node -v)"
            return
        fi
    fi
    
    if [ "$PKG_MGR" = "apt" ]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | bash -
        yum install -y nodejs
    fi
    
    log "Node.js $(node -v) terinstall"
}

install_mysql() {
    step "3/8 Install & Setup MySQL"
    
    if command -v mysql &> /dev/null; then
        log "MySQL sudah terinstall"
    else
        if [ "$PKG_MGR" = "apt" ]; then
            apt install -y mysql-server
        else
            yum install -y mysql-server
            systemctl start mysqld
            systemctl enable mysqld
        fi
    fi
    
    systemctl start mysql 2>/dev/null || systemctl start mysqld 2>/dev/null
    systemctl enable mysql 2>/dev/null || systemctl enable mysqld 2>/dev/null
    
    log "MySQL berjalan"
}

setup_database() {
    step "4/8 Setup Database"
    
    # Generate random password
    DB_NAME="db_cbt_sekolah"
    DB_USER="user_cbt"
    DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    MYSQL_ROOT_PASS=""
    
    # Try to create DB (with or without root password)
    mysql -u root <<EOF 2>/dev/null || mysql -u root -p <<EOF
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF
    
    log "Database '${DB_NAME}' dibuat"
    log "User '${DB_USER}' dibuat"
    
    # Save credentials
    echo "DB_NAME=${DB_NAME}" > /tmp/cbt_db_credentials
    echo "DB_USER=${DB_USER}" >> /tmp/cbt_db_credentials
    echo "DB_PASS=${DB_PASS}" >> /tmp/cbt_db_credentials
}

download_app() {
    step "5/8 Download CBT Sekolah"
    
    # Clean previous install
    rm -rf ${INSTALL_DIR}
    mkdir -p ${INSTALL_DIR}
    
    # Download from GitHub
    cd /tmp
    wget -qO cbt-sekolah.tar.gz "${REPO_URL}" 2>/dev/null || curl -sL -o cbt-sekolah.tar.gz "${REPO_URL}"
    
    if [ ! -f cbt-sekolah.tar.gz ]; then
        error "Gagal download. Cek koneksi internet."
    fi
    
    # Extract
    tar -xzf cbt-sekolah.tar.gz
    mv cbt-sekolah-main/server-cbt/* ${INSTALL_DIR}/
    mv cbt-sekolah-main/client-cbt ${INSTALL_DIR}/client-cbt
    rm -rf cbt-sekolah-main cbt-sekolah.tar.gz
    
    log "File terdownload ke ${INSTALL_DIR}"
}

setup_app() {
    step "6/8 Setup Aplikasi"
    
    cd ${INSTALL_DIR}
    
    # Install dependencies
    npm install --production

    # Build frontend
    log "Build frontend..."
    if [ -d "${INSTALL_DIR}/client-cbt" ]; then
        cd ${INSTALL_DIR}/client-cbt
        npm install
        npm run build
        if [ -d "${INSTALL_DIR}/client-cbt/dist" ]; then
            rm -rf ${INSTALL_DIR}/public/*
            cp -r ${INSTALL_DIR}/client-cbt/dist/* ${INSTALL_DIR}/public/
            log "Frontend built ke public/"
        else
            warn "Build gagal, server API-only"
        fi
        rm -rf ${INSTALL_DIR}/client-cbt/node_modules
        cd ${INSTALL_DIR}
    fi

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Load DB credentials
    source /tmp/cbt_db_credentials
    
    # Create .env
    cat > ${INSTALL_DIR}/.env <<EOF
PORT=5000
NODE_ENV=production
DB_HOST=localhost
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASS=${DB_PASS}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
CORS_ORIGINS=*
LICENSE_SECRET=$(openssl rand -hex 16)
EOF
    
    # Create data directory for uploads
    mkdir -p ${INSTALL_DIR}/public/uploads
    mkdir -p ${INSTALL_DIR}/logs
    mkdir -p ${INSTALL_DIR}/backups
    
    # Set permissions
    chmod 600 ${INSTALL_DIR}/.env
    
    log "Aplikasi terkonfigurasi"
    
    # Save install info
    cat > ${INSTALL_DIR}/INSTALL_INFO.txt <<EOF
============================================
CBT SEKOLAH — Info Install
============================================
Tanggal: $(date)
Direktori: ${INSTALL_DIR}

DATABASE:
  DB_NAME: ${DB_NAME}
  DB_USER: ${DB_USER}
  DB_PASS: ${DB_PASS}
  DB_HOST: localhost

JWT_SECRET: ${JWT_SECRET}

PORT: 5000

PERINTAH BERGUNA:
  cd ${INSTALL_DIR}
  pm2 status              — Status server
  pm2 logs server-cbt     — Lihat log
  pm2 restart server-cbt  — Restart
  pm2 stop server-cbt     — Stop
  
  nano .env               — Edit config
  /usr/local/bin/cbt-backup.sh — Backup manual

DEFAULT ADMIN:
  Username: admin
  Password: admin123
  
  ⚠️ SEGERA GANTI PASSWORD SETELAH LOGIN!
============================================
EOF
    
    log "Info install tersimpan di ${INSTALL_DIR}/INSTALL_INFO.txt"
}

setup_nginx() {
    step "7/8 Setup Nginx"
    
    if ! command -v nginx &> /dev/null; then
        if [ "$PKG_MGR" = "apt" ]; then
            apt install -y nginx
        else
            yum install -y nginx
        fi
    fi
    
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    cat > /etc/nginx/sites-available/cbt <<NGINX
server {
    listen 80;
    server_name _;
    location / {
        root ${INSTALL_DIR}/public;
        try_files \$uri \$uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
    }
    location /uploads/ {
        alias ${INSTALL_DIR}/public/uploads/;
    }
}
NGINX
    
    ln -sf /etc/nginx/sites-available/cbt /etc/nginx/sites-enabled/cbt
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl restart nginx && systemctl enable nginx
    log "Nginx berjalan di port 80"
}

start_server() {
    step "8/8 Start Server"
    
    cd ${INSTALL_DIR}
    
    # Install PM2
    npm install -g pm2
    
    # Start with PM2
    pm2 delete cbt-server 2>/dev/null || true
    pm2 start app.js --name cbt-server --max-memory-restart 500M
    pm2 save
    
    # Setup auto-start on boot
    pm2 startup systemd -u root --hp /root 2>/dev/null || true
    
    # Setup auto backup cron
    cat > /usr/local/bin/cbt-backup.sh <<BACKUP
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
source ${INSTALL_DIR}/.env
mysqldump -u \${DB_USER} -p"\${DB_PASS}" \${DB_NAME} 2>/dev/null | gzip > /opt/cbt-backups/backup_\${DATE}.sql.gz
find /opt/cbt-backups -name "*.sql.gz" -mtime +30 -delete
BACKUP
    chmod +x /usr/local/bin/cbt-backup.sh
    mkdir -p /opt/cbt-backups
    
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/cbt-backup.sh >> /var/log/cbt-backup.log 2>&1") | crontab -
    
    log "Server berjalan di port 5000"
    log "Auto-backup: setiap jam 02:00"
}

print_result() {
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}║   ✅ INSTALLASI SELESAI!                          ║${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}║   🌐 Akses: http://${SERVER_IP}                     ${NC}"
    echo -e "${GREEN}║                                                  ║${NC}"
    echo -e "${GREEN}║   👤 Admin Login:                                ${NC}"
    echo -e "${GREEN}║      Username: admin                             ${NC}"
    echo -e "${GREEN}║      Password: admin123                          ${NC}"
    echo -e "${GREEN}║                                                  ${NC}"
    echo -e "${GREEN}║   ⚠️  SEGERA GANTI PASSWORD!                      ${NC}"
    echo -e "${GREEN}║                                                  ${NC}"
    echo -e "${GREEN}║   📄 Info lengkap:                               ${NC}"
    echo -e "${GREEN}║      cat ${INSTALL_DIR}/INSTALL_INFO.txt          ${NC}"
    echo -e "${GREEN}║                                                  ${NC}"
    echo -e "${GREEN}║   🔑 Aktifkan lisensi di menu Pengaturan         ${NC}"
    echo -e "${GREEN}║                                                  ${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Cleanup
    rm -f /tmp/cbt_db_credentials
}

# ============================================================
# MAIN
# ============================================================

print_banner
check_root
check_os
install_system_deps
install_nodejs
install_mysql
setup_database
download_app
setup_app
setup_nginx
start_server
print_result
