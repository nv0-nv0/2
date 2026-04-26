import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const checks=[['apps/public/home/index.html',['고객이 믿고 결제할 상태','콘텐츠 공백','게시판 자동 발행','요금제 보기']],['apps/public/solutions/index.html',['신뢰 진단','전환 흐름','문서 초안','자동 운영']],['apps/public/plans/index.html',['추천 대상','핵심 결과물','Auto','게시판 자동 발행']],['apps/public/board/index.html',['방치된 사이트','6가지 글 유형','회원 포털','Auto 플랜']],['apps/public/portal/index.html',['진단·주문·산출물·자동 발행','사이트별 진단 이력','게시판 자동 발행 상태']],['apps/public/documents/index.html',['개인정보처리방침','환불 정책','이용약관','운영 참고용 초안']],['apps/public/guides/index.html',['쇼핑몰 신뢰도','환불 정책 작성법','구매 CTA','게시판 자동 발행 활용법']],['apps/public/demo/index.html',['전환 공백','문서 초안','게시판 재유입']],['apps/public/veridion-demo/index.html',['신뢰 공백과 전환 공백','상세 리포트·수정안·자동 발행']]];
const failures=[];
for(const [rel,tokens] of checks){const p=path.join(root,rel); if(!fs.existsSync(p)){failures.push(rel+': missing'); continue;} const text=fs.readFileSync(p,'utf8'); for(const t of tokens) if(!text.includes(t)) failures.push(rel+': missing '+t); if(!text.includes('/products/veridion/demo')) failures.push(rel+': missing free diagnosis CTA');}
const server=fs.readFileSync(path.join(root,'server/index.mjs'),'utf8');
for(const t of ['게시판 자동 발행 상태','게시판이 비어 보이지 않도록 운영감 유지','variantCount: 12']) if(!server.includes(t)) failures.push('server missing '+t);
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(!pkg.scripts['validate:phase72']) failures.push('package missing validate:phase72');
if(!pkg.scripts['phase72:final']) failures.push('package missing phase72:final');
if(failures.length){console.error(JSON.stringify({ok:false,phase:'72',score:0,failures},null,2)); process.exit(1);}
const result={ok:true,phase:'72',score:100,checkedPages:checks.length,pipeline:['check:syntax','test:all','validate:phase72'],focus:['content-depth','global-cta','portal-value','auto-publish','commercial-pipeline']};
fs.writeFileSync(path.join(root,'docs/PHASE72_CONTENT_PIPELINE_VALIDATION_20260425.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
