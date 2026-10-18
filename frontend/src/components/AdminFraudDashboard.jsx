import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFraudSummary,
  getFraudAssessments,
  getFraudAssessmentDetail,
  reviewFraudAssessment,
  updateUserRestriction,
  deleteFraudListing,
  deleteFraudAssessment,
  pruneFraudAssessments,
} from '../api';

function TrashIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function ShieldAlertIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function RefreshIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function CloseIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function EyeIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

export default function AdminFraudDashboard() {
  const { user } = useAuth();
  const [token, setToken] = useState(null);

  // Summary Metrics State
  const [summary, setSummary] = useState(null);
  const [_loadingSummary, setLoadingSummary] = useState(true);

  // Assessments List State
  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters State
  const [riskFilter, setRiskFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Detail Modal
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [_loadingDetail, setLoadingDetail] = useState(false);

  // Review Form State inside Modal
  const [reviewStatusChoice, setReviewStatusChoice] = useState('resolved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState(null);

  // Account Restriction State
  const [submittingRestriction, setSubmittingRestriction] = useState(false);
  const [restrictionReasonInput, setRestrictionReasonInput] = useState('');
  const [showRestrictionPrompt, setShowRestrictionPrompt] = useState(false);

  // Action States
  const [deletingListing, setDeletingListing] = useState(false);
  const [deletingAssessment, setDeletingAssessment] = useState(false);
  const [pruningEvents, setPruningEvents] = useState(false);

  // Obtain ID token
  useEffect(() => {
    if (user && user.getIdToken) {
      user.getIdToken().then(setToken);
    }
  }, [user]);

  // Fetch Summary
  const fetchSummaryData = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingSummary(true);
      const res = await getFraudSummary(token);
      setSummary(res);
    } catch (err) {
      console.error('Failed to load fraud summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, [token]);

  // Fetch Assessments
  const fetchAssessmentsData = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingAssessments(true);
      const res = await getFraudAssessments(
        {
          riskLevel: riskFilter,
          reviewStatus: statusFilter,
          eventType: eventTypeFilter,
          search: searchTerm,
          limit: 50,
          offset: 0,
        },
        token
      );
      setAssessments(res.assessments || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoadingAssessments(false);
    }
  }, [token, riskFilter, statusFilter, eventTypeFilter, searchTerm]);

  useEffect(() => {
    if (token) {
      fetchSummaryData();
      fetchAssessmentsData();
    }
  }, [token, fetchSummaryData, fetchAssessmentsData]);

  // Open Inspector Modal
  async function handleInspect(eventId) {
    if (!token) return;
    setActionSuccessMsg(null);
    setShowRestrictionPrompt(false);
    setLoadingDetail(true);
    try {
      const detail = await getFraudAssessmentDetail(eventId, token);
      setSelectedAssessment(detail);
      setReviewStatusChoice(detail.review_status === 'pending' ? 'confirmed_fraud' : detail.review_status);
      setReviewNotes(detail.review_notes || '');
    } catch (err) {
      console.error('Failed to load assessment detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }

  // Handle Review Submission
  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!selectedAssessment || !token) return;
    setSubmittingReview(true);
    setActionSuccessMsg(null);
    try {
      const updated = await reviewFraudAssessment(
        selectedAssessment.event_id,
        {
          reviewStatus: reviewStatusChoice,
          reviewNotes: reviewNotes.trim() || 'Reviewed by administrator.',
        },
        token
      );
      setSelectedAssessment(updated);
      setActionSuccessMsg('Review action recorded and saved to audit log.');
      fetchSummaryData();
      fetchAssessmentsData();
    } catch (err) {
      alert(`Error submitting review: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  }

  // Handle Account Restriction Toggle
  async function handleToggleRestriction(newRestrictedState) {
    if (!selectedAssessment || !token) return;
    setSubmittingRestriction(true);
    try {
      await updateUserRestriction(
        selectedAssessment.user_id,
        {
          isRestricted: newRestrictedState,
          reason: newRestrictedState ? restrictionReasonInput || 'Confirmed fraudulent or abusive activity.' : 'Restored by admin.',
        },
        token
      );
      setShowRestrictionPrompt(false);
      setActionSuccessMsg(newRestrictedState ? 'Account restricted successfully.' : 'Account restriction lifted.');
      handleInspect(selectedAssessment.event_id);
      fetchSummaryData();
    } catch (err) {
      alert(`Error updating restriction: ${err.message}`);
    } finally {
      setSubmittingRestriction(false);
    }
  }

  // Handle Purge / Delete of Fraudulent Marketplace Listing
  async function handleDeleteListing() {
    if (selectedAssessment?.event_type !== 'listing_created') {
      alert('This assessment is not a marketplace listing (it is a system/security event).');
      return;
    }
    const listingId = selectedAssessment?.observed_features?.listing_id || selectedAssessment?.entity_id;
    if (!listingId || !token) return;
    if (!confirm(`Are you sure you want to permanently delete this listing (${listingId}) from the marketplace?`)) return;
    setDeletingListing(true);
    try {
      await deleteFraudListing(listingId, token);
      setActionSuccessMsg(`Listing ${listingId} successfully deleted from the marketplace.`);
      fetchSummaryData();
      fetchAssessmentsData();
    } catch (err) {
      alert(`Delete listing note: ${err.message}`);
    } finally {
      setDeletingListing(false);
    }
  }

  // Handle Delete / Dismiss of Assessment Record
  async function handleDeleteAssessment(eventId) {
    const targetId = eventId || selectedAssessment?.event_id;
    if (!targetId || !token) return;
    if (!confirm(`Are you sure you want to delete assessment #${targetId} from the registry?`)) return;
    setDeletingAssessment(true);
    try {
      await deleteFraudAssessment(targetId, token);
      if (selectedAssessment?.event_id === targetId) {
        setSelectedAssessment(null);
      }
      setActionSuccessMsg(`Assessment record #${targetId} removed.`);
      fetchSummaryData();
      fetchAssessmentsData();
    } catch (err) {
      alert(`Error deleting assessment: ${err.message}`);
    } finally {
      setDeletingAssessment(false);
    }
  }

  // Handle Pruning duplicate test/scraper events down to 5-6 core items
  async function handlePruneEvents() {
    if (!token) return;
    if (!confirm('This will clean up duplicate test & scraper events and keep the 5-6 core demonstration events. Continue?')) return;
    setPruningEvents(true);
    try {
      const res = await pruneFraudAssessments(token);
      alert(`Registry cleaned! Now showing ${res.remaining_count || 6} clean demonstration events.`);
      fetchSummaryData();
      fetchAssessmentsData();
    } catch (err) {
      alert(`Failed to prune events: ${err.message}`);
    } finally {
      setPruningEvents(false);
    }
  }

  // Helpers for Risk Styling
  function getRiskBadge(level) {
    switch (level?.toLowerCase()) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            Medium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Low
          </span>
        );
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Pending Review
          </span>
        );
      case 'confirmed_fraud':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-500/25 text-red-300 border border-red-500/50">
            Confirmed Fraud
          </span>
        );
      case 'false_positive':
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
            False Positive
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Resolved
          </span>
        );
    }
  }

  function getEventTypeBadge(eventType) {
    switch (eventType) {
      case 'listing_created':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Listing
          </span>
        );
      case 'login_attempt':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Auth Anomaly
          </span>
        );
      case 'match_request':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Query Velocity
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-mono text-[var(--text-muted)] bg-[var(--surface-2)]">
            {eventType}
          </span>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent p-6 border border-red-500/20 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold uppercase tracking-wider">
                Admin Panel
              </span>
              <span className="text-xs text-[var(--text-muted)]">Isolation Forest Machine Learning</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--text)]">
              Security & Fraud Detection Console
            </h1>
            <p className="text-xs text-[var(--text-muted)] max-w-2xl">
              Real-time anomaly scoring, marketplace listing quarantine, authentication rate limiting, and component matching telemetry powered by Scikit-Learn Isolation Forest.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchSummaryData(); fetchAssessmentsData(); }}
              className="btn btn-outline text-xs px-3 py-2 flex items-center gap-1.5"
              title="Refresh Dashboard Data"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Total Scans</div>
          <div className="text-2xl font-black text-[var(--text)]">{summary?.total_assessments ?? totalCount}</div>
          <div className="text-[10px] text-[var(--text-dim)]">Logged assessments</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-amber-500/30 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Pending Review</span>
            <AlertTriangleIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-amber-300">{summary?.pending_review_count ?? 0}</div>
          <div className="text-[10px] text-amber-400/80">Requires moderation</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-red-500/30 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-red-400 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Risk</span>
            <ShieldAlertIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-red-400">{summary?.critical_risk_count ?? 0}</div>
          <div className="text-[10px] text-red-400/80">Quarantined automatically</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">High Risk</div>
          <div className="text-2xl font-black text-[var(--text)]">{summary?.high_risk_count ?? 0}</div>
          <div className="text-[10px] text-[var(--text-dim)]">Elevated anomaly score</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-yellow-300 uppercase tracking-wider">Medium Risk</div>
          <div className="text-2xl font-black text-[var(--text)]">{summary?.medium_risk_count ?? 0}</div>
          <div className="text-[10px] text-[var(--text-dim)]">Monitored events</div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--surface)] border border-emerald-500/30 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Low Risk (Nominal)</span>
            <CheckCircleIcon className="w-3.5 h-3.5" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{summary?.low_risk_count ?? 0}</div>
          <div className="text-[10px] text-emerald-400/80">Standard marketplace flow</div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by user ID, email, or listing title / entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Risk Level */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-none"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          {/* Review Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="confirmed_fraud">Confirmed Fraud</option>
            <option value="false_positive">False Positive</option>
            <option value="resolved">Resolved</option>
          </select>

          {/* Event Type */}
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] focus:outline-none"
          >
            <option value="all">All Event Types</option>
            <option value="listing_created">Listing Created</option>
            <option value="match_request">Component Matching</option>
            <option value="login_attempt">Authentication Anomaly</option>
          </select>
        </div>
      </div>

      {/* Fraud Assessments Table */}
      <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-[var(--text)]">Assessment Registry</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] font-bold">
              {totalCount} events recorded
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePruneEvents}
              disabled={pruningEvents}
              className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Clean duplicate test & scraper events and keep 5-6 core demonstration events"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              {pruningEvents ? 'Cleaning...' : 'Prune to 6 Core Events'}
            </button>
            <span className="text-[11px] text-[var(--text-dim)] hidden sm:inline">Model: IsolationForest (sklearn)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/50 text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Risk Level & Score</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Account ID / Email</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Target Device / Entity</th>
                <th className="py-3 px-4">Key Anomaly Indicators</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loadingAssessments ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-[var(--text-muted)]">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshIcon className="w-4 h-4 animate-spin text-[var(--accent)]" />
                      Loading behavioral assessments...
                    </div>
                  </td>
                </tr>
              ) : assessments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-[var(--text-muted)]">
                    No assessments matched the active filter criteria.
                  </td>
                </tr>
              ) : (
                assessments.map((a) => {
                  const scorePct = Math.round((a.anomaly_score || 0) * 100);
                  return (
                    <tr
                      key={a.event_id}
                      onClick={() => handleInspect(a.event_id)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Risk Badge & Meter */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getRiskBadge(a.risk_level)}
                          <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                            <div className="w-16 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  a.risk_level === 'critical'
                                    ? 'bg-red-400'
                                    : a.risk_level === 'high'
                                    ? 'bg-amber-400'
                                    : a.risk_level === 'medium'
                                    ? 'bg-yellow-400'
                                    : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(scorePct, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-[var(--text)]">{(a.anomaly_score || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 whitespace-nowrap text-[var(--text-muted)]">
                        {new Date(a.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        {new Date(a.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* User */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] text-[var(--text)] font-semibold">
                          {a.user_email || a.user_id?.slice(0, 18)}
                        </div>
                        <div className="text-[10px] text-[var(--text-dim)]">{a.user_id}</div>
                      </td>

                      {/* Event Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getEventTypeBadge(a.event_type)}
                      </td>

                      {/* Target Device / Entity */}
                      <td className="py-3 px-4 max-w-[220px]" title={a.listing_title || a.device_name || a.entity_id}>
                        <div className="font-bold text-[var(--text)] truncate text-xs">
                          {a.listing_title || a.device_name || a.observed_features?.listing_title || (a.event_type === 'listing_created' ? 'Marketplace Device' : a.entity_id || '—')}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
                          {(a.device_type || a.observed_features?.device_type) && (
                            <span className="capitalize px-1.5 py-0.2 bg-[var(--surface-2)] text-[var(--accent)] rounded font-sans font-semibold text-[9px] border border-[var(--border)]">
                              {a.device_type || a.observed_features?.device_type}
                            </span>
                          )}
                          <span className="truncate opacity-75">{a.entity_id?.slice(0, 16)}...</span>
                        </div>
                      </td>

                      {/* Indicators Preview */}
                      <td className="py-3 px-4 max-w-[240px]">
                        {a.risk_indicators && a.risk_indicators.length > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-amber-300 font-medium block truncate" title={a.risk_indicators[0]}>
                              • {a.risk_indicators[0]}
                            </span>
                            {a.risk_indicators.length > 1 && (
                              <span className="text-[10px] text-[var(--text-dim)]">
                                +{a.risk_indicators.length - 1} more indicator(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400">Within nominal bounds</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(a.review_status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleInspect(a.event_id)}
                            className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                          <button
                            onClick={() => handleDeleteAssessment(a.event_id)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-600/80 border border-red-500/30 hover:border-red-600 transition-all cursor-pointer"
                            title="Delete / Dismiss this assessment record"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assessment Inspector Modal */}
      {selectedAssessment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => { if (!submittingReview) setSelectedAssessment(null); }}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl relative shadow-2xl overflow-hidden bg-[var(--surface)] border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-start justify-between bg-[var(--surface-2)]/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-black text-[var(--text)]">
                    Assessment #{selectedAssessment.event_id}
                  </h3>
                  {getRiskBadge(selectedAssessment.risk_level)}
                  {getEventTypeBadge(selectedAssessment.event_type)}
                </div>
                {(selectedAssessment.listing_title || selectedAssessment.device_name || selectedAssessment.observed_features?.listing_title) && (
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)] mt-1">
                    <span className="text-[var(--accent)] font-semibold uppercase tracking-wider text-[10px]">Inspecting Device:</span>
                    <span className="text-white bg-[var(--surface)] px-2.5 py-0.5 rounded-lg border border-[var(--border)] shadow-xs">
                      {selectedAssessment.listing_title || selectedAssessment.device_name || selectedAssessment.observed_features?.listing_title}
                    </span>
                  </div>
                )}
                <p className="text-xs text-[var(--text-muted)]">
                  Captured on {new Date(selectedAssessment.created_at).toLocaleString()} · Model: {selectedAssessment.model_version}
                </p>
              </div>

              <button
                onClick={() => setSelectedAssessment(null)}
                disabled={submittingReview}
                className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Success Alert */}
              {actionSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 font-semibold">
                  <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{actionSuccessMsg}</span>
                </div>
              )}

              {/* Event Type Context Card */}
              {selectedAssessment.event_type === 'listing_created' ? (
                <div className="p-4 rounded-xl bg-indigo-500/15 border border-indigo-500/30 space-y-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-300 text-xs">Marketplace Listing Submission</span>
                        {(selectedAssessment.device_type || selectedAssessment.observed_features?.device_type) && (
                          <span className="capitalize px-2 py-0.5 bg-indigo-500/25 text-indigo-200 rounded font-bold text-[10px] uppercase tracking-wider border border-indigo-500/30">
                            {selectedAssessment.device_type || selectedAssessment.observed_features?.device_type}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-white mt-1">
                        {selectedAssessment.listing_title || selectedAssessment.device_name || selectedAssessment.observed_features?.listing_title || 'Marketplace Item'}
                      </h4>
                      {(selectedAssessment.brand || selectedAssessment.model_name) && (
                        <p className="text-[11px] text-indigo-200 mt-0.5">
                          {selectedAssessment.brand && <span>Brand: <strong className="text-white">{selectedAssessment.brand}</strong></span>}
                          {selectedAssessment.model_name && <span className="ml-2">· Model: <strong className="text-white">{selectedAssessment.model_name}</strong></span>}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-indigo-200 bg-indigo-500/25 px-2.5 py-1 rounded-lg border border-indigo-500/40">
                      Listing ID: {selectedAssessment.observed_features?.listing_id || selectedAssessment.entity_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-indigo-500/20">
                    This anomaly was evaluated when this device was posted or modified in the marketplace. You can review the anomaly breakdown below or permanently purge the listing from the circular marketplace.
                  </p>
                </div>
              ) : selectedAssessment.event_type === 'match_request' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-xs">Component Matching Telemetry Alert</span>
                    <span className="font-mono text-[11px] text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded">
                      Query Signature: {selectedAssessment.entity_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    This is an algorithmic telemetry alert triggered by high-frequency hardware searches or bot scraping. There is no marketplace listing attached to this search activity.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-purple-500/15 border border-purple-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-300 text-xs">Authentication Security Alert</span>
                    <span className="font-mono text-[11px] text-purple-200 bg-purple-500/20 px-2 py-0.5 rounded">
                      Target: {selectedAssessment.entity_id}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    This security alert was logged during repeated authentication failures or brute force login attempts. Automated cooldown has protected the account.
                  </p>
                </div>
              )}

              {/* Anomaly Score Gauge */}
              <div className="p-4 rounded-xl bg-[var(--surface-2)]/60 border border-[var(--border)] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[var(--text)]">Isolation Forest Calibrated Risk Score</span>
                  <span className="font-mono font-black text-sm text-[var(--text)]">
                    {(selectedAssessment.anomaly_score || 0).toFixed(3)} / 1.000
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedAssessment.risk_level === 'critical'
                        ? 'bg-red-400'
                        : selectedAssessment.risk_level === 'high'
                        ? 'bg-amber-400'
                        : selectedAssessment.risk_level === 'medium'
                        ? 'bg-yellow-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(selectedAssessment.anomaly_score * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Observed Features */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Observed Feature Telemetry
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedAssessment.observed_features &&
                    Object.entries(selectedAssessment.observed_features).map(([key, val]) => (
                      <div key={key} className="p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] space-y-0.5">
                        <div className="text-[10px] text-[var(--text-muted)] truncate capitalize">
                          {key.replace(/_/g, ' ')}
                        </div>
                        <div className="font-mono font-bold text-xs text-[var(--text)] truncate">
                          {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(val < 1 ? 3 : 0)) : String(val)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Risk Indicators */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Explainable Risk Indicators
                </h4>
                {selectedAssessment.risk_indicators && selectedAssessment.risk_indicators.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedAssessment.risk_indicators.map((ind, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2"
                      >
                        <AlertTriangleIcon className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                        <span>{ind}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>No anomalous deviations detected. Activity is consistent with genuine user behavior.</span>
                  </div>
                )}
              </div>

              {/* Review & Moderation Form */}
              <form onSubmit={handleSubmitReview} className="space-y-4 pt-4 border-t border-[var(--border)]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  Moderator Review Workflow
                </h4>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[var(--text)]">Review Status Decision</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewStatusChoice('resolved')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        reviewStatusChoice === 'resolved'
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      Clear & Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatusChoice('false_positive')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        reviewStatusChoice === 'false_positive'
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 shadow-sm'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      False Positive
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatusChoice('confirmed_fraud')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        reviewStatusChoice === 'confirmed_fraud'
                          ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-sm'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      Confirm Fraud
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--text)]">Review Notes & Justification</label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter notes for audit trail (e.g., confirmed wire transfer scam, proof of purchase verified, or duplicate spam)..."
                    className="w-full p-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] text-xs"
                  />
                </div>

                {/* Modal Action Buttons Footer */}
                <div className="flex items-center justify-between pt-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      {submittingReview ? 'Saving Audit Record...' : 'Submit Review Decision'}
                    </button>

                    {/* Prominent High-Contrast Delete Listing Button */}
                    {selectedAssessment.event_type === 'listing_created' && (
                      <button
                        type="button"
                        onClick={handleDeleteListing}
                        disabled={deletingListing}
                        className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Permanently purge this fraudulent listing from circular marketplace"
                      >
                        <TrashIcon className="w-4 h-4" />
                        {deletingListing ? 'Deleting Listing...' : 'Delete Listing'}
                      </button>
                    )}

                    {/* Delete / Dismiss Assessment Button (for all events) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteAssessment(selectedAssessment.event_id)}
                      disabled={deletingAssessment}
                      className="px-3.5 py-2.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      title="Delete this assessment record from the database"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      {deletingAssessment ? 'Dismissing...' : 'Dismiss Assessment'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowRestrictionPrompt(!showRestrictionPrompt)}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldAlertIcon className="w-3.5 h-3.5" />
                    {showRestrictionPrompt ? 'Close Restriction' : 'Account Restrictions...'}
                  </button>
                </div>
              </form>

              {/* Account Restriction Sub-Panel */}
              {showRestrictionPrompt && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                    <ShieldAlertIcon className="w-4 h-4 shrink-0" />
                    <span>Enforce Temporary Account Restriction</span>
                  </div>
                  <p className="text-[11px] text-red-300/80">
                    Restricting this account will immediately block the user from creating listings, making reservations, and accessing protected marketplace features.
                  </p>
                  <input
                    type="text"
                    placeholder="Reason for restriction..."
                    value={restrictionReasonInput}
                    onChange={(e) => setRestrictionReasonInput(e.target.value)}
                    className="w-full p-2 text-xs rounded bg-[var(--surface)] border border-red-500/40 text-[var(--text)] placeholder:text-[var(--text-dim)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleRestriction(true)}
                      disabled={submittingRestriction}
                      className="px-3 py-1.5 rounded bg-red-500 text-white font-semibold text-xs hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submittingRestriction ? 'Applying...' : 'Apply Restriction'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleRestriction(false)}
                      disabled={submittingRestriction}
                      className="px-3 py-1.5 rounded bg-[var(--surface-2)] text-[var(--text)] text-xs hover:bg-[var(--surface)] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Lift Restriction
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
