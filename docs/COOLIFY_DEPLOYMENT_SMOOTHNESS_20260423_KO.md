# Coolify / Contabo 배포 매끄럽게 하기 보강 항목

## 이번에 추가된 실제 파일
- `deploy/entrypoint.sh` : 컨테이너 시작 시 preflight 후 서버 기동
- `deploy/contabo-bootstrap.sh` : Docker/Swap/UFW/fail2ban 포함 부트스트랩
- `deploy/coolify.env.example` : Coolify 환경변수 복붙용 예시
- `deploy/docker-compose.coolify.yml` : healthcheck / runtime volume / domain labels 포함
- `scripts/validate-deploy-bundle.mjs` : 배포 번들 누락 검증

## 기대 효과
1. 잘못된 환경변수/기본 관리자 키 상태에서 컨테이너가 바로 실패하여 조기 감지
2. Contabo 서버 초회 셋업 시 Docker 누락 가능성 제거
3. Coolify 입력값 복사 실수 감소
4. runtime 영속 볼륨 누락 방지
5. `/readyz` 헬스체크 누락 방지

## 배포 전 최소 실행 순서
```bash
npm run validate:deploy
NV0_ADMIN_KEY=strong-admin-key NODE_ENV=production npm run preflight
npm run test:e2e
npm run smoke
```
