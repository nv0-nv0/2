import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const add = (name, ok, extra = {}) => checks.push({ name, ok: !!ok, ...extra });
const pkg = JSON.parse(read('package.json'));
const demoJs = read('apps/public/veridion-demo/app.js');
const css = read('shared/nv0-clean-slate-20260512.css');
const server = read('server/index.mjs');
const reportDoc = fs.existsSync(path.join(root, 'docs/current/PHASE260_DISPUTE_SAFE_PENALTY_REPORT_20260515_KO.md'))
  ? read('docs/current/PHASE260_DISPUTE_SAFE_PENALTY_REPORT_20260515_KO.md')
  : '';
const joined = [demoJs, css, server, reportDoc].join('\n');

add('package version phase260', /phase260-dispute-safe-penalty|phase265-dashboard-portal-completion|phase26[8-9]-|phase270-full-package-verified-hardened|phase271-site-ux-insight-polish|phase272-premium-redesign|phase273-package-100|phase274-customer-copy-readability|phase278-customer-perfect/.test(pkg.version));
['test:phase260','validate:phase260','phase260:final'].forEach(script => add(`package script:${script}`, !!pkg.scripts?.[script]));
add('final review points to phase260', /phase26[05]:final|phase27[01234]:final/.test(pkg.scripts?.['final:review'] || ''));
add('penalty label is explicitly reference-only', demoJs.includes('과태료 상한 후보') && demoJs.includes('참고용'));
add('penalty strip denies certainty', demoJs.includes('확정 안내 아님 · 검토 필요'));
add('warning title uses review-needed copy', demoJs.includes('과태료·행정조치 가능성 검토 필요'));
add('warning paragraph explains official decision variance', demoJs.includes('실제 부과 여부와 금액은 관할기관 판단'));
add('bullet avoids direct imposed fine claim', demoJs.includes('범위 검토 가능성') && !demoJs.includes('과태료 부과`'));
add('administrative bullets are possibility/review phrasing', demoJs.includes('시정명령·재점검 요구 가능성') && demoJs.includes('행정처분 검토 가능성'));
add('customer impact phrasing is possibility-based', demoJs.includes('고객 신뢰도 및 매출 영향 가능성'));
add('legal advice not disclaimer visible in CSS badge', css.includes('법률 자문 아님 · 참고용 자동진단'));
add('server carries reference estimate type', server.includes("penaltyEstimateType: 'reference_upper_bound_candidate'"));
add('server denies legal conclusion on scan payload', server.includes('legalConclusion: false'));
add('server disclaimer mentions authority and expert review', server.includes('관할기관 판단과 전문가 검토'));
add('table changed from legal category to review category', demoJs.includes('<th>검토 구분</th>') && !demoJs.includes('<th>법령 구분</th>'));
add('summary changed from legal category to review category', demoJs.includes('⚖</i> 검토 구분') && !demoJs.includes('⚖</i> 법령 구분'));
add('paid detail copy avoids 100 percent guarantee', !demoJs.includes('재점검 기준을 100% 공개합니다'));
add('old urgent certainty sentence removed', !demoJs.includes('지금 바로 조치하지 않으면 과태료 부과'));
add('old maximum fine label removed from UI', !demoJs.includes('<span>예상 최대 과태료</span>'));
add('old warning strip removed from UI', !demoJs.includes('방치 시 과태료·행정조치 위험</small>'));
add('old max-fine bullet removed from UI', !/최대 \$\{formatPenaltyCompact\(amount\)\} 과태료 부과/.test(demoJs));
add('no legal certainty or guaranteed outcome copy', !/과태료 확정|위반 확정|반드시 부과|무조건 부과|부과 확정|100% 공개|100% 보장|위반 판정/.test(joined));
add('phase260 report exists and describes dispute-safe change', reportDoc.includes('오해·분쟁 소지 완화'));

const report = {
  generatedAt: new Date().toISOString(),
  phase: 'phase260-dispute-safe-penalty',
  ok: checks.every(c => c.ok),
  total: checks.length,
  passed: checks.filter(c => c.ok).length,
  failed: checks.filter(c => !c.ok).length,
  checks
};
fs.mkdirSync(path.join(root, 'docs/current'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/current/PHASE260_DISPUTE_SAFE_PENALTY_AUDIT_20260515.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, report: 'docs/current/PHASE260_DISPUTE_SAFE_PENALTY_AUDIT_20260515.json' }, null, 2));
if (!report.ok) {
  console.error(JSON.stringify(checks.filter(c => !c.ok), null, 2));
  process.exit(1);
}
