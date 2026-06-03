import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const demo = read('apps/public/demo/index.html');
const active = read('apps/public/veridion-demo/index.html');
const css = read('apps/public/demo/app.css');
const js = read('apps/public/demo/app.js');
const gate = read('scripts/run-release-gate.mjs');
const docs = read('docs/REPORT_SYSTEM.md');
const checks = [];
const add = (area, weight, fn, evidence) => { try { fn(); checks.push({ area, weight, score: weight, pass: true, evidence }); } catch (error) { checks.push({ area, weight, score: 0, pass: false, evidence, error: error.message }); } };
const all = (text, tokens) => tokens.forEach(token => assert.ok(text.includes(token), `missing ${token}`));

add('활성 라우트와 단일 소스 동기화', 10, () => assert.equal(active, demo), '실제 /products/veridion/demo와 canonical demo 마크업 완전 일치');
add('입력 행동의 절대적 시각 우선순위', 14, () => all(demo, ['v24-scan-command','v24-url-input-shell','진단 대상 URL','id="targetUrl"','id="scanBtn"','무료 진단 시작']), '큰 URL 입력 셸·명확한 라벨·단일 1차 CTA');
add('3초 이해 가능한 히어로', 8, () => all(demo, ['구매 전 신뢰 공백','이메일 입력 없이 시작','공개 웹페이지 기준','약 1분 내 무료 요약']), '한 문장 가치 제안과 신뢰 보조 정보');
add('무료 25%와 유료 75% 경계', 8, () => all(demo, ['통제 공개 · CONTROLLED DISCLOSURE','25%','75% 상세 잠금','무료 경영진 요약','25% OPEN · 75% LOCKED']), '입력 전부터 통제 공개 구조를 이해');
add('보조 정보의 저소음 배치', 7, () => all(demo, ['v24-optional-tools','빠른 입력 예시와 최근 진단 보기','v24-system-status','v24-safety-note']), '최근 기록·보안·상태 안내를 핵심 입력 아래로 하향');
add('보고서형 미리보기', 10, () => all(demo, ['리포트 ID · REPORT ID','리포트 등급 · REPORT CLASS','공개 범위 · OPEN RANGE','경영진 판단 요약','신뢰 위험 지도','우선 조치 원장','근거 원장','수정 명세서']), '실행 전에도 기관형 리포트 구조 확인');
add('유료 가치의 실행 가능성', 8, () => all(demo + js, ['근거 URL','정확한 수정 위치','수정 전후 문구','14일','재점검']), '상세 리포트가 단순 설명이 아닌 작업 명세임을 명확화');
add('기관형 시각 시스템', 8, () => all(css, ['.v24-diagnosis-hero','.v24-disclosure-card','.v24-scan-command','.v24-url-input-shell','.v24-report-preview-wrap','.v24-preview-panels','.vrd-report-shell']), '짙은 녹색·백서형 표면·정렬된 정보 계층');
add('접근성과 포커스', 7, () => all(demo + css, ['for="targetUrl"','aria-label="진단할 사이트 주소"','role="status"','aria-live="polite"','focus-within']), '라벨·라이브 상태·키보드 포커스');
add('모바일 단일 열 재배열', 6, () => { assert.match(css, /@media\(max-width:640px\)[\s\S]*\.v24-scan-form\{grid-template-columns:1fr!important[\s\S]*\.v24-preview-panels,.v24-value-grid\{grid-template-columns:1fr/); }, '모바일 입력·CTA·리포트 미리보기 단일 열');
add('CSP 안전성과 외부 자산 비의존', 5, () => { assert.doesNotMatch(demo + js, /\bstyle\s*=/i); assert.doesNotMatch(demo, /<(?:script|img|source|video|audio)[^>]+src=[\"']https?:\/\//i); assert.doesNotMatch(demo, /<link[^>]+rel=[\"']stylesheet[\"'][^>]+href=[\"']https?:\/\//i); }, '인라인 스타일·원격 실행 자산·원격 이미지·원격 폰트 없음');
add('행동 상태 보존', 5, () => all(demo, ['freeUsageLead','freeUsageBadge','targetPreview','turnstileState','demoState','resultActionHint','retryBtn','unlockBtn','cancelScanBtn','recentTargetList']), '기존 진단 흐름과 결과 후속 행동 ID 유지');
add('결과 리포트와 입력 퍼널 연결', 2, () => all(demo + js, ['1단계 · 진단 대상 URL 입력','2단계 · 무료 경영진 요약','3단계 · 실행 명세 열기','renderVr360Result']), '입력→무료 보고서→상세 구매의 퍼널 일관성');
add('릴리즈 자동 차단', 2, () => { assert.ok(gate.includes("['test:report-excellence', 'npm', ['run','test:report-excellence']]")); assert.ok(docs.includes('진단 시작 화면 디자인 전역 배점')); }, '100점 미만 릴리즈 게이트 차단');

const score = checks.reduce((sum, item) => sum + item.score, 0);
const failures = checks.filter(item => !item.pass);
const report = { ok: score === 100 && failures.length === 0, contract: 'veridion-2.7-diagnosis-experience-design-scorecard', checkedAt: new Date().toISOString(), score, maximum: 100, required: 100, failures, checks };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/DIAGNOSIS_EXPERIENCE_DESIGN_SCORECARD.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
