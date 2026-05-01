import { readFileSync, existsSync } from 'node:fs';
import { buildCtaBoardArticle, chooseCtaVariant, ctaTopicPacks } from '../server/core/cta-publication.mjs';

const checks = [];
function check(key, ok, detail = '') { checks.push({ key, ok: !!ok, detail }); }
function file(path) { return readFileSync(path, 'utf8'); }

const server = file('server/index.mjs');
const cta = file('server/core/cta-publication.mjs');
const boardHtml = file('apps/public/board/index.html');
const boardJs = file('apps/public/board/app.js');
const report = file('PHASE147_SITE_QA_SMART_SEO_WORK_ORDER_20260501_KO.md');

check('server_imports_cta_topic_packs', server.includes('ctaTopicPacks'));
check('route_meta_keywords', server.includes('keywords:') && server.includes('og:locale') && server.includes('twitter:title'));
check('structured_data_graph', server.includes("'@graph'") && server.includes('BreadcrumbList') && server.includes('WebPage'));
check('top_nav_cta_deduped', server.includes('class="cta">무료 시작</a>'));
check('board_api_variant_count_dynamic', server.includes('variantCount: ctaTopicPacks().length'));
check('diagnosis_engine_variants_dynamic', server.includes('variants: ctaTopicPacks().map(item => item.headline)'));
const sitemapBlock = server.slice(server.indexOf('function buildSitemapXml'), server.indexOf('function createPasswordResetToken'));
check('sitemap_excludes_auth', !sitemapBlock.includes("path: '/auth'") && sitemapBlock.includes("path: '/products/veridion/demo'"));
check('board_copy_24_types', boardHtml.includes('24가지 SEO 글 유형'));
check('board_empty_state_fixed', boardHtml.includes('게시글을 불러오는 중입니다'));
check('board_js_seo_meta_render', boardJs.includes('searchIntent') && boardJs.includes('funnelStage') && boardJs.includes('primaryKeyword'));
check('board_js_internal_link_heading', boardJs.includes('내부링크'));
check('cta_internal_links', cta.includes('internalLinks') && cta.includes('무료 진단') && cta.includes('정책 문서 초안'));
check('cta_three_faq', cta.includes('slice(0, 3)'));
check('cta_reading_time', cta.includes('readingTimeMinutes') && cta.includes('예상 읽기 시간'));
check('work_order_30_items', (report.match(/\|\s*\d{2}\s*\|/g) || []).length === 30);
check('readme_exists', existsSync('README_PATCH_P147_KO.txt'));

const topics = ctaTopicPacks();
check('topic_pack_count_24', topics.length === 24, `topics=${topics.length}`);
const fingerprints = new Set();
const titles = new Set();
for (let i = 0; i < 30; i += 1) {
  const variant = chooseCtaVariant({ publications: [], boards: [] }, { seed: `phase147-${i}`, sequenceOffset: i });
  const article = buildCtaBoardArticle({ requestId: `scan-${i}`, target: `https://example${i}.kr`, industry: i % 2 ? '쇼핑몰' : '랜딩페이지', riskScore: 60 + (i % 30), detailFindings: [{ title: '환불 정책' }, { title: '개인정보 안내' }] }, variant, { sequenceOffset: i });
  fingerprints.add(article.contentFingerprint);
  titles.add(article.title);
  if (!article.body.includes('내부링크')) check(`sample_${i}_internal_links`, false);
  if ((article.body.match(/Q\d\./g) || []).length < 3) check(`sample_${i}_faq_count`, false);
  if (!article.seo?.contentGoal) check(`sample_${i}_content_goal`, false);
}
check('sample_title_diversity', titles.size >= 18, `titles=${titles.size}`);
check('sample_fingerprint_diversity', fingerprints.size >= 24, `fingerprints=${fingerprints.size}`);

const ok = checks.every(item => item.ok);
console.log(JSON.stringify({ ok, phase: 'P147', checks }, null, 2));
if (!ok) process.exit(1);
