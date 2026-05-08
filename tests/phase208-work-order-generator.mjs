import assert from 'node:assert/strict';
import { buildFinalWorkOrder, buildWorkOrderPreview, assertWorkOrderContract } from '../server/core/work-order-generator.mjs';

const source = `# 최종 작업지시서

## 1. 작업명
작업지시서 생성 제품 전면 개편

## 2. 목표
사용자 입력을 실무자가 바로 실행할 수 있는 작업지시서로 변환한다.

## 5. 제외/금지 기준
- 사용자가 요청하지 않은 기능과 확인되지 않은 사실을 임의로 추가하지 않는다.

## 6. 실행 작업
| ID | 우선순위 | 담당 | 작업 내용 | 완료 기준 | 검수 방법 |
| --- | --- | --- | --- | --- | --- |
| WI-001 | P0 | 제품/프롬프트 엔진 | 사용자 입력을 정제해 핵심 목표, 필수 요구, 금지 조건, 제외 범위, 확인 필요로 분리한다. | 동일 입력에서 요구사항과 금지사항이 섞이지 않고 각각 별도 필드로 나온다. | 금지 표현이 포함된 샘플 입력 5개를 넣고 금지 조건이 실행 작업으로 변환되지 않는지 확인한다. |
| WI-002 | P0 | 출력 엔진 | 최종 산출물을 작업지시서 형식 하나로 고정한다. | 결과 첫 줄은 항상 최종 작업지시서이다. | 콘텐츠·개발·QA·디자인 입력을 각각 넣어도 모두 작업지시서 구조로 출력되는지 확인한다. |`;

const output = buildFinalWorkOrder(source);
assertWorkOrderContract(output);
assert(output.startsWith('# 최종 작업지시서'), 'must start with final work order title');
assert(!output.includes('[최종 원고]'), 'must not route to article output');
assert(!output.includes('원문 전문'), 'must not expose raw input label');
assert(!output.includes('스킬 목록'), 'must not expose skill list wording');
assert(!output.includes('<script'), 'must strip script');
assert(output.includes('| WI-001 | P0 | 제품/프롬프트 엔진 |'), 'must preserve actionable work item');
assert(output.includes('## 10. 롤백/보완 기준'), 'must include rollback section');

const malicious = buildFinalWorkOrder('<script>alert(1)</script> 작업지시서 전면 개편 100점 패키지 nv0.kr 검증');
assertWorkOrderContract(malicious);
assert(!malicious.includes('alert(1)'), 'must remove script payload');
assert((malicious.match(/\| WI-\d{3} \|/g) || []).length >= 5, 'product task set must be rich enough');

const preview = buildWorkOrderPreview({ documentKind: 'work_order', sourceInput: source }, { nowIso: () => '2026-05-06T00:00:00.000Z' });
assert.equal(preview.documents.length, 1, 'preview must contain one document');
assert.equal(preview.documents[0].type, 'work_order', 'document type');
assert(preview.qualityGate.singleOutput, 'single output gate');

console.log(JSON.stringify({ ok: true, suite: 'PHASE208_WORK_ORDER_GENERATOR', cases: 3, checkedAt: new Date().toISOString() }, null, 2));
