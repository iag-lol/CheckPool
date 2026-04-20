export function buildDefaultChecklist(items) {
  const defaults = {};
  Object.values(items).forEach(section => {
    section.items.forEach(item => {
      defaults[item.id] = { state: 'bueno', obs: '' };
    });
  });
  return defaults;
}

export function getChecklistItem(items, itemId) {
  for (const [sectionKey, section] of Object.entries(items)) {
    const item = section.items.find(i => i.id === itemId);
    if (item) return { sectionKey, section, item };
  }
  return null;
}

export function buildChecklistFromActiveTickets(items, tickets = []) {
  const updates = {};
  tickets.forEach(ticket => {
    if (!ticket.checklistItemId) return;
    const found = getChecklistItem(items, ticket.checklistItemId);
    if (!found) return;
    updates[ticket.checklistItemId] = {
      state: 'malo',
      obs: ticket.descripcion || ticket.description || '',
    };
  });
  return updates;
}

export function getBadChecklistEntries(checklist = {}, items) {
  const entries = [];
  Object.entries(items).forEach(([sectionKey, section]) => {
    section.items.forEach(item => {
      const itemData = checklist[item.id];
      if (itemData?.state !== 'malo') return;
      entries.push({
        itemId: item.id,
        itemLabel: item.label,
        sectionKey,
        sectionLabel: section.label,
        description: itemData.obs?.trim() || `${item.label} registrado como Malo`,
      });
    });
  });
  return entries;
}
