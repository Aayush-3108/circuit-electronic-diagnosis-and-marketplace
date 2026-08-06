const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || 'Request failed');
  }
  return res.json();
}

export async function analyzeDevice({
  image,
  deviceType,
  brandTier,
  originalPriceInr,
  ageMonths,
  batteryHealthPct,
  functionalStatus,
}) {
  const form = new FormData();
  form.append('image', image);
  form.append('device_type', deviceType);
  form.append('brand_tier', brandTier);
  form.append('original_price_inr', originalPriceInr);
  form.append('age_months', ageMonths);
  form.append('battery_health_pct', batteryHealthPct);
  form.append('functional_status', functionalStatus);

  const res = await fetch(`${API_URL}/api/analyze-device`, {
    method: 'POST',
    body: form,
  });
  return handleResponse(res);
}

export async function getUpgradeAdvice({ deviceType, currentSpecs, budgetInr, useCase }) {
  const res = await fetch(`${API_URL}/api/upgrade-advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_type: deviceType,
      current_specs: currentSpecs,
      budget_inr: budgetInr || null,
      use_case: useCase || null,
    }),
  });
  return handleResponse(res);
}

export async function getRepairShops({ lat, lng, radiusKm = 5 }) {
  const params = new URLSearchParams({ lat, lng, radius_km: radiusKm });
  const res = await fetch(`${API_URL}/api/repair-shops?${params}`);
  return handleResponse(res);
}

export async function getDemandForecast() {
  const res = await fetch(`${API_URL}/api/demand-forecast`);
  return handleResponse(res);
}

export async function sendChatMessage({ messages }) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  return handleResponse(res);
}

// --- History ---------------------------------------------------------------

export async function getHistory(idToken) {
  const res = await fetch(`${API_URL}/api/history`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

// --- Marketplace -----------------------------------------------------------

export async function createListing(listing, idToken) {
  const res = await fetch(`${API_URL}/api/marketplace/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(listing),
  });
  return handleResponse(res);
}

export async function browseListings(filters = {}) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== ''))
  );
  const res = await fetch(`${API_URL}/api/marketplace/listings?${params}`);
  return handleResponse(res);
}

export async function getListing(id) {
  const res = await fetch(`${API_URL}/api/marketplace/listings/${id}`);
  return handleResponse(res);
}

export async function updateListingStatus(id, status, idToken) {
  const res = await fetch(`${API_URL}/api/marketplace/listings/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse(res);
}

export async function deleteListing(id, idToken) {
  const res = await fetch(`${API_URL}/api/marketplace/listings/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}
