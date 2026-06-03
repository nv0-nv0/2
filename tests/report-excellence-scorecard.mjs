import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const js = read('apps/public/demo/app.js');
const css = read('apps/public/demo/app.css');
const html = read('apps/public/demo/index.html');
const docs = read('docs/REPORT_SYSTEM.md');
const gate = read('scripts/run-release-gate.mjs');
const tests = [];
const hasAll = (text, tokens) => tokens.every(token => text.includes(token));
const noAny = (text, patterns) => patterns.every(pattern => !pattern.test(text));
const add = (area, weight, pass, evidence) => tests.push({ area, weight, score: pass ? weight : 0, pass, evidence });

add('문서 통제와 기관 보고서 형식', 10, hasAll(js, ['리포트 ID · REPORT ID','리포트 등급 · REPORT CLASS','공개 웹 신호 · PUBLIC WEB SIGNALS','발행일 · ISSUED','고객 전용 · CLIENT CONFIDENTIAL','무료 미리보기 · 통제 공개']), '보고서 ID·등급·범위·발행일·통제 공개 표기');
add('경영진 의사결정 요약', 10, hasAll(js, ['경영진 판단 · MANAGEMENT DECISION','01 · 경영진 판단 요약','중요한 이유','확인된 내용','다음 조치']), '경영진이 즉시 읽는 판단 요약 3단 구조');
add('신뢰 노출 지수와 산정 한계', 8, hasAll(js, ['신뢰 노출 지수 · TRUST EXPOSURE INDEX','공개 신호 상대 비교','법률 판단이나 실제 매출 손실 확정값이 아니라','공개 화면에서 우선 점검해야 할 신뢰 공백의 상대 강도']), '위험 지수·상대 비교·과장 방지 문구');
add('무료 25%와 유료 75% 경계', 10, hasAll(js + html, ['무료 경영진 요약 · 25% 공개','통제 공개 · 상세 분석 75% 잠금','25% OPEN · 75% LOCKED','상세 분석 75% 통제 공개']), '무료 가치 제공과 상세 산출물 잠금의 명확한 분리');
add('리스크 시각화 품질', 8, hasAll(js + css, ['02 · 신뢰 위험 지도','.vrd-heatmap','.vrd-heat-track','잠금된 위험 영역','문제 신호','관련 요소 범위']), '영역별 상대 강도·관련 범위·잠금 영역');
add('구매 여정 마찰 분석', 8, hasAll(js, ['03 · 구매 여정 마찰 지도','첫 방문','상품 검토','결제 직전','결정 또는 이탈','실제 이탈률 측정값이 아니라']), '고객 여정과 결제 직전 마찰 지점');
add('통제 스냅샷', 6, hasAll(js, ['CONTROL SNAPSHOT','신뢰 정보 발견성','구매 전 고지 일관성','문의·복구 경로','개인정보 안내 연결성']), '신뢰 통제 상태 4영역');
add('우선 조치 원장', 8, hasAll(js, ['04 · PRIORITY REGISTER','근거 확인됨 · 수정 위치 잠금','실행 명세 잠금','추가 조치 후보']), '무료 공개 조치 일부와 잠금 실행 명세');
add('유료 산출물의 구매 가치', 12, hasAll(js, ['Evidence Ledger','Fix Specification','14-Day Roadmap','Recheck Protocol','Executive Appendix','Expert Review Notes','근거 URL','정확한 수정 위치','수정 전후 문구']), '유료 리포트가 제공하는 실행 가능 산출물');
add('유료 상세 리포트 렌더링', 6, hasAll(js, ['renderPaidExecutiveReport','vrd-paid-row','vrd-roadmap-row','100% OPEN']), '결제 후 근거 원장과 로드맵 렌더링');
add('윤리적 전환 설계', 6, noAny(js, [/매출 손실은 확정/,/반드시 매출/,/무조건 구매/,/법률 위반 확정/,/매출이 떨어집니다/]) && hasAll(js, ['결과를 검토한 뒤 필요한 플랜만 선택하세요.','법률 판단이나 실제 매출 손실 확정값이 아니라']), '위기감은 강조하되 허위 확정과 과도한 공포 마케팅 차단');
add('CSP·접근성·모바일 안전성', 5, !/\bstyle\s*=/.test(js) && hasAll(css, ['@media(max-width:760px)','.vrd-document-control{grid-template-columns:repeat(2','.vrd-sticky{display:grid}']) && hasAll(js, ['aria-label="리포트 통제 정보"','aria-label="경영진 판단 요약"']), '인라인 스타일 금지·모바일 재배열·ARIA');
add('샘플 화면과 실제 렌더러 일치', 2, hasAll(html, ['리포트 ID · REPORT ID','FREE PREVIEW · 통제 공개 · CONTROLLED DISCLOSURE','경영진 판단 요약','신뢰 위험 지도','근거 원장 잠금','수정 명세서 잠금']), '실행 전 샘플도 전문 보고서 체계 반영');
add('문서화와 릴리즈 게이트', 1, docs.includes('## 100점 전역 배점표') && gate.includes("['test:report-excellence', 'npm', ['run','test:report-excellence']]") , '보고서 설계 문서와 100점 자동 차단 게이트');

const score = tests.reduce((sum, test) => sum + test.score, 0);
const report = { ok: score === 100 && tests.every(test => test.pass), contract: 'veridion-2.7-report-excellence-scorecard', standard: 'top-0.5-percent-professional-report-target', checkedAt: new Date().toISOString(), score, maximum: 100, required: 100, failed: tests.filter(test => !test.pass), tests };
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/REPORT_EXCELLENCE_SCORECARD.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exit(1);
