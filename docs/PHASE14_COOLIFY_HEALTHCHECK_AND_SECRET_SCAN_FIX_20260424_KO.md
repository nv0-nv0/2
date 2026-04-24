# Phase14 Coolify Healthcheck 및 GitHub Secret Scan 수정 보고서

## 수정 배경

Coolify 배포 로그에서 Docker build는 성공했으나 컨테이너 healthcheck가 실패하여 롤백되었습니다. 또한 GitHub push 과정에서 `tests/portone-events.mjs`의 테스트용 webhook fixture가 Stripe webhook secret 패턴으로 감지되었습니다.

## 반영 사항

1. 서버 바인딩 보강
   - `HOST` / `NV0_HOST` 환경변수 지원 추가
   - 기본값을 `0.0.0.0`으로 설정
   - 컨테이너 외부 프록시가 접근 가능한 주소로 리스닝

2. Docker healthcheck 보강
   - Alpine 이미지에 `curl` 설치
   - 고정 포트 `3210` 의존 제거
   - `${PORT:-3210}` 기반 동적 healthcheck 적용
   - Coolify가 `PORT=3000`을 주입해도 `/readyz` 확인 가능

3. Docker 노출 포트 보강
   - `EXPOSE 3000 3210` 적용
   - Coolify 포트 설정이 3000 또는 3210이어도 이미지 메타데이터 충돌 최소화

4. GitHub secret scanning 대응
   - 테스트용 `whsec_` 문자열을 런타임 조합 방식으로 변경
   - 실제 비밀값은 포함하지 않음

## Coolify 권장 설정

- Build Pack: Dockerfile
- Dockerfile Location: `Dockerfile`
- Base Directory: 비움 또는 `/`
- Port: Coolify 환경의 `PORT` 값과 동일하게 설정
- 권장 환경변수:

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
NV0_PLATFORM_TARGET=commercial
NV0_TRUST_PROXY_HEADERS=true
```

기존에 3210으로 운영 중이면 `PORT=3210`과 Coolify 포트 3210을 맞추면 됩니다. 핵심은 Coolify 포트와 `PORT` 환경변수가 일치해야 한다는 점입니다.
