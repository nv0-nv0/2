#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git jq ufw fail2ban htop unzip gnupg lsb-release apt-transport-https software-properties-common

if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi
ARCH=$(dpkg --print-architecture)
CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker
systemctl restart docker

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

systemctl enable fail2ban
systemctl restart fail2ban

mkdir -p /opt/nv0-cleanroom/{releases,shared/runtime/{data,uploads,backups,reports},shared/deploy}
chmod -R 755 /opt/nv0-cleanroom

cat <<MSG
Bootstrap complete.
Confirmed:
- swap enabled (2G if previously absent)
- Docker Engine + Compose plugin installed
- UFW enabled for 22/80/443
- fail2ban enabled
- runtime directories prepared under /opt/nv0-cleanroom

Next steps:
1. Install Coolify using the official installer.
2. Add this server to Coolify using SSH key auth.
3. Import the app with deploy/docker-compose.coolify.yml.
4. Set /readyz as the health check path.
5. Point Cloudflare proxied DNS records to this server IP.
6. Configure Full (strict) SSL and Origin CA.
MSG
