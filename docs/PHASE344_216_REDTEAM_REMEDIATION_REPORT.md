# PHASE344 216개 레드팀 개선 처리 보고서

- 생성 시각: 2026-05-28T14:33:12Z
- 상태: 실제 패키지 수정 완료 + 검증 완료
- 범위: 데모 서버 오류 복구, 운영 env 정합성, healthcheck, 프론트 오류 UX, 회귀 테스트, 배포 게이트
- 중요 한계: 실제 nv0.kr 운영 서버에는 이 패키지를 배포해야 반영됩니다. 이 저장소 수정만으로 운영 서버가 자동 변경되지는 않습니다.

## 핵심 변경

1. `/api/public/diagnose`는 외부 진단 provider 장애 시 `builtin_fallback` 결과를 반환합니다.
2. `localhost`, 사설 IP, metadata 계열 대상은 서버 500 대신 `completed_limited_blocked_target` 제한 결과를 반환합니다.
3. Docker/Coolify healthcheck는 HTTP status뿐 아니라 JSON `ok:true`까지 확인합니다.
4. `NV0_SCAN_PROVIDER_FALLBACK=false`가 무료 데모 장애로 이어지지 않도록 preflight/production validator가 차단합니다.
5. 데모 화면은 서버 장애 시에도 requestId/문의 코드와 로컬 안전 결과를 표시합니다.

## 변경 파일
- `server/index.mjs`
- `apps/public/demo/app.js`
- `apps/public/veridion-demo/app.js`
- `tests/diagnose-fallback.mjs`
- `package.json`
- `docker-compose.yml`
- `deploy/docker-compose.commercial.yml`
- `deploy/docker-compose.coolify.yml`
- `deploy/docker-compose.local-minio.yml`
- `deploy/env.commercial.template`
- `deploy/env.production.nv0.kr.ci-check.env`
- `scripts/preflight.mjs`
- `scripts/validate-prod-env.mjs`
- `scripts/generate-r2-coolify-env.mjs`
- `server/bootstrap/commercial-env.mjs`
- `server/config/validation.mjs`
- `server/core/admin-auth.mjs`
- `server/core/phase313-operations-governance.mjs`

## 216개 처리 내역

### DAPI. 데모/진단 API 복구성 — 18개
1. [DAPI] 외부 진단 provider 장애 시 public demo 강제 fallback — 처리 완료
2. [DAPI] provider 연결 거부/timeout/DNS 실패를 제한 결과로 전환 — 처리 완료
3. [DAPI] 사설 IP·localhost·metadata 계열 URL을 blocked_target_limited로 처리 — 처리 완료
4. [DAPI] blocked target을 500이 아닌 제한 진단 결과로 반환 — 처리 완료
5. [DAPI] upstreamProviderStatus.fallbackApplied 상태를 결과에 포함 — 처리 완료
6. [DAPI] resultStatus completed_limited_fallback 표준화 — 처리 완료
7. [DAPI] resultStatus completed_limited_blocked_target 추가 — 처리 완료
8. [DAPI] resultLimitNotice로 사용자 표시용 한계 고지 — 처리 완료
9. [DAPI] PUBLIC_DEMO_FORCE_SCAN_FALLBACK 운영 스위치 추가 — 처리 완료
10. [DAPI] SCAN_PROVIDER_FALLBACK=false일 때도 무료 데모 보호 — 처리 완료
11. [DAPI] 외부 provider 오류 메시지 내부 노출 축소 — 처리 완료
12. [DAPI] 내장 진단 fallback에서도 AI review 계층 유지 — 처리 완료
13. [DAPI] 대상 fetch soft-timeout 안전 요약 유지 — 처리 완료
14. [DAPI] fetch 실패 시 empty result 대신 보수 점수 반환 — 처리 완료
15. [DAPI] 진단 requestId 누락 시 uid 보정 — 처리 완료
16. [DAPI] legacy diagnostic start 호환 유지 — 처리 완료
17. [DAPI] 결과 저장/portal handoff 유지 — 처리 완료
18. [DAPI] 신규 회귀 테스트 tests/diagnose-fallback.mjs 추가 — 처리 완료

### ENV. 운영 환경변수/상용 게이트 정합성 — 26개
19. [ENV] NV0_SCAN_PROVIDER_FALLBACK=true 운영 기준 통일 — 처리 완료
20. [ENV] commercial env matrix의 관리자 키 이름을 BOOTSTRAP 기준으로 수정 — 처리 완료
21. [ENV] Turnstile SECRET/SECRET_KEY alias 허용 — 처리 완료
22. [ENV] admin email/password alias 허용 — 처리 완료
23. [ENV] preflight에서 fallback=false를 오류로 차단 — 처리 완료
24. [ENV] validate-prod-env에서 fallback=false를 오류로 차단 — 처리 완료
25. [ENV] CI production-shape env에 secure records key 추가 — 처리 완료
26. [ENV] CI production-shape env에 privacy hash key 추가 — 처리 완료
27. [ENV] CI production-shape env에 backup encryption secret 추가 — 처리 완료
28. [ENV] CI production-shape env에 backup encryption required 추가 — 처리 완료
29. [ENV] generate-r2-coolify-env fallback true로 변경 — 처리 완료
30. [ENV] env.commercial.template fallback true로 변경 — 처리 완료
31. [ENV] commercial prelaunch payment disabled 경계 유지 — 처리 완료
32. [ENV] commercial_launch portone_v2 경계 유지 — 처리 완료
33. [ENV] prelaunch missing business profile warning 유지 — 처리 완료
34. [ENV] commercial_launch missing business profile error 유지 — 처리 완료
35. [ENV] Turnstile enabled 시 alias 기반 검증 — 처리 완료
36. [ENV] bootstrap admin account env alias 지원 — 처리 완료
37. [ENV] commercial-env warnings에 scan fallback risk 추가 — 처리 완료
38. [ENV] commercial-env warnings에 turnstile secret missing 추가 — 처리 완료
39. [ENV] production validator output 안정화 — 처리 완료
40. [ENV] operational contract env template 통과 — 처리 완료
41. [ENV] phase328 prelaunch gate 통과 — 처리 완료
42. [ENV] phase329 mail-order pending gate 통과 — 처리 완료
43. [ENV] phase330 postgres fallback gate 통과 — 처리 완료
44. [ENV] phase343 operational contract 통과 — 처리 완료

### HEALTH. Docker/Coolify/헬스체크 — 16개
45. [HEALTH] Docker healthcheck가 HTTP status와 body.ok를 함께 검사 — 처리 완료
46. [HEALTH] root docker-compose healthcheck body.ok 검사 — 처리 완료
47. [HEALTH] commercial docker-compose healthcheck body.ok 검사 — 처리 완료
48. [HEALTH] coolify docker-compose healthcheck body.ok 검사 — 처리 완료
49. [HEALTH] local-minio docker-compose healthcheck body.ok 검사 — 처리 완료
50. [HEALTH] /healthz body ok와 HTTP status 정합화 — 처리 완료
51. [HEALTH] /healthz는 기본 liveness로 유지 — 처리 완료
52. [HEALTH] /readyz는 의존성 readiness로 유지 — 처리 완료
53. [HEALTH] NV0_HEALTHZ_STRICT로 commercial_launch 엄격화 — 처리 완료
54. [HEALTH] prelaunch postgres DNS fallback 부트 프로브 보존 — 처리 완료
55. [HEALTH] runtime clean gate 통과 — 처리 완료
56. [HEALTH] Coolify env detection 기존 검증 호환 — 처리 완료
57. [HEALTH] deploy bundle /healthz expose 유지 — 처리 완료
58. [HEALTH] healthcheck 캐시 no-store 유지 — 처리 완료
59. [HEALTH] Docker failure 시 재시작 판단 정확도 개선 — 처리 완료
60. [HEALTH] phase325 server availability 100점 유지 — 처리 완료

### DB. DB/Redis/S3·R2/저장소 설정 — 15개
61. [DB] postgres prelaunch DNS 오류 JSON fallback 유지 — 처리 완료
62. [DB] commercial_launch PostgreSQL strict boundary 유지 — 처리 완료
63. [DB] redis advisory/strict readiness 구분 유지 — 처리 완료
64. [DB] S3 compatible storage env contract 유지 — 처리 완료
65. [DB] secure records key env 검증 보강 — 처리 완료
66. [DB] privacy hash key env 검증 보강 — 처리 완료
67. [DB] backup encryption env 검증 보강 — 처리 완료
68. [DB] runtime ephemeral fallback 문서 경계 유지 — 처리 완료
69. [DB] local runtime state release exclusion 유지 — 처리 완료
70. [DB] runtime-test directory clean-up 유지 — 처리 완료
71. [DB] session persistence 기존 회귀 유지 — 처리 완료
72. [DB] secure record store config 누락 차단 — 처리 완료
73. [DB] object storage placeholders release hygiene 통과 — 처리 완료
74. [DB] prelaunch fallback log marker 유지 — 처리 완료
75. [DB] storage config check 기준 유지 — 처리 완료

### UX. 프론트 데모 UX/오류/캐시 — 24개
76. [UX] jsonFetch가 object error를 사용자 메시지로 정규화 — 처리 완료
77. [UX] 오류 requestId를 클라이언트 Error 객체에 보존 — 처리 완료
78. [UX] fallback 결과에 requestId/errorCode 주입 — 처리 완료
79. [UX] 오류 상태 문구를 server/turnstile/general로 분기 — 처리 완료
80. [UX] 문의 코드 표시 — 처리 완료
81. [UX] result hero에 문의 코드 표시 — 처리 완료
82. [UX] metric strip에 문의 코드 카드 추가 — 처리 완료
83. [UX] 로컬 안전 결과 캐시 유지 — 처리 완료
84. [UX] 최근 5분 캐시 재사용 유지 — 처리 완료
85. [UX] server result와 client fallback 모두 saveScan 유지 — 처리 완료
86. [UX] Turnstile 실패 시 버튼 동작 유지 — 처리 완료
87. [UX] retry button listener 유지 — 처리 완료
88. [UX] progress panel 유지 — 처리 완료
89. [UX] 비회원 횟수 초과 UX 유지 — 처리 완료
90. [UX] invalid URL 즉시 안내 유지 — 처리 완료
91. [UX] fallback summary 보수 고지 유지 — 처리 완료
92. [UX] manualReviewRequired 표시 유지 — 처리 완료
93. [UX] fallback detail findings 3개 유지 — 처리 완료
94. [UX] 무료/유료 리포트 연결 유지 — 처리 완료
95. [UX] portal link handoff 유지 — 처리 완료
96. [UX] demo/veridion-demo 동일 패치 적용 — 처리 완료
97. [UX] client syntax check 통과 — 처리 완료
98. [UX] inline event handler zero 유지 — 처리 완료
99. [UX] console.log zero 유지 — 처리 완료

### PERF. 성능/속도/번들/캐시 — 16개
100. [PERF] 외부 provider 장애 시 긴 대기 대신 fallback — 처리 완료
101. [PERF] target fetch soft-timeout 유지 — 처리 완료
102. [PERF] public demo progress skeleton 유지 — 처리 완료
103. [PERF] same URL 5분 cache 유지 — 처리 완료
104. [PERF] static asset cache policy 유지 — 처리 완료
105. [PERF] public page performance budget 통과 — 처리 완료
106. [PERF] HTML budget 통과 — 처리 완료
107. [PERF] CSS budget 통과 — 처리 완료
108. [PERF] JS budget 통과 — 처리 완료
109. [PERF] fallback path async blocking 최소화 — 처리 완료
110. [PERF] healthcheck body parse 경량화 — 처리 완료
111. [PERF] readiness cache TTL 유지 — 처리 완료
112. [PERF] link check 491개 통과 — 처리 완료
113. [PERF] page map 51개 통과 — 처리 완료
114. [PERF] route smoke 유지 — 처리 완료
115. [PERF] slow request logging 유지 — 처리 완료

### SEC. 보안/개인정보/SSRF/결제 경계 — 12개
116. [SEC] localhost/private IP 자동 수집 차단 — 처리 완료
117. [SEC] metadata/google internal host 차단 유지 — 처리 완료
118. [SEC] manual redirect SSRF guard 유지 — 처리 완료
119. [SEC] response size limit 유지 — 처리 완료
120. [SEC] no secret hygiene 통과 — 처리 완료
121. [SEC] admin public hidden 유지 — 처리 완료
122. [SEC] CSRF header required 유지 — 처리 완료
123. [SEC] payment redirect allowlist 유지 — 처리 완료
124. [SEC] public info leak headers minimized 유지 — 처리 완료
125. [SEC] Turnstile gate support 유지 — 처리 완료
126. [SEC] privacy hash key env 보강 — 처리 완료
127. [SEC] release secret hygiene findings 0 유지 — 처리 완료

### QA. 테스트/QA/회귀/E2E — 18개
128. [QA] 신규 diagnose fallback 회귀 테스트 추가 — 처리 완료
129. [QA] external provider outage 테스트 — 처리 완료
130. [QA] SCAN_PROVIDER_FALLBACK=false 보호 테스트 — 처리 완료
131. [QA] blocked target limited 테스트 — 처리 완료
132. [QA] healthz JSON body 검사 테스트 경로 확보 — 처리 완료
133. [QA] npm test 904/904 통과 — 처리 완료
134. [QA] test:e2e 통과 — 처리 완료
135. [QA] test:routes 통과 — 처리 완료
136. [QA] smoke 통과 — 처리 완료
137. [QA] check:syntax 220개 통과 — 처리 완료
138. [QA] check:pages 통과 — 처리 완료
139. [QA] check:links 통과 — 처리 완료
140. [QA] check:responsive-contract 통과 — 처리 완료
141. [QA] check:performance-budget 통과 — 처리 완료
142. [QA] verify:security 통과 — 처리 완료
143. [QA] validate:deploy 통과 — 처리 완료
144. [QA] phase343 final gate 통과 — 처리 완료
145. [QA] production env validator sample 통과 — 처리 완료

### OBS. 관측성/로그/운영 알림 — 13개
146. [OBS] requestId x-request-id 유지 — 처리 완료
147. [OBS] client 문의 코드 표시 — 처리 완료
148. [OBS] upstreamProviderStatus 추가 — 처리 완료
149. [OBS] fallbackApplied 상태 추가 — 처리 완료
150. [OBS] resultStatus 표준화 — 처리 완료
151. [OBS] resultLimitNotice 표준화 — 처리 완료
152. [OBS] readyz_failed structured log 유지 — 처리 완료
153. [OBS] request_error code/status 확장 — 처리 완료
154. [OBS] slow_request logging 유지 — 처리 완료
155. [OBS] privacy pseudonymized IP 유지 — 처리 완료
156. [OBS] health readinessAdvisory 추가 — 처리 완료
157. [OBS] commercialEnv missing/warnings 노출은 health advisory로 제한 — 처리 완료
158. [OBS] diagnose audit append 유지 — 처리 완료

### CODE. 코드 구조/중복/유지보수 — 20개
159. [CODE] buildBlockedTargetScanResult 분리 — 처리 완료
160. [CODE] externalScanPublicFallbackEnabled 분리 — 처리 완료
161. [CODE] healthz strict/liveness 분리 — 처리 완료
162. [CODE] admin-auth env alias 중앙 처리 — 처리 완료
163. [CODE] commercial-env matrix 정합화 — 처리 완료
164. [CODE] validation warnings 일원화 — 처리 완료
165. [CODE] public demo error parser 개선 — 처리 완료
166. [CODE] demo와 veridion-demo 동일 로직 유지 — 처리 완료
167. [CODE] package script에 test:diagnose-fallback 추가 — 처리 완료
168. [CODE] phase340/phase337/phase343 gate에 fallback 테스트 연결 — 처리 완료
169. [CODE] no removed files — 처리 완료
170. [CODE] minimal file-change 방식 유지 — 처리 완료
171. [CODE] server syntax 유지 — 처리 완료
172. [CODE] public client syntax 유지 — 처리 완료
173. [CODE] legacy route compatibility 유지 — 처리 완료
174. [CODE] legacy diagnostic start compatibility 유지 — 처리 완료
175. [CODE] payment route side effect 없음 — 처리 완료
176. [CODE] account rescan side effect 없음 — 처리 완료
177. [CODE] admin scan side effect 최소화 — 처리 완료
178. [CODE] docs/current test summaries 갱신 — 처리 완료

### PORTAL. 고객 포털/결제/산출물 흐름 — 14개
179. [PORTAL] 무료 진단 결과 portalUrl 유지 — 처리 완료
180. [PORTAL] reportUrl 유지 — 처리 완료
181. [PORTAL] handoff source 유지 — 처리 완료
182. [PORTAL] savedToAccount 분기 유지 — 처리 완료
183. [PORTAL] paidAccess false 유지 — 처리 완료
184. [PORTAL] locked true 유지 — 처리 완료
185. [PORTAL] checkout link 유지 — 처리 완료
186. [PORTAL] recommendedPlan 유지 — 처리 완료
187. [PORTAL] payment disabled prelaunch 유지 — 처리 완료
188. [PORTAL] portone_v2 commercial gate 유지 — 처리 완료
189. [PORTAL] payment redirect allowlist 유지 — 처리 완료
190. [PORTAL] order fulfillment route 영향 없음 — 처리 완료
191. [PORTAL] document preview route 영향 없음 — 처리 완료
192. [PORTAL] portal-summary route 영향 없음 — 처리 완료

### SEO. SEO/콘텐츠/전환 카피 — 10개
193. [SEO] canonical alias 기존 통과 유지 — 처리 완료
194. [SEO] sitemap canonical only 유지 — 처리 완료
195. [SEO] robots private disallow 유지 — 처리 완료
196. [SEO] public JSON clean 유지 — 처리 완료
197. [SEO] demo monetary scare copy 회피 유지 — 처리 완료
198. [SEO] 무료 진단 가치 카피 유지 — 처리 완료
199. [SEO] 기본 리포트 CTA 유지 — 처리 완료
200. [SEO] 문의 코드로 고객지원 연결성 향상 — 처리 완료
201. [SEO] 오류 안내 카피 개선 — 처리 완료
202. [SEO] no old public copy 유지 — 처리 완료

### ADMIN. 관리자/운영 편의 — 14개
203. [ADMIN] admin env alias 지원 — 처리 완료
204. [ADMIN] bootstrap admin password alias 지원 — 처리 완료
205. [ADMIN] preflight fallback false 즉시 오류 — 처리 완료
206. [ADMIN] prod-env fallback false 즉시 오류 — 처리 완료
207. [ADMIN] Coolify generated env fallback true — 처리 완료
208. [ADMIN] commercial template fallback true — 처리 완료
209. [ADMIN] CI production-shape validation sample 보강 — 처리 완료
210. [ADMIN] health readinessAdvisory로 운영 진단 — 처리 완료
211. [ADMIN] requestId로 CS 추적 가능 — 처리 완료
212. [ADMIN] phase gate에 신규 장애 테스트 편입 — 처리 완료
213. [ADMIN] RUN_ALL_TESTS 경로 기존 유지 — 처리 완료
214. [ADMIN] ops public hidden 유지 — 처리 완료
215. [ADMIN] runtime clean 배포 전 자동화 유지 — 처리 완료
216. [ADMIN] rollback-friendly minimal patch 유지 — 처리 완료

## 직접 실행한 검증
- `npm run check:syntax`: 통과
- `npm test`: 통과
- `npm run test:e2e`: 통과
- `npm run check:pages`: 통과
- `npm run test:routes`: 통과
- `npm run check:links`: 통과
- `npm run smoke`: 통과
- `npm run test:diagnose-fallback`: 통과
- `npm run check:responsive-contract`: 통과
- `npm run check:performance-budget`: 통과
- `npm run verify:security`: 통과
- `npm run check:public-api-isolation`: 통과
- `npm run validate:deploy`: 통과
- `npm run check:release-secret-hygiene`: 통과
- `npm run validate:phase325`: 통과
- `npm run validate:phase326`: 통과
- `npm run validate:phase328`: 통과
- `npm run validate:phase329`: 통과
- `npm run validate:phase330`: 통과
- `npm run validate:phase337`: 통과
- `npm run validate:phase341`: 통과
- `npm run validate:phase342`: 통과
- `npm run validate:phase343`: 통과
- `npm run phase343:final`: 통과
- `node scripts/validate-prod-env.mjs deploy/env.production.nv0.kr.ci-check.env`: 통과

## 릴리즈 판정

- 로컬 패키지 기준: 릴리즈 가능
- 운영 서버 기준: 배포 후 `/healthz`, `/readyz`, `/api/public/diagnose` 재검증 필요
- 남은 외부 의존성: 실제 scan provider, PostgreSQL, Redis, S3/R2, PortOne, Turnstile 실키 값
