// Entirely invented fixtures. No source data is imported.
export function seedDemo(store) {
  if (store.state.drafts.length) return;
  store.state.drafts.push(
    { id: 'synthetic-review', title: 'A small learning habit', caption: '[SYNTHETIC DEMO] Set aside five minutes to reflect on something new.', tags: ['Demo'], status: 'pending', scheduledAt: null, history: [{ status: 'pending', at: '2026-01-01T09:00:00Z' }] },
    { id: 'synthetic-history', title: 'An example already reviewed', caption: '[SYNTHETIC DEMO] Take a short screen break.', tags: ['Demo'], status: 'published', scheduledAt: '2026-01-01T10:00:00Z', history: [{ status: 'pending', at: '2026-01-01T09:00:00Z' }, { status: 'approved', at: '2026-01-01T09:30:00Z' }, { status: 'published', at: '2026-01-01T10:00:00Z' }] }
  );
  store.state.records.push({ id: 'synthetic-history', mediaId: 'mock-synthetic-history', caption: '[SYNTHETIC DEMO] Take a short screen break.', synthetic: true, at: '2026-01-01T10:00:00Z' });
  store.save();
}
