import { useState, useMemo } from 'react';
import { CheckIcon, InfoIcon, ShieldIcon } from './Icons';

// ============================================================================
// Helper: Robust & Resilient Parser for Gemini & AI Advisory Outputs
// ============================================================================
export function parseUpgradeAdvice(rawText, budgetInr = null) {
  if (!rawText || typeof rawText !== 'string') {
    return { items: [], rawText: '', isDemoOrFallback: false };
  }

  const cleanText = rawText.trim();

  // Check for demo mode or short error message
  if (
    cleanText.includes('running in demo mode') ||
    cleanText.includes('temporarily unavailable') ||
    cleanText.length < 50
  ) {
    return { items: [], rawText: cleanText, isDemoOrFallback: true };
  }

  let blocks = [];

  // Pattern 1: Split on lines starting with numbered items, options, or bold headers
  // Handles: "1.", "1)", "* Option 1", "### 1.", "**1.", "* **Option 1"
  const optionRegex = /(?:^|\n)(?:[*\-•]\s*)?(?:###\s*)?(?:\*{0,2}(?:Option\s*)?\d+[.):*]|\*{2}Option\s*\d+\*{2}:?)\s*/i;
  const parts = cleanText.split(optionRegex);
  if (parts.length >= 3) {
    blocks = parts.slice(1);
  } else {
    // Pattern 2: Split on bullet points followed by bold: e.g. "* **" or "- **"
    const bulletSplit = cleanText.split(/(?:^|\n)[*\-•]\s+(?=\*\*)/);
    if (bulletSplit.length >= 3) {
      blocks = bulletSplit.slice(1);
    } else {
      // Pattern 3: Split by double newlines where paragraphs contain product-like headers
      const paragraphSplit = cleanText.split(/\n\s*\n+/);
      const candidates = paragraphSplit.filter((p) => p.trim().length > 25);
      if (
        candidates.length >= 2 &&
        candidates.some((c) => /(?:price|trade-?off|strength|longevity|[\u20B9₹]|INR)/i.test(c))
      ) {
        blocks = candidates;
      }
    }
  }

  if (blocks.length === 0) {
    return { items: [], rawText: cleanText, isDemoOrFallback: false };
  }

  const items = blocks.map((block, idx) => {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    const firstLine = lines[0] || '';

    // Extract product name
    let name = '';
    const boldMatch = firstLine.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      name = boldMatch[1].replace(/^(?:Option\s*\d+:?\s*)/i, '').trim();
    } else {
      const colonMatch = firstLine.match(/^([^:(]+)/);
      name = (colonMatch ? colonMatch[1] : firstLine).trim();
    }

    // Clean name of prices and trailing labels like ": ₹40,000" or "- Price: ..."
    name = name
      .replace(/\([^)]*(?:[\u20B9₹]|INR|Rs\.?)[^)]*\)/gi, '')
      .replace(/\s*[-–:]\s*Price.*$/i, '')
      .replace(/:\s*[\u20B9₹Rs].*$/gi, '')
      .trim();

    if (!name || name.length > 60) {
      name = `Upgrade Path ${idx + 1}`;
    }

    // Extract price
    let price = null;
    let priceNumber = null;
    const priceMatch =
      block.match(/(?:[\u20B9₹]|INR|Rs\.?)\s*([\d,]+(?:\s*-\s*[\d,]+)?(?:\s*(?:k|K|Lakh|lakh))?)/i) ||
      block.match(/\(~?\s*(?:[\u20B9₹]|INR|Rs\.?)\s*([\d,]+.*?)\)/i);
    if (priceMatch) {
      price = priceMatch[0].replace(/[()]/g, '').trim();
      const numMatch = price.match(/[\d,]+/);
      if (numMatch) {
        priceNumber = parseInt(numMatch[0].replace(/,/g, ''), 10);
        if (/k/i.test(price) && priceNumber < 1000) priceNumber *= 1000;
      }
    }

    // Determine budget fit
    let budgetFit = null;
    if (budgetInr && priceNumber) {
      if (priceNumber <= budgetInr) {
        budgetFit = 'within';
      } else if (priceNumber <= budgetInr * 1.15) {
        budgetFit = 'slight_stretch';
      } else {
        budgetFit = 'over_budget';
      }
    }

    // Extract category metadata
    const tradeoffs = [];
    const strengths = [];
    let longevity = null;
    let battery = null;
    let performance = null;
    let camera = null;
    let bestFor = null;

    lines.forEach((line) => {
      const cleanLine = line.replace(/^[*\-•\d.]+\s*/, '').replace(/\*\*/g, '').trim();

      if (/^[-*•]?\s*(?:\*\*)?(?:trade-?offs?|cons?|drawbacks?|limitations?)\b/i.test(line)) {
        const val = cleanLine.replace(/^(?:Trade-?offs?|Cons?|Drawbacks?|Limitations?)\s*:?\s*/i, '').trim();
        if (val) tradeoffs.push(val);
      } else if (/^[-*•]?\s*(?:\*\*)?(?:pros?|strengths?|advantages?|highlights?)\b/i.test(line)) {
        const val = cleanLine.replace(/^(?:Pros?|Strengths?|Advantages?|Highlights?)\s*:?\s*/i, '').trim();
        if (val) strengths.push(val);
      } else if (/^[-*•]?\s*(?:\*\*)?(?:longevity|software support|updates?)\b/i.test(line)) {
        longevity = cleanLine.replace(/^(?:Longevity|Software Support|Updates?)\s*:?\s*/i, '').trim();
      } else if (/^[-*•]?\s*(?:\*\*)?(?:battery(?:\s*life)?|charging)\b/i.test(line)) {
        battery = cleanLine.replace(/^(?:Battery(?:\s*life)?|Charging)\s*:?\s*/i, '').trim();
      } else if (/^[-*•]?\s*(?:\*\*)?(?:performance|processor|hardware|chipset)\b/i.test(line)) {
        performance = cleanLine.replace(/^(?:Performance|Processor|Hardware|Chipset)\s*:?\s*/i, '').trim();
      } else if (/^[-*•]?\s*(?:\*\*)?(?:camera|display|screen|optics)\b/i.test(line)) {
        camera = cleanLine.replace(/^(?:Camera|Display|Screen|Optics)\s*:?\s*/i, '').trim();
      } else if (/^[-*•]?\s*(?:\*\*)?(?:best for|ideal for|suited for|recommended for)\b/i.test(line)) {
        bestFor = cleanLine.replace(/^(?:Best for|Ideal for|Suited for|Recommended for)\s*:?\s*/i, '').trim();
      }
    });

    // Fallback sentence extraction for strengths and tradeoffs
    if (strengths.length === 0) {
      const sentences = block.split(/(?:\. |\n)/).map((s) => s.trim()).filter((s) => s.length > 15);
      for (const s of sentences) {
        const cleanS = s.replace(/^[*\-•\d.]+\s*/, '').replace(/\*\*/g, '').trim();
        const lowerS = cleanS.toLowerCase();
        if (
          !lowerS.includes('trade') &&
          !lowerS.includes('drawback') &&
          !lowerS.includes('con') &&
          !lowerS.includes('cost') &&
          !lowerS.includes('price')
        ) {
          if (strengths.length < 3) strengths.push(cleanS);
        } else if (
          tradeoffs.length === 0 &&
          (lowerS.includes('trade') ||
            lowerS.includes('lack') ||
            lowerS.includes('small') ||
            lowerS.includes('older') ||
            lowerS.includes('heavy') ||
            lowerS.includes('warm'))
        ) {
          tradeoffs.push(cleanS);
        }
      }
    }

    // Role / badge derivation
    let badge = idx === 0 ? 'Best overall fit' : idx === 1 ? 'Top value alternative' : 'Budget / Specialized option';
    if (bestFor) {
      const lowerBf = bestFor.toLowerCase();
      if (lowerBf.includes('gam')) badge = 'Best for Gaming';
      else if (lowerBf.includes('cam') || lowerBf.includes('photo')) badge = 'Best for Camera';
      else if (lowerBf.includes('batt')) badge = 'Best for Battery';
      else if (lowerBf.includes('work') || lowerBf.includes('coll') || lowerBf.includes('prod')) badge = 'Best for Productivity';
    }

    return {
      id: `rec-${idx}`,
      name,
      price: price || 'Market price varies',
      priceNumber,
      budgetFit,
      badge,
      bestFor: bestFor || (idx === 0 ? 'Balanced daily workflow & performance' : 'Specific budget & capability target'),
      rationale: strengths[0] || 'Offers optimal hardware longevity and value for your selected usage profile.',
      strengths: strengths.slice(0, 4),
      tradeoffs: tradeoffs.slice(0, 3),
      longevity: longevity || null,
      battery: battery || null,
      performance: performance || null,
      camera: camera || null,
      rawText: block.trim(),
    };
  });

  return { items, rawText: cleanText, isDemoOrFallback: false };
}

// ============================================================================
// Subcomponent: Summary Shortlist Header
// ============================================================================
function RecommendationSummary({ userContext, itemCount }) {
  const { deviceType, budget, useCase, brandModel, selectedPains } = userContext;

  const subtitle = useMemo(() => {
    let s = `Curated for your ${brandModel ? brandModel + ' ' : ''}${deviceType || 'device'}`;
    if (useCase) s += ` for ${useCase.toLowerCase()} demands`;
    if (budget) s += ` targeting ₹${Number(budget).toLocaleString('en-IN')}`;
    s += '.';
    return s;
  }, [deviceType, budget, useCase, brandModel]);

  return (
    <div className="space-y-4 pb-6 border-b border-[var(--border)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
            Hardware Longevity Intelligence
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)] mt-1">
            Your upgrade shortlist
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
            {itemCount} {itemCount === 1 ? 'Recommendation' : 'Recommended Paths'}
          </span>
        </div>
      </div>

      {/* Contextual Specification Chips */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text)] flex items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Device:</span>
          <span className="capitalize">{deviceType || 'Hardware'}</span>
        </div>

        {budget ? (
          <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text)] flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Budget:</span>
            <span>₹{Number(budget).toLocaleString('en-IN')}</span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Budget:</span>
            <span>Flexible / Open</span>
          </div>
        )}

        {useCase && (
          <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text)] flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Workload:</span>
            <span>{useCase}</span>
          </div>
        )}

        {selectedPains && selectedPains.length > 0 && (
          <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[var(--text-dim)]">Resolves:</span>
            <span>{selectedPains.length} issue(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Featured Top Recommendation Card
// ============================================================================
function FeaturedRecommendation({ item }) {
  if (!item) return null;

  return (
    <div className="rounded-2xl p-6 sm:p-7 relative overflow-hidden bg-[var(--surface)] border-2 border-[var(--accent)]/40 shadow-sm space-y-5 transition-all hover:border-[var(--accent)]/70">
      {/* Decorative top corner accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/60 to-transparent" />

      {/* Header with Title, Badge, and Price */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
              {item.badge}
            </span>
            {item.budgetFit === 'within' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Within Budget
              </span>
            )}
            {item.budgetFit === 'slight_stretch' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Slight Budget Stretch
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[var(--text)] leading-snug">
            {item.name}
          </h3>
          <p className="text-xs text-[var(--text-muted)] font-medium">
            Best suited for: <span className="text-[var(--text)]">{item.bestFor}</span>
          </p>
        </div>

        {/* Price Tag */}
        <div className="text-left sm:text-right shrink-0">
          <div className="text-2xl font-black text-[var(--sell)] tracking-tight">
            {item.price}
          </div>
          <span className="text-[10px] text-[var(--text-dim)] uppercase font-semibold">Estimated Market Price</span>
        </div>
      </div>

      {/* Rationale Sentence */}
      {item.rationale && (
        <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed bg-[var(--surface-2)]/60 p-3.5 rounded-xl border border-[var(--border-subtle)]">
          {item.rationale}
        </p>
      )}

      {/* Key Strengths & Drawbacks Grid */}
      <div className="grid sm:grid-cols-2 gap-4 pt-1">
        {/* Strengths */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)] block">
            Key Advantages
          </span>
          <div className="space-y-1.5">
            {item.strengths && item.strengths.length > 0 ? (
              item.strengths.map((str, sIdx) => (
                <div key={sIdx} className="flex items-start gap-2 text-xs text-[var(--text)]">
                  <div className="w-4 h-4 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                    <CheckIcon className="w-2.5 h-2.5" />
                  </div>
                  <span className="leading-snug">{str}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[var(--text-muted)]">Balances longevity, performance, and day-to-day usability.</p>
            )}
          </div>
        </div>

        {/* Trade-off / Limitation */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
            Important Trade-Off
          </span>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
            {item.tradeoffs && item.tradeoffs.length > 0 ? (
              item.tradeoffs.map((t, tIdx) => (
                <p key={tIdx} className="text-xs text-amber-300 leading-snug">
                  • {t}
                </p>
              ))
            ) : (
              <p className="text-xs text-amber-300 leading-snug">
                Review specific brand tier and regional warranty coverage prior to purchase.
              </p>
            )}
          </div>
          {item.longevity && (
            <p className="text-[11px] text-[var(--text-dim)] pt-1">
              <span className="font-semibold text-[var(--text-muted)]">Longevity:</span> {item.longevity}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Alternative Recommendation Cards Grid
// ============================================================================
function AlternativeRecommendationCards({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Alternative Options & Specializations
        </h4>
        <span className="text-[11px] text-[var(--text-dim)]">
          {items.length} {items.length === 1 ? 'option' : 'options'}
        </span>
      </div>

      <div className={`grid gap-4 ${items.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
        {items.map((it) => (
          <div
            key={it.id}
            className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm hover:border-[var(--text-dim)] transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-2)] text-[var(--text-muted)] border border-[var(--border)]">
                    {it.badge}
                  </span>
                  <h4 className="text-base font-bold text-[var(--text)] leading-snug">
                    {it.name}
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
                    Best for: <span className="text-[var(--text)] font-medium">{it.bestFor}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-[var(--sell)]">
                    {it.price}
                  </div>
                  {it.budgetFit === 'within' && (
                    <span className="text-[10px] text-emerald-400 font-semibold block">Within budget</span>
                  )}
                  {it.budgetFit === 'slight_stretch' && (
                    <span className="text-[10px] text-amber-400 font-semibold block">Stretch</span>
                  )}
                </div>
              </div>

              {/* Strengths List */}
              <div className="space-y-1.5 pt-1">
                {it.strengths && it.strengths.slice(0, 2).map((s, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[var(--text)]">
                    <CheckIcon className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span className="leading-snug">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trade-off Pill & Longevity */}
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
              {it.tradeoffs && it.tradeoffs[0] && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 leading-tight">
                  <span className="font-semibold text-amber-400">Trade-off:</span> {it.tradeoffs[0]}
                </div>
              )}
              {it.longevity && (
                <div className="text-[10px] text-[var(--text-dim)] truncate" title={it.longevity}>
                  <span className="font-medium text-[var(--text-muted)]">Longevity:</span> {it.longevity}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Side-by-Side Comparison Table
// ============================================================================
function ProductComparisonTable({ items, budget }) {
  if (!items || items.length === 0) return null;

  // Build rows dynamically based on existing, supported data points
  const rows = [
    {
      label: 'Estimated Price',
      render: (item) => (
        <span className="font-bold text-[var(--sell)]">{item.price}</span>
      ),
    },
    {
      label: 'Best Suited For',
      render: (item) => (
        <span className="text-[var(--text)] leading-snug">{item.bestFor}</span>
      ),
    },
    {
      label: 'Primary Strength',
      render: (item) => (
        <span className="text-emerald-400 leading-snug">
          {item.strengths && item.strengths[0] ? item.strengths[0] : 'Balanced capability'}
        </span>
      ),
    },
    {
      label: 'Main Trade-off',
      render: (item) => (
        <span className="text-amber-300 leading-snug">
          {item.tradeoffs && item.tradeoffs[0] ? item.tradeoffs[0] : 'None noted'}
        </span>
      ),
    },
  ];

  // Optional: Battery row if any item has battery info
  if (items.some((i) => i.battery)) {
    rows.push({
      label: 'Battery & Charging',
      render: (item) => <span>{item.battery || 'Standard capacity'}</span>,
    });
  }

  // Optional: Performance row if any item has performance info
  if (items.some((i) => i.performance)) {
    rows.push({
      label: 'Performance / Chip',
      render: (item) => <span>{item.performance || 'Standard architecture'}</span>,
    });
  }

  // Optional: Camera / Display row if any item has camera info
  if (items.some((i) => i.camera)) {
    rows.push({
      label: 'Display & Optics',
      render: (item) => <span>{item.camera || 'Standard display/camera'}</span>,
    });
  }

  // Optional: Longevity row if any item has longevity info
  if (items.some((i) => i.longevity)) {
    rows.push({
      label: 'Software Longevity',
      render: (item) => <span>{item.longevity || 'Standard lifecycle'}</span>,
    });
  }

  // Budget Alignment row if budget was entered
  if (budget) {
    rows.push({
      label: 'Budget Alignment',
      render: (item) => {
        if (item.budgetFit === 'within') {
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Within Target
            </span>
          );
        } else if (item.budgetFit === 'slight_stretch') {
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Slight Stretch
            </span>
          );
        } else if (item.budgetFit === 'over_budget') {
          return (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
              Above Target
            </span>
          );
        }
        return <span className="text-[var(--text-dim)]">Variable</span>;
      },
    });
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Side-by-Side Comparison
        </h4>
        <span className="text-[11px] text-[var(--text-dim)]">Scroll horizontally on mobile →</span>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/60">
                <th className="py-3 px-4 font-semibold text-[var(--text-muted)] w-36 sm:w-44 sticky left-0 bg-[var(--surface-2)] z-10 border-r border-[var(--border)]">
                  Feature / Dimension
                </th>
                {items.map((item, idx) => (
                  <th key={item.id} className="py-3 px-4 font-bold text-[var(--text)] min-w-[190px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[var(--accent)] font-mono">0{idx + 1}</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[var(--surface-2)]/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-[var(--text-muted)] sticky left-0 bg-[var(--surface)] z-10 border-r border-[var(--border)]">
                    {row.label}
                  </td>
                  {items.map((item) => (
                    <td key={item.id} className="py-3 px-4 align-top">
                      {row.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Detailed Pros & Cons Breakdown
// ============================================================================
function ProsAndConsSection({ items }) {
  const [activeTab, setActiveTab] = useState(0);
  if (!items || items.length === 0) return null;
  const selectedItem = items[activeTab] || items[0];

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
          Pros & Cons Deep-Dive
        </h4>
        <span className="text-[11px] text-[var(--text-dim)]">Select option to inspect</span>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-5">
        {/* Product selector buttons */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-[var(--border-subtle)]">
          {items.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(idx)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all ${
                activeTab === idx
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {/* Selected Product Pros & Cons Two Columns */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* What you'll like */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <CheckIcon className="w-4 h-4 shrink-0" />
              <span>What you&apos;ll like</span>
            </div>
            <div className="space-y-2">
              {selectedItem.strengths && selectedItem.strengths.length > 0 ? (
                selectedItem.strengths.map((str, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2 text-xs text-[var(--text)]">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span className="leading-snug">{str}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Balances day-to-day speed and reliable build quality.</p>
              )}
            </div>
          </div>

          {/* What to consider */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <InfoIcon className="w-4 h-4 shrink-0" />
              <span>What to consider</span>
            </div>
            <div className="space-y-2">
              {selectedItem.tradeoffs && selectedItem.tradeoffs.length > 0 ? (
                selectedItem.tradeoffs.map((tro, tIdx) => (
                  <div key={tIdx} className="flex items-start gap-2 text-xs text-amber-300">
                    <span className="text-amber-400 font-bold">•</span>
                    <span className="leading-snug">{tro}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-amber-300">No major hardware limitations identified for this tier.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Subcomponent: Final Decision Helper
// ============================================================================
function DecisionHelper({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-[var(--surface-2)]/60 border border-[var(--border)] shadow-sm space-y-4">
      <div className="space-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
          Buying Decision Guide
        </span>
        <h4 className="text-base sm:text-lg font-bold text-[var(--text)]">
          Which one should you choose?
        </h4>
        <p className="text-xs text-[var(--text-muted)]">
          Quick clarity based on your personal hardware priorities:
        </p>
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)] text-xs flex items-start gap-3 shadow-xs"
          >
            <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] text-[var(--text)] font-mono text-[11px] flex items-center justify-center font-bold shrink-0 mt-0.5">
              {idx + 1}
            </div>
            <div className="space-y-0.5 flex-1">
              <span className="font-bold text-[var(--text)]">
                Choose {item.name}:
              </span>{' '}
              <span className="text-[var(--text-muted)]">
                If your main priority is {item.bestFor.toLowerCase()} and you want {item.strengths[0] ? item.strengths[0].toLowerCase() : 'solid long-term reliability'}.
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main UpgradeResultsView Component
// ============================================================================
export default function UpgradeResultsView({ advice, userContext, onReset }) {
  const [showRawText, setShowRawText] = useState(false);

  const { items, rawText, isDemoOrFallback } = useMemo(() => {
    return parseUpgradeAdvice(advice, userContext?.budget);
  }, [advice, userContext]);

  // If advice is in demo mode or unstructured fallback, render clean editorial fallback
  if (isDemoOrFallback || items.length === 0) {
    return (
      <div className="space-y-6">
        <RecommendationSummary userContext={userContext} itemCount={1} />

        <div className="p-6 sm:p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            <ShieldIcon className="w-4 h-4 text-[var(--accent)]" />
            <span>Advisory Assessment Notes</span>
          </div>
          <div className="text-sm leading-relaxed text-[var(--text)] whitespace-pre-wrap font-sans">
            {rawText || advice}
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-4">
          <span className="text-xs text-[var(--text-dim)]">Assessment complete</span>
          <button onClick={onReset} className="btn btn-outline text-xs">
            Start New Plan
          </button>
        </div>
      </div>
    );
  }

  const featuredItem = items[0];
  const alternativeItems = items.slice(1);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Recommendation Shortlist Header */}
      <RecommendationSummary userContext={userContext} itemCount={items.length} />

      {/* 2. Featured Recommendation Card */}
      <FeaturedRecommendation item={featuredItem} />

      {/* 3. Alternative Recommendations Grid */}
      {alternativeItems.length > 0 && (
        <AlternativeRecommendationCards items={alternativeItems} />
      )}

      {/* 4. Side-by-Side Comparison Table */}
      <ProductComparisonTable items={items} budget={userContext?.budget} />

      {/* 5. Detailed Pros & Cons */}
      <ProsAndConsSection items={items} />

      {/* 6. Decision Helper */}
      <DecisionHelper items={items} />

      {/* 7. Action Bar & Raw Advisory Transcript Drawer Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
        <button
          onClick={() => setShowRawText(!showRawText)}
          className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] underline flex items-center gap-1.5"
        >
          {showRawText ? 'Hide original advisory transcript' : 'View original advisory transcript'}
        </button>

        <button
          onClick={onReset}
          className="btn btn-outline text-xs px-4 py-2 hover:bg-[var(--surface-2)] transition-colors"
        >
          Start New Plan
        </button>
      </div>

      {/* Collapsible Raw AI Advisory for Complete Transparency */}
      {showRawText && (
        <div className="p-5 rounded-2xl bg-[var(--surface-2)]/70 border border-[var(--border)] text-xs text-[var(--text-muted)] space-y-2">
          <span className="font-bold text-[var(--text)] block uppercase tracking-wider text-[10px]">
            Original AI Generated Response
          </span>
          <p className="whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
            {rawText}
          </p>
        </div>
      )}
    </div>
  );
}
