const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').trim();
const API_URL = rawApiUrl.replace(/\/+$/, '');

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

export async function getPartMatches({ deviceType, brand, modelName, neededPartCategory }) {
  const params = new URLSearchParams({
    device_type: deviceType,
    brand,
    model_name: modelName,
    needed_part_category: neededPartCategory
  });
  const res = await fetch(`${API_URL}/api/marketplace/matches?${params}`);
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

// --- Messaging -----------------------------------------------------------

export async function createOrGetConversation({ listingId, sellerUid }, idToken) {
  const res = await fetch(`${API_URL}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ listing_id: listingId, seller_uid: sellerUid }),
  });
  return handleResponse(res);
}

export async function getConversations(idToken) {
  const res = await fetch(`${API_URL}/api/conversations`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function getConversationMessages(conversationId, idToken) {
  const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function sendConversationMessage(conversationId, text, idToken) {
  const res = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

// --- Component Reuse & Compatibility System ---------------------------------

export async function registerDevice(deviceData, idToken) {
  const res = await fetch(`${API_URL}/api/devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(deviceData),
  });
  return handleResponse(res);
}

export async function getUserDevices(idToken) {
  const res = await fetch(`${API_URL}/api/devices`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function searchCompatibleComponents(searchParams) {
  const res = await fetch(`${API_URL}/api/marketplace/compatible-components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_type: searchParams.deviceType,
      brand: searchParams.brand,
      model_name: searchParams.modelName,
      exact_model_number: searchParams.exactModelNumber || null,
      needed_part_category: searchParams.neededPartCategory,
      max_price_inr: searchParams.maxPriceInr ? Number(searchParams.maxPriceInr) : null,
    }),
  });
  return handleResponse(res);
}

export async function evaluateCompatibility(req) {
  const res = await fetch(`${API_URL}/api/marketplace/evaluate-compatibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      target_device_type: req.targetDeviceType,
      target_brand: req.targetBrand,
      target_model_name: req.targetModelName,
      target_exact_model: req.targetExactModel || null,
      needed_part_category: req.neededPartCategory,
    }),
  });
  return handleResponse(res);
}

export async function createReservation({ listingId, partId, buyerNotes, idempotencyKey }, idToken) {
  const res = await fetch(`${API_URL}/api/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      listing_id: listingId,
      part_id: partId || null,
      buyer_notes: buyerNotes || '',
      idempotency_key: idempotencyKey,
    }),
  });
  return handleResponse(res);
}

export async function getUserReservations(idToken) {
  const res = await fetch(`${API_URL}/api/reservations`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function updateReservationStatus(resId, status, idToken) {
  const form = new FormData();
  form.append('status', status);
  const res = await fetch(`${API_URL}/api/reservations/${resId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  });
  return handleResponse(res);
}

export async function reportListing({ listingId, reason, details }, idToken) {
  const res = await fetch(`${API_URL}/api/marketplace/listings/${listingId}/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ listing_id: listingId, reason, details }),
  });
  return handleResponse(res);
}

// ==========================================
// Security & Rate Limiting APIs
// ==========================================

export async function checkLoginAttempt(email, ipAddress = null) {
  const res = await fetch(`${API_URL}/api/security/login-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ip_address: ipAddress }),
  });
  return handleResponse(res);
}

export async function recordLoginResult({ email, success, errorCode = null, ipAddress = null, userAgent = null }) {
  const res = await fetch(`${API_URL}/api/security/login-result`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      success,
      error_code: errorCode,
      ip_address: ipAddress,
      user_agent: userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
    }),
  });
  return handleResponse(res);
}

export async function getSecurityMe(idToken) {
  const res = await fetch(`${API_URL}/api/security/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

// ==========================================
// Fraud Detection & Admin Center APIs
// ==========================================

export async function getFraudHealth() {
  const res = await fetch(`${API_URL}/api/fraud/health`);
  return handleResponse(res);
}

export async function getFraudSummary(idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/summary`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function getFraudAssessments({ riskLevel, reviewStatus, eventType, search, limit = 50, offset = 0 } = {}, idToken) {
  const params = new URLSearchParams();
  if (riskLevel && riskLevel !== 'all') params.append('risk_level', riskLevel);
  if (reviewStatus && reviewStatus !== 'all') params.append('review_status', reviewStatus);
  if (eventType && eventType !== 'all') params.append('event_type', eventType);
  if (search) params.append('search', search);
  params.append('limit', limit);
  params.append('offset', offset);

  const res = await fetch(`${API_URL}/api/fraud/admin/assessments?${params.toString()}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function getFraudAssessmentDetail(eventId, idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/assessments/${eventId}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return handleResponse(res);
}

export async function reviewFraudAssessment(eventId, { reviewStatus, reviewNotes }, idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/assessments/${eventId}/review`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      review_status: reviewStatus,
      review_notes: reviewNotes || null,
    }),
  });
  return handleResponse(res);
}

export async function updateUserRestriction(userId, { isRestricted, reason }, idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/users/${userId}/restriction`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      is_restricted: isRestricted,
      reason: reason || null,
    }),
  });
  return handleResponse(res);
}

export async function deleteFraudListing(listingId, idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/listings/${listingId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return handleResponse(res);
}

export async function deleteFraudAssessment(assessmentId, idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/assessments/${assessmentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return handleResponse(res);
}

export async function pruneFraudAssessments(idToken) {
  const res = await fetch(`${API_URL}/api/fraud/admin/prune-events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });
  return handleResponse(res);
}




