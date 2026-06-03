export function customerRecentScans(db, customer, limit = 5) {
  if (!customer) return [];
  const ids = new Set((db.customerSiteLinks || []).filter(x => x.customerId === customer.id).map(x => x.siteId));
  return (db.scans || []).filter(x => x.customerId === customer.id || ids.has(x.siteId)).slice(0, limit).map(x => ({ requestId: x.requestId || x.id || "", siteId: x.siteId || "", target: x.target || x.normalizedTarget || "", riskScore: x.riskScore ?? x.score?.value ?? null, riskLevel: x.riskLevel || x.score?.level || "", totalFindings: x.totalFindings ?? (Array.isArray(x.detailFindings) ? x.detailFindings.length : null), recommendedPlan: x.recommendedPlan || "Pro", createdAt: x.createdAt || x.generatedAt || null, generatedAt: x.generatedAt || x.createdAt || null, topFindings: Array.isArray(x.topFindings) ? x.topFindings.slice(0, 3) : [] }));
}
export async function handleAccountRescan(ctx) {
  const [req,res,json,readDb,writeDb,getCustomerSession,bodyJson,MAX_JSON_BODY_BYTES,asTrimmedString,normalizeDomainInput,findSiteByAny,scanResultFor,ensureSiteRecord,ensureSubscriptionForSite,createGuidanceDocument,seedAutoFixJobs,createCtaPublication,buildPublicDiagnosisPackage,customerSavedSites,appendAudit,nowIso] = ctx;
  const db = await readDb();
  const session = await getCustomerSession(req, db);
  if (!session) return json(req, res, 401, { ok: false, error: '로그인이 필요합니다.' });
  const body = await bodyJson(req, MAX_JSON_BODY_BYTES) || {};
  const siteId = asTrimmedString(body.siteId || '', { field: 'siteId', max: 80 });
  const domain = normalizeDomainInput(body.domain || body.target || body.url);
  let site = siteId ? findSiteByAny(db, siteId) : null;
  if (!site && domain) site = findSiteByAny(db, '', domain);
  if (!site || !(db.customerSiteLinks || []).some(item => item.customerId === session.customer.id && item.siteId === site.id)) {
    return json(req, res, 404, { ok: false, error: '저장된 사이트를 찾을 수 없습니다.' });
  }
  const result = await scanResultFor(site.domain, db, { bypassCache: true });
  const canonical = ensureSiteRecord(db, result);
  Object.assign(site, {
    latestRiskScore: canonical.latestRiskScore,
    latestRiskLevel: canonical.latestRiskLevel,
    latestEstimatedMaxPenalty: canonical.latestEstimatedMaxPenalty,
    lastScanAt: canonical.lastScanAt
  });
  const subscription = ensureSubscriptionForSite(db, site, result.recommendedPlan);
  const guidance = createGuidanceDocument(db, site, result);
  const autoFixJobs = seedAutoFixJobs(db, site, result);
  const ctaPublication = db.settings.ctaAutopublishEnabled ? createCtaPublication(db, result, { autoPublished: true }) : null;
  db.scans.unshift({ siteId: site.id, subscriptionId: subscription.id, customerId: session.customer.id, createdAt: nowIso(), ...result });
  db.scans = db.scans.slice(0, 100);
  appendAudit(db, req, 'public.customer.site_rescanned', { customerId: session.customer.id, siteId: site.id, requestId: result.requestId });
  await writeDb(db);
  return json(req, res, 200, {
    ok: true,
    result: { ...result, siteId: site.id, guidanceId: guidance.id, autoFixJobsCount: autoFixJobs.length, savedToAccount: true, ctaPublicationId: ctaPublication?.id || null, diagnosis: buildPublicDiagnosisPackage(result) },
    recentScans: customerRecentScans(db, session.customer, 5),
    sites: customerSavedSites(db, session.customer)
  });
}
