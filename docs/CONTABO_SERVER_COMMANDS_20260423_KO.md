# Contabo 서버 명령 체크리스트 (2026-04-23)

## 1. 초기 접속
```bash
ssh root@YOUR_SERVER_IP
```

## 2. 부트스트랩 실행
```bash
bash /opt/nv0/contabo-bootstrap.sh
```
또는 저장소 기준:
```bash
chmod +x deploy/contabo-bootstrap.sh
sudo ./deploy/contabo-bootstrap.sh
```

## 3. Docker / 방화벽 / 시간대 확인
```bash
docker --version
systemctl status docker --no-pager
ufw status
timedatectl
```

## 4. 배포 전
```bash
cp deploy/env.production.template .env
npm run preflight
```

## 5. 배포 후
```bash
curl -I https://nv0.kr/healthz
curl -I https://nv0.kr/readyz
```
