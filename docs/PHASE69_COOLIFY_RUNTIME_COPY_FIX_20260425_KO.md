# PHASE69 Coolify 배포 실패 수정 납품 보고서

## 수정 원인
Coolify Docker 빌드 중 Dockerfile의 `COPY runtime ./runtime` 단계에서 GitHub 배포 컨텍스트에 `runtime/` 디렉터리가 없어 이미지 빌드가 실패했습니다.

## 적용 조치
- Dockerfile에서 `COPY runtime ./runtime` 제거
- 컨테이너 빌드 단계에서 `/app/runtime/data`, `/app/runtime/uploads`, `/app/runtime/backups`, `/app/runtime/reports`를 생성하도록 유지
- entrypoint 실행 시에도 동일 런타임 디렉터리를 재생성하도록 유지

## 검증 결과
- `node scripts/check-source-syntax.mjs` 통과
- `node scripts/test-all.mjs` 통과: 85 passed / 0 failed
- `node scripts/validate-phase68-server-api-auto-diagnosis.mjs` 통과: 100점, 11/11 passed

## 배포 방법
1. 이 패키지의 `site` 폴더 내용을 GitHub 저장소 루트에 반영
2. `git add . && git commit -m "fix: Coolify runtime copy deployment failure" && git push origin main`
3. Coolify에서 Redeploy 실행

## 비고
`runtime/`은 소스에 포함해 복사하는 정적 파일이 아니라 컨테이너 실행 시 생성되는 운영 데이터 디렉터리로 관리하는 것이 안전합니다.
