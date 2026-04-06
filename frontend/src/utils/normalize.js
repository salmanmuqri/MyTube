export function normalizeToArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidates = [
    payload.results,
    payload.data,
    payload.items,
    payload.videos,
    payload.subscriptions,
    payload.comments,
    payload.categories,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }

  return [];
}

export function normalizeSearchSuggestions(payload) {
  return {
    titles: normalizeToArray(payload?.titles),
    channels: normalizeToArray(payload?.channels),
  };
}
