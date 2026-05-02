# PHASE163 R2 원격 백업 자동화 및 보안 강화 보고서

## 목표

포트원 결제 연결과 통신판매업 신고번호 항목은 제외하고, 운영 안정성을 높이기 위해 로컬 백업 생성 이후 R2/S3 호환 저장소로 자동 업로드되는 구조를 추가했다. 동시에 관리자 백업·복원·운영 액션의 권한 통제, 백업 무결성, 원격 백업 보안 고지를 강화했다.

## 적용 결과

### 1. R2/S3 원격 백업 자동 업로드

- 관리자 백업 실행 시 `runtime/data/db.json`을 로컬 `runtime/backups/db-*.json`으로 저장한다.
- 같은 백업을 R2/S3 호환 저장소의 `backups/nv0/` prefix로 자동 업로드한다.
- 원격 업로드 대상은 DB 백업 본문, 백업 manifest, 업로드 파일 manifest다.
- R2 설정이 없거나 비활성화된 경우 백업 자체는 실패하지 않고, manifest에 `skipped` 사유를 남긴다.
- 서버 기동 후 자동 백업과 주기 백업을 설정값으로 제어할 수 있다.

### 2. 백업 보안 강화

- 원격 백업은 기본적으로 gzip 압축을 적용한다.
- `NV0_BACKUP_ENCRYPTION_SECRET`이 있으면 R2 업로드 전 AES-256-GCM + scrypt 방식으로 암호화한다.
- `NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true`인 경우 암호화 키가 없으면 기동 전 설정 오류로 차단한다.
- 백업 manifest에는 DB SHA-256, 크기, 생성 시각, 원격 object key, 업로드 성공/실패 상태를 기록한다.
- 복원 시 로컬 manifest의 SHA-256과 실제 백업 파일 해시를 비교해 변조/손상 여부를 확인한다.

### 3. 스크립트 백업 개선

- `npm run backup:runtime`도 로컬 snapshot만 만들지 않고, R2 원격 업로드를 시도한다.
- `db.json`, `uploads-manifest.json`, `backup-manifest.json`을 생성한다.
- 원격 업로드 결과와 보안 상태를 JSON으로 출력한다.

### 4. 관리자 보안 강화

- 관리자 로그인 API에도 IP allowlist 검사를 적용했다.
- 관리자 세션 조회 API에도 IP allowlist 검사를 적용했다.
- 백업, 복원, 유지보수 prune, 운영 리포트 생성, 운영 액션 API에 RBAC 권한 검사를 추가했다.
- `ops.read`, `ops.write`, `*` 권한 기준으로 운영 액션 접근을 제한한다.
- 기존 CSRF, same-origin 검사, 관리자 세션 기반 접근 제어는 유지했다.

### 5. 운영 진단 표시 강화

- 관리자 진단 응답에 원격 백업 설정 상태를 표시한다.
- 표시 항목에는 원격 백업 활성화, 자동 백업 활성화, 기동 시 백업 여부, 백업 주기, 원격 prefix, 압축 여부, 암호화 설정 여부, R2 설정 요약이 포함된다.

## 추가된 주요 환경값

```env
NV0_BACKUP_REMOTE_ENABLED=true
NV0_BACKUP_REMOTE_PREFIX=backups/nv0
NV0_BACKUP_COMPRESS=true
NV0_BACKUP_ENCRYPTION_SECRET=CHANGE_ME_LONG_RANDOM_BACKUP_SECRET
NV0_BACKUP_REMOTE_REQUIRE_ENCRYPTION=true
NV0_AUTO_BACKUP_ENABLED=true
NV0_AUTO_BACKUP_ON_STARTUP=true
NV0_AUTO_BACKUP_INTERVAL_MS=21600000
```

## 실제 운영 시 입력해야 할 값

`NV0_BACKUP_ENCRYPTION_SECRET`은 예시값 그대로 두면 안 된다. 운영 서버에서는 32자 이상의 긴 랜덤 문자열로 교체해야 한다. R2 업로드는 기존 `NV0_S3_ENDPOINT`, `NV0_S3_BUCKET`, `NV0_S3_ACCESS_KEY_ID`, `NV0_S3_SECRET_ACCESS_KEY`가 실제값일 때 동작한다.

## 검증

- 문법 검사 통과
- 전체 테스트 통과
- E2E 통과
- 라우트 스모크 통과
- 링크 검사 통과
- P156~P163 검증 통과
- `backup:runtime` 로컬/원격 비활성 시나리오 정상 실행 확인

## 한계 및 운영 확인 필요

실제 R2 키가 제공되지 않았기 때문에 실제 Cloudflare R2 버킷에 object가 생성되는 실연동 검사는 수행하지 않았다. 배포 후 관리자 백업 실행 또는 `npm run backup:runtime`을 실제 R2 환경값으로 실행해 버킷에 `backups/nv0/` object가 생성되는지 확인해야 한다.
