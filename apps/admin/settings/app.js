import { adminFetch, adminLogout } from '/shared/admin-client.js';

document.getElementById('logoutBtn')?.addEventListener('click', adminLogout);

async function load(){
  const [settingsRes, diagRes] = await Promise.all([
    adminFetch('/api/admin/settings'),
    adminFetch('/api/admin/diagnostics')
  ]);
  const data = await settingsRes.json();
  const diag = await diagRes.json();
  document.getElementById('ctaAutopublishEnabled').checked=!!data.settings.ctaAutopublishEnabled;
  document.getElementById('legalWatchEnabled').checked=!!data.settings.legalWatchEnabled;
  document.getElementById('autoFixMode').value=data.settings.autoFixMode;
  document.getElementById('defaultJurisdiction').value=data.settings.defaultJurisdiction;
  document.getElementById('defaultAlertChannel').value=data.settings.defaultAlertChannel;
  document.getElementById('supportEmail').value=data.settings.supportEmail;
  document.getElementById('scanProviderMode').value = diag.runtime.scanProvider;
  document.getElementById('paymentProviderMode').value = diag.runtime.paymentProvider;
  document.getElementById('storageMode').value = diag.runtime.storageMode;
  document.getElementById('settingsState').textContent=JSON.stringify({settings:data.settings, integrations:diag.integrations},null,2);
}
document.getElementById('saveSettingsBtn').addEventListener('click', async()=>{
  const payload={
    ctaAutopublishEnabled:document.getElementById('ctaAutopublishEnabled').checked,
    legalWatchEnabled:document.getElementById('legalWatchEnabled').checked,
    autoFixMode:document.getElementById('autoFixMode').value,
    defaultJurisdiction:document.getElementById('defaultJurisdiction').value,
    defaultAlertChannel:document.getElementById('defaultAlertChannel').value,
    supportEmail:document.getElementById('supportEmail').value
  };
  const res=await adminFetch('/api/admin/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json();
  document.getElementById('settingsState').textContent=JSON.stringify(data.settings,null,2);
});
load();
