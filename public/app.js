let token = '';
const $ = id => document.getElementById(id);
const labels = { edit: 'Save edits', approve: 'Approve', reject: 'Reject', revoke: 'Revoke approval', revise: 'Revise', publish: 'Mock publish (due only)' };
const messages = { edit: 'Changes saved.', approve: 'Draft approved. Mock publishing will run only when the scheduled time is due.', reject: 'Draft rejected. Choose Revise to return it to review.', revoke: 'Approval revoked. The draft is pending review.', revise: 'Draft returned to review.', publish: 'Mock publishing complete. The local result is in publishing history.' };
const formatDate = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
async function api(path, body) {
  const response = await fetch(`/api/${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const value = await response.json(); if (!response.ok) throw new Error(value.error); return value;
}
function element(tag, text, parent) { const el = document.createElement(tag); el.textContent = text; parent.append(el); return el; }
async function act(fn, message) {
  $('message').textContent = '';
  try { const result = await fn(); $('message').className = ''; $('message').textContent = typeof message === 'function' ? message(result) : message; }
  catch (e) { $('message').className = 'error'; $('message').textContent = e.message; }
}
async function refresh(focusId, focusAction) {
  const state = await api('state');
  $('metrics').textContent = `${state.drafts.length} synthetic drafts · ${state.records.length} local mock results`;
  $('drafts').replaceChildren();
  for (const draft of state.drafts) {
    const card = element('article', '', $('drafts')); card.tabIndex = -1;
    element('span', draft.status[0].toUpperCase() + draft.status.slice(1), card).className = `badge status-${draft.status}`;
    const heading = element('h3', draft.title, card); heading.id = `title-${draft.id}`; card.setAttribute('aria-labelledby', heading.id);
    const label = element('label', 'Caption', card); const caption = element('textarea', draft.caption, label); caption.value = draft.caption; caption.disabled = draft.status === 'published';
    const timeLabel = element('label', 'Scheduled time (your local time)', card); const time = element('input', '', timeLabel); time.type = 'datetime-local'; time.disabled = draft.status === 'published';
    time.value = draft.scheduledAt ? new Date(Date.parse(draft.scheduledAt) - new Date(draft.scheduledAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    const actions = { pending: ['edit', 'approve', 'reject'], approved: ['edit', 'revoke', 'publish'], rejected: ['revise'], published: [] }[draft.status];
    const buttons = element('div', '', card); buttons.className = 'actions';
    let nextFocus;
    for (const action of actions) {
      const button = element('button', labels[action], buttons); button.type = 'button';
      if (['reject', 'revoke'].includes(action)) button.className = 'destructive';
      if (action === focusAction) nextFocus = button;
      button.onclick = () => act(async () => {
        button.disabled = true;
        try {
          const result = await api(action === 'publish' ? 'publish' : 'review', { id: draft.id, action, caption: caption.value, ...(time.value ? { scheduledAt: new Date(time.value).toISOString() } : {}) });
          await refresh(draft.id, action); return result;
        } finally { button.disabled = false; }
      }, result => result?.skipped === 'duplicate' ? 'Already mock published. No duplicate result was created.' : messages[action]);
    }
    if (draft.id === focusId) (nextFocus || card).focus();
  }
  $('history').replaceChildren();
  if (!state.records.length) element('p', 'No local mock results yet.', $('history'));
  for (const record of [...state.records].reverse()) {
    const entry = element('article', '', $('history')); entry.className = 'history-entry';
    const meta = element('div', '', entry); meta.className = 'history-meta';
    const time = element('time', formatDate(record.at), meta); time.dateTime = record.at;
    element('span', record.mediaId.length > 16 ? `${record.mediaId.slice(0, 12)}…` : record.mediaId, meta);
    element('p', record.caption, entry);
    const details = element('details', '', entry); element('summary', 'Technical details', details);
    element('p', 'Mock media ID', details); element('code', record.mediaId, details);
    element('p', 'Draft ID', details); element('code', record.id, details);
    element('p', 'Recorded at (ISO)', details); element('code', record.at, details);
  }
  $('events').replaceChildren(); for (const event of state.events.slice(-10).reverse()) element('p', `${formatDate(event.at)} · ${event.code}`, $('events'));
}
$('login-form').onsubmit = e => { e.preventDefault(); act(async () => { token = (await api('login', { password: $('password').value })).token; $('password').value = ''; await refresh(); $('login').hidden = true; $('workspace').hidden = false; $('topic').focus(); }, 'Signed in. Your synthetic review workspace is ready.'); };
$('generate').onsubmit = e => { e.preventDefault(); act(async () => { const draft = await api('generate', { topic: $('topic').value }); await refresh(draft.id); }, 'Synthetic draft generated. Review the caption and choose a scheduled time before approval.'); };
$('tick').onclick = () => act(async () => { const results = await api('tick', {}); await refresh(); return results; }, results => results.length ? `${results.length} due item(s) mock published. Publishing history updated.` : 'Schedule checked. No approved items are due for mock publishing.');
