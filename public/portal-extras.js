// Extra features: announcements, escalation, search, audit comparison, sign-off, checklist
// templates, camera photos, backup/restore, PIN lock and isiZulu language toggle.
var lang = localStorage.getItem('eskomPortal.lang') || 'en';
function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function jsq(v){ return String(v).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function bucket(){ const b = cncStore[currentCNC]; ['announcements','signoffs','customItems'].forEach(k => { if(!Array.isArray(b[k])) b[k] = []; }); return b; }
const BASE_ITEM_COUNT = items.length;
const inputCss = 'font-family:var(--sans);font-size:13.5px;padding:9px 12px;border-radius:8px;border:1px solid var(--line);';
const lblCss = 'display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--ink-soft);';

/* ---------- Checklist templates (custom items) ---------- */
function applyCustomItems(cnc){
  items.splice(BASE_ITEM_COUNT);
  (cncStore[cnc].customItems || []).forEach(c => items.push({ key:c.key, name:c.name, desc:'Custom checklist item — renewed every ' + c.cadenceDays + ' days', icon:icons.doc, mode:'recurring', cadenceDays:c.cadenceDays }));
}
const _loadCNC = loadCNC;
loadCNC = async function(name){
  if(!Array.isArray(cncStore[name].customItems)) cncStore[name].customItems = [];
  applyCustomItems(name);
  await _loadCNC(name);
  applyLang();
};
function addChecklistItem(){
  const name = document.getElementById('tplName').value.trim();
  const days = parseInt(document.getElementById('tplDays').value, 10) || 30;
  if(!name){ showToast('Please enter a name for the checklist item.'); return; }
  if(name.length > 80){ showToast('The name must be 80 characters or fewer.'); return; }
  if(items.some(it => it.name.toLowerCase() === name.toLowerCase())){ showToast('That item is already on the checklist.'); return; }
  const c = { key:'c' + Date.now(), name, cadenceDays: Math.min(Math.max(days,1),730) };
  bucket().customItems.push(c);
  applyCustomItems(currentCNC);
  staffNames.forEach(p => { state[p][c.key] = { history:[] }; });
  persistCNCData(); renderAuditReports(); showToast('Checklist item added for everyone in the team.');
}
function removeChecklistItem(key){
  const b = bucket(); const c = b.customItems.find(x => x.key === key); if(!c) return;
  if(!confirm('Remove "' + c.name + '" from the checklist? Its records will also be removed.')) return;
  b.customItems = b.customItems.filter(x => x.key !== key);
  staffNames.forEach(p => { delete state[p][key]; });
  applyCustomItems(currentCNC); persistCNCData(); renderAuditReports();
}

/* ---------- Audit page: comparison, sign-off, templates ---------- */
const auditExtra = document.createElement('div');
auditExtra.id = 'auditExtra';
document.getElementById('auditInner').appendChild(auditExtra);

const _renderAudit = renderAuditReports;
renderAuditReports = function(){
  _renderAudit();
  const past = getAuditHistory();
  const b = bucket();
  const opts = sel => past.map((a,i) => `<option value="${i}" ${i===sel?'selected':''}>${fmtAuditDate(a.date)} — ${a.score}%</option>`).join('');
  auditExtra.innerHTML = `
    <div class="section-label">Compare two audits</div>
    <div class="audit-chart">${past.length < 2 ? '<div style="font-size:12.5px;color:var(--ink-soft);">Add at least two past audit scores to compare them.</div>' : `
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <label style="${lblCss}">First audit<select id="cmpA" style="${inputCss}">${opts(past.length-2)}</select></label>
        <label style="${lblCss}">Second audit<select id="cmpB" style="${inputCss}">${opts(past.length-1)}</select></label>
      </div><div id="cmpResult" style="margin-top:12px;font-size:13.5px;"></div>`}</div>

    <div class="section-label">Supervisor sign-off</div>
    <div class="audit-chart">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <label style="${lblCss}">Full name<input id="signName" maxlength="80" value="${esc(currentUserName||'')}" style="${inputCss}"></label>
        <label style="${lblCss}">Audit date<input type="date" id="signDate" value="${new Date().toISOString().slice(0,10)}" style="${inputCss}"></label>
      </div>
      <div style="font-size:12px;font-weight:600;color:var(--ink-soft);margin:12px 0 5px;">Sign in the box below</div>
      <canvas id="signPad" width="460" height="140" style="max-width:100%;border:1px dashed var(--line);border-radius:8px;background:#fff;touch-action:none;cursor:crosshair;"></canvas>
      <div style="display:flex;gap:10px;margin-top:8px;">
        <button class="btn ghost" onclick="clearSignPad()">Clear</button>
        <button class="btn primary" onclick="saveSignoff()">Sign off audit</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:12px;">${b.signoffs.length ? b.signoffs.slice().reverse().map(s => `
        <div style="display:flex;align-items:center;gap:12px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:12.5px;">
          <img src="${s.sig}" style="height:40px;border:1px solid var(--line);border-radius:4px;background:#fff;">
          <span>Signed by <b>${esc(s.name)}</b> for the audit of ${fmtAuditDate(s.auditDate)} · ${new Date(s.at).toLocaleString('en-ZA')}</span></div>`).join('') : '<div style="font-size:12.5px;color:var(--ink-soft);">No sign-offs recorded yet.</div>'}</div>
    </div>

    <div class="section-label">Checklist template</div>
    <div class="audit-chart">
      <div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:10px;">The standard checklist has ${BASE_ITEM_COUNT} items. Add your own items — they are added for every employee.</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
        <label style="${lblCss}">Item name<input id="tplName" maxlength="80" placeholder="e.g. PPE Inspection" style="${inputCss}"></label>
        <label style="${lblCss}">Renew every (days)<input type="number" id="tplDays" min="1" max="730" value="30" style="width:120px;${inputCss}"></label>
        <button class="btn primary" onclick="addChecklistItem()">Add item</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">${b.customItems.map(c => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:#fff;font-size:13px;">
          <span>${esc(c.name)} — every ${c.cadenceDays} days</span>
          <button class="btn ghost" style="padding:4px 10px;font-size:12px;" onclick="removeChecklistItem('${c.key}')">Remove</button></div>`).join('')}</div>
    </div>`;
  if(past.length >= 2){
    const upd = () => {
      const a = past[+document.getElementById('cmpA').value], c = past[+document.getElementById('cmpB').value];
      const diff = c.score - a.score;
      const word = diff > 0 ? `<b style="color:var(--green)">improved by ${diff} points</b>` : diff < 0 ? `<b style="color:var(--red)">dropped by ${-diff} points</b>` : '<b>stayed the same</b>';
      const pass = s => s >= 75 ? 'passed' : 'did not pass';
      document.getElementById('cmpResult').innerHTML = `From ${fmtAuditDate(a.date)} (${a.score}%, ${pass(a.score)}) to ${fmtAuditDate(c.date)} (${c.score}%, ${pass(c.score)}), the score ${word}.`;
    };
    document.getElementById('cmpA').onchange = upd; document.getElementById('cmpB').onchange = upd; upd();
  }
  initSignPad();
};

let signDirty = false;
function initSignPad(){
  const cv = document.getElementById('signPad'); if(!cv) return;
  const ctx = cv.getContext('2d'); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#0A2C73';
  let drawing = false; signDirty = false;
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.onpointerdown = e => { drawing = true; cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  cv.onpointermove = e => { if(!drawing) return; ctx.lineTo(...pos(e)); ctx.stroke(); signDirty = true; };
  cv.onpointerup = () => { drawing = false; };
}
function clearSignPad(){ const cv = document.getElementById('signPad'); cv.getContext('2d').clearRect(0,0,cv.width,cv.height); signDirty = false; }
function saveSignoff(){
  const name = document.getElementById('signName').value.trim();
  const auditDate = document.getElementById('signDate').value;
  if(!name){ showToast('Please enter the name of the person signing.'); return; }
  if(!auditDate){ showToast('Please select the audit date.'); return; }
  if(!signDirty){ showToast('Please draw your signature in the box.'); return; }
  bucket().signoffs.push({ name: name.slice(0,80), auditDate, at: new Date().toISOString(), sig: document.getElementById('signPad').toDataURL('image/png') });
  persistCNCData(); renderAuditReports(); showToast('Audit signed off.');
}

/* ---------- Dashboard: announcements + escalation ---------- */
function getEscalations(){
  const out = [];
  staffNames.forEach(p => items.forEach(it => {
    const rec = state[p] && state[p][it.key]; if(!rec) return;
    const last = latest(rec.history); if(!last || !last.confirmed) return;
    let overdue = 0;
    if(last.userStatus === 'r') overdue = daysBetween(last.date);
    else if(last.userStatus === 'g' && it.mode === 'recurring') overdue = daysBetween(last.endDate || last.date) - it.cadenceDays;
    else if(it.mode === 'static' && rec.expiry) overdue = daysBetween(rec.expiry);
    if(overdue > 7) out.push({ person:p, item:it, idx:items.indexOf(it), overdue });
  }));
  return out;
}
const _renderDash = renderDashboard;
renderDashboard = function(){
  _renderDash();
  const b = bucket();
  document.getElementById('announceBox').innerHTML = `
    <div class="dash-section-head"><h2 data-i18n="ann">Announcements</h2></div>
    <div style="display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
      <input id="annText" maxlength="300" placeholder="Post a safety notice or reminder for the team…" style="flex:1;min-width:220px;${inputCss}">
      <button class="btn primary" onclick="postAnnouncement()">Post</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:22px;">${b.announcements.length ? b.announcements.slice().reverse().map(a => `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:10px 14px;background:#FBF0DD;border-left:4px solid #B8791E;border-radius:8px;font-size:13px;">
        <div><div>${esc(a.text)}</div><div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;">${esc(a.by)} · ${new Date(a.at).toLocaleString('en-ZA')}</div></div>
        <button class="btn ghost" style="padding:3px 9px;font-size:12px;" onclick="removeAnnouncement('${a.id}')">Remove</button></div>`).join('') : '<div style="font-size:12.5px;color:var(--ink-soft);">No announcements yet.</div>'}</div>`;
  const esc_ = getEscalations();
  document.getElementById('escalationBox').innerHTML = esc_.length ? `
    <div class="dash-section-head"><h2 style="color:var(--red)" data-i18n="esc">Escalated to supervisor</h2></div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:22px;">${esc_.map(e => `
      <div style="padding:10px 14px;background:#FBE4E6;border-left:4px solid var(--red);border-radius:8px;font-size:13px;cursor:pointer;" onclick="renderPeople(); openPerson('${jsq(e.person)}'); openTask(${e.idx});">
        <b>${esc(e.person)}</b> — ${esc(e.item.name)} is ${e.overdue} days overdue</div>`).join('')}</div>` : '';
  applyLang();
};
function postAnnouncement(){
  const t = document.getElementById('annText').value.trim();
  if(!t){ showToast('Please type the announcement first.'); return; }
  bucket().announcements.push({ id:'a' + Date.now(), text:t.slice(0,300), by: currentUserName, at: new Date().toISOString() });
  persistCNCData(); renderDashboard(); showToast('Announcement posted.');
}
function removeAnnouncement(id){
  if(!confirm('Remove this announcement?')) return;
  const b = bucket(); b.announcements = b.announcements.filter(a => a.id !== id);
  persistCNCData(); renderDashboard();
}

/* ---------- Global search ---------- */
const searchInput = document.getElementById('globalSearch');
function closeSearch(){ const d = document.getElementById('searchDrop'); if(d) d.remove(); }
searchInput.addEventListener('input', () => {
  closeSearch();
  const q = searchInput.value.trim().toLowerCase(); if(!q || !currentCNC) return;
  const res = [];
  staffNames.forEach(p => {
    if(p.toLowerCase().includes(q) || (roles[p]||'').toLowerCase().includes(q)) res.push({ label:esc(p), sub:esc(roles[p]) + ' · employee', act:`renderPeople(); openPerson('${jsq(p)}')` });
    items.forEach((it,i) => {
      const rec = state[p][it.key]; if(!rec) return;
      if(it.name.toLowerCase().includes(q)) res.push({ label:esc(p) + ' — ' + esc(it.name), sub:statusText[getStatus(p,it)], act:`renderPeople(); openPerson('${jsq(p)}'); openTask(${i})` });
      rec.history.forEach(h => { if((h.comment||'').toLowerCase().includes(q) || (h.file||'').toLowerCase().includes(q)) res.push({ label:esc(p) + ' — ' + esc(it.name), sub:esc(h.comment || h.file), act:`renderPeople(); openPerson('${jsq(p)}'); openTask(${i})` }); });
    });
  });
  const d = document.createElement('div'); d.id = 'searchDrop';
  const r = searchInput.getBoundingClientRect();
  d.style.cssText = `position:fixed;top:${r.bottom + 6}px;left:${r.left}px;width:${Math.max(r.width,320)}px;max-height:360px;overflow:auto;background:#fff;border:1px solid #E3E6EC;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:950;`;
  d.innerHTML = res.length ? res.slice(0,30).map(x => `<div style="padding:9px 14px;border-bottom:1px solid #F0F1F4;cursor:pointer;" onmousedown="attemptLeave(() => { ${x.act.replace(/"/g,'&quot;')} }); closeSearch(); document.getElementById('globalSearch').value='';"><div style="font-size:12.5px;font-weight:700;color:#101828;">${x.label}</div><div style="font-size:11.5px;color:#5B6472;">${x.sub}</div></div>`).join('')
    : '<div style="padding:14px;font-size:12.5px;color:#5B6472;">No results found.</div>';
  document.body.appendChild(d);
});
searchInput.addEventListener('blur', () => setTimeout(closeSearch, 150));

/* ---------- Camera photo ---------- */
(function(){
  const up = document.getElementById('uploadBtn');
  const cam = document.createElement('button');
  cam.className = 'btn ghost'; cam.id = 'cameraBtn';
  cam.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>Take photo';
  up.parentNode.insertBefore(cam, up);
  const fi = document.getElementById('fileInput');
  cam.addEventListener('click', () => {
    fi.setAttribute('accept','image/*'); fi.setAttribute('capture','environment'); fi.click();
    setTimeout(() => { fi.setAttribute('accept','.pdf,.jpg,.jpeg,.png'); fi.removeAttribute('capture'); }, 1000);
  });
})();

/* ---------- Backup / restore ---------- */
function downloadBackup(){
  const data = { app:'eskom-compliance-portal', version:1, exportedAt:new Date().toISOString(), cncStore, accounts };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'eskom-portal-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  showToast('Backup downloaded. Keep the file somewhere safe.');
}
(function(){
  const ri = document.createElement('input'); ri.type = 'file'; ri.accept = '.json,application/json'; ri.id = 'restoreInput'; ri.style.display = 'none';
  document.body.appendChild(ri);
  ri.addEventListener('change', async () => {
    const f = ri.files[0]; ri.value = ''; if(!f) return;
    try {
      const d = JSON.parse(await f.text());
      if(d.app !== 'eskom-compliance-portal' || typeof d.cncStore !== 'object' || !Array.isArray(d.accounts)) throw 0;
      if(!confirm('Restoring will replace all current data on this device with the backup from ' + new Date(d.exportedAt).toLocaleString('en-ZA') + '. Continue?')) return;
      localStorage.setItem('eskomPortal.cncStore', JSON.stringify(d.cncStore));
      localStorage.setItem('eskomPortal.accounts', JSON.stringify(d.accounts));
      alert('Backup restored. Please sign in again.'); location.reload();
    } catch(e){ showToast('This file is not a valid portal backup.'); }
  });
})();

/* ---------- PIN lock ---------- */
function saveAccounts(){ try { localStorage.setItem('eskomPortal.accounts', JSON.stringify(accounts)); } catch(e){} }
function setPin(){
  if(!currentAccount) return;
  const pin = prompt('Enter a 4-digit PIN for locking your screen:');
  if(pin === null) return;
  if(!/^\d{4}$/.test(pin)){ showToast('The PIN must be exactly 4 digits.'); return; }
  currentAccount.pin = pin;
  const acc = accounts.find(a => a.uniqueNumber === currentAccount.uniqueNumber);
  if(acc) acc.pin = pin; else accounts.push(currentAccount);
  saveAccounts(); showToast('PIN saved.');
  const p = document.getElementById('accountPanel'); if(p) p.remove();
}
function lockScreen(){
  const p = document.getElementById('accountPanel'); if(p) p.remove();
  if(!currentAccount || !currentAccount.pin){ showToast('Please set a PIN first from My Account.'); return; }
  const o = document.createElement('div'); o.id = 'pinLock';
  o.style.cssText = 'position:fixed;inset:0;background:#071432;display:flex;align-items:center;justify-content:center;z-index:2000;';
  o.innerHTML = `<div style="background:#fff;border-radius:16px;padding:28px;width:300px;text-align:center;font-family:var(--sans);">
    <div style="font-size:16px;font-weight:700;color:#101828;">Screen locked</div>
    <div style="font-size:12.5px;color:#5B6472;margin:6px 0 16px;">${esc(currentUserName)} — enter your PIN to continue</div>
    <input id="pinInput" type="password" inputmode="numeric" maxlength="4" style="width:100%;text-align:center;letter-spacing:10px;font-size:20px;${inputCss}">
    <div id="pinErr" style="color:#B42318;font-size:12px;margin-top:8px;min-height:15px;"></div>
    <button class="btn primary" id="pinUnlock" style="width:100%;justify-content:center;margin-top:8px;">Unlock</button>
    <button class="btn ghost" id="pinSignout" style="width:100%;justify-content:center;margin-top:8px;">Sign out instead</button></div>`;
  document.body.appendChild(o);
  const inp = document.getElementById('pinInput'); inp.focus();
  const tryUnlock = () => { if(inp.value === currentAccount.pin) o.remove(); else { document.getElementById('pinErr').textContent = 'The PIN you entered is incorrect.'; inp.value = ''; } };
  document.getElementById('pinUnlock').onclick = tryUnlock;
  inp.addEventListener('keydown', e => { if(e.key === 'Enter') tryUnlock(); });
  document.getElementById('pinSignout').onclick = () => { o.remove(); signOut(); };
}

/* ---------- Language (English / isiZulu) ---------- */
const DICT = {
  zu: { navDashboard:'Ideshibhodi', navTracker:'Ukulandelela Ubufakazi', navAudit:'Imibiko Yocwaningo', navStaff:'Uhlu Lwabasebenzi',
        team:'Ithimba lakho', ann:'Izimemezelo', esc:'Kudluliselwe kumphathi' },
  en: { navDashboard:'Dashboard', navTracker:'Evidence Tracker', navAudit:'Audit Reports', navStaff:'Staff Directory',
        team:'Your team', ann:'Announcements', esc:'Escalated to supervisor' }
};
function applyLang(){
  const d = DICT[lang] || DICT.en;
  ['navDashboard','navTracker','navAudit','navStaff'].forEach(id => { const el = document.getElementById(id); if(el && el.lastChild) el.lastChild.textContent = d[id]; });
  document.querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n'); if(d[k]) el.textContent = d[k]; });
  const ul = document.querySelector('#loginPanel .uline-field'); 
}
function toggleLang(){
  lang = lang === 'en' ? 'zu' : 'en';
  localStorage.setItem('eskomPortal.lang', lang);
  applyLang();
  const p = document.getElementById('accountPanel'); if(p) p.remove();
  showToast(lang === 'zu' ? 'Ulimi lushintshelwe esiZulwini.' : 'Language changed to English.');
}
applyLang();

/* ---------- Escalation count in the notification bell ---------- */
const _refreshBadge = refreshNotifBadge;
refreshNotifBadge = function(){
  _refreshBadge();
  if(getEscalations().length) document.getElementById('notifPing').style.display = 'block';
};

// Next audit date + desktop-only
window.saveNextAudit = function(){
  const v = document.getElementById('nextAuditInput').value;
  if(!v){ alert('Please choose the next audit date.'); return; }
  localStorage.setItem('eskomPortal.nextAudit', v);
  renderNextAudit();
  if(typeof showToast==='function') showToast('Next audit date saved. Follow-up items are now due on this date.');
};
function renderNextAudit(){
  const v = localStorage.getItem('eskomPortal.nextAudit');
  const inp = document.getElementById('nextAuditInput'), info = document.getElementById('nextAuditInfo');
  if(!inp) return;
  if(v){ inp.value = v;
    const days = Math.ceil((new Date(v+'T00:00:00') - new Date(new Date().toDateString()))/86400000);
    info.textContent = days >= 0 ? `${days} day${days===1?'':'s'} left to update items that need follow-up.` : 'This audit date has passed — please set the next one.';
  } else info.textContent = 'Not set yet.';
}
document.addEventListener('DOMContentLoaded', () => { renderNextAudit(); try{ if(typeof setViewMode==='function') setViewMode('desktop'); }catch(e){} });
setTimeout(renderNextAudit, 500);

/* ---------- About (Read more) modal ---------- */
function openAbout(){
  const old = document.getElementById('aboutModal'); if(old) old.remove();
  const o = document.createElement('div');
  o.id = 'aboutModal';
  o.style.cssText = 'position:fixed;inset:0;background:rgba(7,20,50,.62);display:flex;align-items:center;justify-content:center;z-index:1800;padding:20px;overflow:auto;';
  o.innerHTML = `
    <div role="dialog" aria-label="About this portal" style="background:#fff;border-radius:16px;max-width:640px;width:100%;padding:32px 34px;font-family:var(--sans);box-shadow:0 24px 64px rgba(0,0,0,.3);max-height:86vh;overflow:auto;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B8791E;margin-bottom:8px;">Eskom Compliance Portal</div>
      <h2 style="margin:0 0 14px;font-size:24px;color:#0A2C73;line-height:1.25;">One central record of your team's compliance</h2>
      <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#33415C;">
        This portal is a single, always-current home for every statutory and safety requirement your
        team must meet. Instead of gathering evidence in a rush before each audit, every work permit,
        risk assessment, medical certificate, appointment letter and sign-off is captured and tracked
        continuously — with its own expiry date and renewal cycle.
      </p>
      <div style="display:flex;flex-direction:column;gap:12px;margin:18px 0 6px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="flex:none;width:26px;height:26px;border-radius:8px;background:#0A2C73;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">1</div>
          <div style="font-size:13.5px;line-height:1.55;color:#33415C;"><b style="color:#101828;">Track.</b> Each employee has a compliance profile that shows exactly which documents are valid, expiring soon or missing.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="flex:none;width:26px;height:26px;border-radius:8px;background:#0A2C73;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">2</div>
          <div style="font-size:13.5px;line-height:1.55;color:#33415C;"><b style="color:#101828;">Act.</b> Items that lapse are escalated to the supervisor with clear due dates, so nothing is overlooked.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="flex:none;width:26px;height:26px;border-radius:8px;background:#0A2C73;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">3</div>
          <div style="font-size:13.5px;line-height:1.55;color:#33415C;"><b style="color:#101828;">Audit.</b> Audit reports record each score, compare it against past results, and are formally signed off on screen.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="flex:none;width:26px;height:26px;border-radius:8px;background:#0A2C73;color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;">4</div>
          <div style="font-size:13.5px;line-height:1.55;color:#33415C;"><b style="color:#101828;">Protect.</b> Your records can be backed up to a file and restored at any time, so your evidence history is never lost.</div>
        </div>
      </div>
      <div style="height:1px;background:#E3E6EC;margin:20px 0 16px;"></div>
      <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#5B6472;">
        Use it as your day-to-day compliance register and your audit preparation will take care of
        itself — the evidence is already in order when the auditor arrives.
      </p>
      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn primary" onclick="document.getElementById('aboutModal').remove()">Close</button>
      </div>
    </div>`;
  o.addEventListener('click', e => { if(e.target === o) o.remove(); });
  document.body.appendChild(o);
}
window.openAbout = openAbout;
