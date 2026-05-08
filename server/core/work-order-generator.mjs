const ALLOWED_SECTIONS = [
  '작업명',
  '목표',
  '성공 기준',
  '작업 범위',
  '제외/금지 기준',
  '실행 작업',
  '산출물 형식',
  '품질 기준',
  '테스트 및 검수',
  '롤백/보완 기준',
  '확인 필요'
];

const DEFAULT_TESTS = [
  ['T-001', '단일 출력', '결과가 항상 `# 최종 작업지시서`로 시작한다.'],
  ['T-002', '실행 작업 완결성', '모든 작업 행에 담당, 완료 기준, 검수 방법이 존재한다.'],
  ['T-003', '금지 조건 우선', '금지·제외 조건이 실행 작업으로 승격되지 않는다.'],
  ['T-004', '불필요 정보 차단', '작업자가 실행할 내용과 검수 기준만 남는다.'],
  ['T-005', '회귀 검증', '콘텐츠, 개발, QA, 디자인 입력도 같은 구조로 출력된다.']
];

const INTERNAL_LEAK_TOKENS = [
  '내부 분석 과정', '스킬 목록', '원문 전문', '웹탐색 과정', '검증 로그',
  '후보 TOP3', '수동 보정', '출력계약:', 'escapedPreview', '<script', '</script>'
];

function cleanText(value, max = 24000) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\r/g, '')
    .replace(/[\t\u00a0]+/g, ' ')
    .slice(0, max)
    .trim();
}

function plainLine(value, fallback = '') {
  const text = cleanText(value, 800)
    .replace(/^[-*#\s]+/, '')
    .replace(/[|`<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || fallback;
}

function escapeCell(value) {
  return plainLine(value).replace(/\|/g, '/');
}

function uniqueLines(lines, limit = 6) {
  const seen = new Set();
  const out = [];
  for (const raw of lines) {
    const line = plainLine(raw);
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= limit) break;
  }
  return out;
}

function bulletLines(text) {
  return cleanText(text).split('\n')
    .map(line => line.trim())
    .filter(line => /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line))
    .map(line => line.replace(/^[-*]\s+|^\d+[.)]\s+/, '').trim());
}

function extractSection(source, title) {
  const text = cleanText(source);
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|\\n)#{1,6}\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s+|$)`, 'i');
  const match = text.match(re);
  if (match) return match[1].trim();

  const numbered = new RegExp(`(?:^|\\n)\\s*(?:\\d+\\.\\s*)?${escaped}\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:\\d+\\.\\s*)?(?:${ALLOWED_SECTIONS.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\s*\\n|$)`, 'i');
  const nMatch = text.match(numbered);
  return nMatch ? nMatch[1].trim() : '';
}

function firstMeaningfulLine(text, fallback) {
  const line = cleanText(text).split('\n').map(x => x.trim()).find(x => x && !/^[-|:#]/.test(x));
  return plainLine(line, fallback);
}

function inferTaskName(input) {
  const explicit = extractSection(input, '작업명');
  if (explicit) return firstMeaningfulLine(explicit, '작업지시서 생성 제품 개선');
  if (/작업지시서.*전면|전면.*작업지시서/.test(input)) return '작업지시서 생성 제품 전면 개편';
  if (/nv0\.kr|패키지|제품.*검증|100점/.test(input)) return 'NV0 제품 검증 및 작업지시서 생성 엔진 개선';
  return '사용자 요청 기반 작업지시서 생성';
}

function inferGoal(input) {
  const explicit = extractSection(input, '목표');
  if (explicit) return firstMeaningfulLine(explicit, '사용자 입력을 실행 가능한 작업지시서로 변환한다.');
  if (/작업지시서/.test(input)) return '사용자 입력을 실무자가 바로 실행할 수 있는 단일 작업지시서로 변환한다.';
  return '요청 내용을 실행 작업, 완료 기준, 검수 방법, 보완 기준이 있는 지시서로 정리한다.';
}

function inferSuccessCriteria(input) {
  const explicit = extractSection(input, '성공 기준');
  const lines = uniqueLines(bulletLines(explicit), 5);
  if (lines.length) return lines;
  return [
    '최종 산출물은 작업지시서 1개만 생성한다.',
    '실행 작업, 완료 기준, 검수 방법, 롤백/보완 기준을 포함한다.',
    '확인되지 않은 사실은 단정하지 않고 확인 필요로 분리한다.'
  ];
}

function inferScope(input) {
  const explicit = extractSection(input, '작업 범위');
  const lines = uniqueLines(bulletLines(explicit), 6);
  if (lines.length) return lines;
  const scope = [];
  if (/패키지|nv0\.kr|탐색|검증/.test(input)) scope.push('패키지와 공개 사이트 기준으로 출력 구조, 문구, 노출값, 회귀 위험을 점검한다.');
  if (/입력|의도|요구|금지|제외/.test(input)) scope.push('입력문에서 목표, 요구사항, 금지 조건, 제외 범위, 확인 필요 항목을 분리한다.');
  if (/작업지시서|산출물|출력/.test(input)) scope.push('최종 출력은 단일 작업지시서 구조로 고정한다.');
  if (/테스트|검수|롤백|보완/.test(input)) scope.push('완료 기준, 테스트 기준, 롤백/보완 기준을 누락 없이 포함한다.');
  return scope.length ? uniqueLines(scope, 6) : [
    '입력 내용을 작업 단위로 정리한다.',
    '작업별 완료 기준과 검수 방법을 작성한다.',
    '보완 또는 롤백이 필요한 조건을 명시한다.'
  ];
}

function inferExclusions(input) {
  const explicit = extractSection(input, '제외/금지 기준') || extractSection(input, '제외') || extractSection(input, '금지 기준');
  const lines = uniqueLines(bulletLines(explicit), 5);
  if (lines.length) return lines;
  return [
    '사용자가 요청하지 않은 기능은 추가하지 않는다.',
    '확인되지 않은 사실이나 최신 정보는 확정 표현으로 작성하지 않는다.',
    '실행과 검수에 필요 없는 설명성 내용은 출력하지 않는다.'
  ];
}

function parseMarkdownTaskRows(input) {
  const rows = [];
  for (const raw of cleanText(input).split('\n')) {
    const line = raw.trim();
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line) || /작업 내용\s*\|\s*완료 기준/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length < 6) continue;
    if (!/^WI-\d+/i.test(cells[0])) continue;
    rows.push({
      id: cells[0].toUpperCase(),
      priority: cells[1] || 'P1',
      owner: cells[2] || '담당 영역',
      task: cells[3],
      done: cells[4],
      verify: cells[5]
    });
  }
  return rows.slice(0, 8);
}

function defaultTasks(input) {
  const productFocus = /패키지|nv0\.kr|제품|엔진|스킬|100점|전면/.test(input);
  if (productFocus) {
    return [
      ['WI-001', 'P0', '제품/프롬프트 엔진', '입력문을 정제해 목표, 필수 요구, 금지 조건, 제외 범위, 확인 필요 항목으로 분리한다.', '동일 입력에서 요구사항과 금지사항이 별도 필드로 분리된다.', '금지 조건이 포함된 샘플 5개를 넣고 실행 작업으로 승격되지 않는지 확인한다.'],
      ['WI-002', 'P0', '출력 엔진', '최종 결과를 `# 최종 작업지시서` 1개로만 렌더링한다.', '원고, 이메일, 설명문, 이미지 프롬프트 형식으로 분기되지 않는다.', '콘텐츠·개발·QA·디자인 입력을 넣어도 같은 작업지시서 구조로 출력되는지 확인한다.'],
      ['WI-003', 'P0', '보안/렌더링', '사용자 입력은 텍스트로만 처리하고 HTML·스크립트·불필요한 내부 정보 노출을 차단한다.', '출력에는 실행 내용, 완료 기준, 검수 기준만 남는다.', 'HTML 삽입 샘플을 넣고 태그가 실행되거나 그대로 노출되지 않는지 확인한다.'],
      ['WI-004', 'P0', '품질 게이트', '모든 실행 작업에 담당, 작업 내용, 완료 기준, 검수 방법을 강제한다.', '빈 완료 기준이나 모호한 검수 방법이 있는 행은 최종 출력되지 않는다.', '누락 필드가 있는 입력을 넣고 자동 보완 또는 재작성되는지 확인한다.'],
      ['WI-005', 'P1', '제품 UI', '입력 → 생성 → 복사/저장 흐름으로 화면을 단순화한다.', '사용자는 한 화면에서 입력, 결과 확인, 복사, 저장을 완료할 수 있다.', '모바일 폭에서 버튼, 입력창, 결과 영역이 겹치지 않는지 확인한다.'],
      ['WI-006', 'P1', '라이브 운영', '공개 화면의 placeholder, 미확정 값, 오래된 문구를 숨기거나 확인 필요로 분리한다.', '확정되지 않은 번호·운영값이 푸터와 안내문에 노출되지 않는다.', '루트, 무료진단, 문서, 보드, 고객지원 페이지를 열어 미확정 값 노출 여부를 확인한다.'],
      ['WI-007', 'P1', '회귀 테스트', '단일 출력, 금지 조건 우선, 보안 렌더링, 모바일 UI 검사를 자동 테스트에 추가한다.', '패키지 검증 스크립트에서 신규 테스트가 통과한다.', '관련 npm 스크립트와 직접 테스트를 실행해 실패 항목이 없는지 확인한다.']
    ].map(([id, priority, owner, task, done, verify]) => ({ id, priority, owner, task, done, verify }));
  }
  return [
    ['WI-001', 'P0', '담당자', '입력 내용을 핵심 목표와 실행 범위로 정리한다.', '작업자가 바로 착수할 수 있는 목표와 범위가 작성된다.', '목표와 범위를 읽고 추가 설명 없이 실행 가능한지 확인한다.'],
    ['WI-002', 'P0', '담당자', '필수 요구사항과 금지 조건을 분리한다.', '요구사항과 금지 조건이 서로 섞이지 않는다.', '금지 조건이 실행 작업에 포함되지 않았는지 확인한다.'],
    ['WI-003', 'P0', '담당자', '실행 작업을 담당, 작업 내용, 완료 기준, 검수 방법이 있는 표로 작성한다.', '모든 행에 필수 필드가 채워진다.', '빈 셀이나 모호한 표현이 있는지 확인한다.'],
    ['WI-004', 'P1', 'QA', '완료 기준, 테스트 기준, 롤백/보완 기준을 점검한다.', '완료·검수·보완 조건이 모두 확인 가능하다.', '샘플 결과를 기준으로 누락 섹션이 없는지 확인한다.']
  ].map(([id, priority, owner, task, done, verify]) => ({ id, priority, owner, task, done, verify }));
}

function taskRows(input) {
  const parsed = parseMarkdownTaskRows(input);
  const rows = parsed.length ? parsed : defaultTasks(input);
  return rows.map((row, index) => ({
    id: /^WI-\d+$/i.test(row.id || '') ? row.id.toUpperCase() : `WI-${String(index + 1).padStart(3, '0')}`,
    priority: /^P[0-3]$/.test(row.priority || '') ? row.priority : (index < 3 ? 'P0' : 'P1'),
    owner: escapeCell(row.owner || '담당 영역'),
    task: escapeCell(row.task || '작업 내용을 구체화한다.'),
    done: escapeCell(row.done || '완료 여부를 확인할 수 있다.'),
    verify: escapeCell(row.verify || '결과물을 검수한다.')
  })).filter(row => row.task && row.done && row.verify).slice(0, 8);
}

function renderBulletList(lines) {
  return uniqueLines(lines, 6).map(line => `- ${line}`).join('\n');
}

function renderTaskTable(rows) {
  return [
    '| ID | 우선순위 | 담당 | 작업 내용 | 완료 기준 | 검수 방법 |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map(row => `| ${row.id} | ${row.priority} | ${row.owner} | ${row.task} | ${row.done} | ${row.verify} |`)
  ].join('\n');
}

function renderTestTable(input) {
  const tests = DEFAULT_TESTS;
  return [
    '| ID | 검수 항목 | 통과 기준 |',
    '| --- | --- | --- |',
    ...tests.map(row => `| ${row[0]} | ${row[1]} | ${row[2]} |`)
  ].join('\n');
}

function inferOutputFormat() {
  return [
    '`# 최종 작업지시서`로 시작한다.',
    '허용 섹션만 사용한다.',
    '실행 작업은 표로 작성한다.',
    '확인되지 않은 항목은 확인 필요에 분리한다.'
  ];
}

function inferQualityCriteria() {
  return [
    '실행 가능하지 않은 문장은 제거한다.',
    '중복 작업과 설명성 섹션은 합친다.',
    '완료 여부는 눈으로 확인하거나 테스트할 수 있어야 한다.',
    '확정할 수 없는 정보는 단정하지 않는다.'
  ];
}

function inferRollback(input) {
  const explicit = extractSection(input, '롤백/보완 기준');
  const lines = uniqueLines(bulletLines(explicit), 5);
  if (lines.length) return lines;
  return [
    '결과가 작업지시서 형식이 아니면 직전 정상 버전으로 되돌린다.',
    '완료 기준 또는 검수 방법이 빠진 행은 출력하지 않고 재작성한다.',
    '금지 조건이 작업 범위로 들어가면 요구사항 추출 단계를 되돌리고 금지 우선 규칙을 재적용한다.',
    '공개 화면에 미확정 값이 노출되면 해당 렌더링을 비활성화하고 확인 필요로 이동한다.'
  ];
}

function inferConfirmNeeded(input) {
  const explicit = extractSection(input, '확인 필요');
  const lines = uniqueLines(bulletLines(explicit), 5);
  if (lines.length) return lines;
  const out = [];
  if (/기존|저장|데이터/.test(input)) out.push('기존 사용자 데이터와 저장된 결과물을 유지해야 하는지 확인한다.');
  if (/통신판매업|신고번호|사업자/.test(input)) out.push('운영환경에 확정된 통신판매업 신고번호를 표시할지 확인한다.');
  if (/배포|캐시|nv0\.kr|라이브/.test(input)) out.push('배포 후 CDN·브라우저 캐시가 갱신되었는지 확인한다.');
  if (!out.length) out.push('외부 사실, 최신 기준, 운영 정책이 필요한 항목은 별도 확인한다.');
  return out;
}

export function buildFinalWorkOrder(sourceInput = '', options = {}) {
  const input = cleanText(sourceInput);
  const rows = taskRows(input);
  const content = [
    '# 최종 작업지시서',
    '',
    '## 1. 작업명',
    inferTaskName(input),
    '',
    '## 2. 목표',
    inferGoal(input),
    '',
    '## 3. 성공 기준',
    renderBulletList(inferSuccessCriteria(input)),
    '',
    '## 4. 작업 범위',
    renderBulletList(inferScope(input)),
    '',
    '## 5. 제외/금지 기준',
    renderBulletList(inferExclusions(input)),
    '',
    '## 6. 실행 작업',
    renderTaskTable(rows),
    '',
    '## 7. 산출물 형식',
    renderBulletList(inferOutputFormat()),
    '',
    '## 8. 품질 기준',
    renderBulletList(inferQualityCriteria()),
    '',
    '## 9. 테스트 및 검수',
    renderTestTable(input),
    '',
    '## 10. 롤백/보완 기준',
    renderBulletList(inferRollback(input)),
    '',
    '## 11. 확인 필요',
    renderBulletList(inferConfirmNeeded(input))
  ].join('\n');
  assertWorkOrderContract(content);
  return content;
}

export function buildWorkOrderPreview(payload = {}, options = {}) {
  const source = payload.sourceInput || payload.input || payload.prompt || payload.request || payload.workOrderInput || '';
  const content = buildFinalWorkOrder(source, options);
  return {
    businessName: '작업지시서 생성기',
    domain: 'work-order',
    generatedAt: typeof options.nowIso === 'function' ? options.nowIso() : new Date().toISOString(),
    documents: [
      { type: 'work_order', title: '최종 작업지시서', content }
    ],
    qualityGate: {
      singleOutput: content.startsWith('# 최종 작업지시서'),
      taskCount: (content.match(/\| WI-\d{3} \|/g) || []).length,
      allowedSectionCount: ALLOWED_SECTIONS.length
    }
  };
}

export function assertWorkOrderContract(output) {
  const text = String(output ?? '');
  if (!text.startsWith('# 최종 작업지시서')) throw new Error('work order must start with # 최종 작업지시서');
  for (const section of ALLOWED_SECTIONS) {
    if (!text.includes(`## ${ALLOWED_SECTIONS.indexOf(section) + 1}. ${section}`)) throw new Error(`missing section: ${section}`);
  }
  if (!/\| ID \| 우선순위 \| 담당 \| 작업 내용 \| 완료 기준 \| 검수 방법 \|/.test(text)) throw new Error('missing execution table');
  const rows = text.split('\n').filter(line => /^\| WI-\d{3} \|/.test(line));
  if (!rows.length) throw new Error('missing work items');
  for (const row of rows) {
    const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length !== 6 || cells.some(cell => !cell)) throw new Error(`incomplete work item: ${row}`);
  }
  const leak = INTERNAL_LEAK_TOKENS.find(token => text.includes(token));
  if (leak) throw new Error(`forbidden output token: ${leak}`);
  return true;
}
