import { useState } from 'react';
import {
  DiagnoseIcon,
  MarketplaceIcon,
  UpgradeIcon,
  RecycleIcon,
  WrenchIcon,
  ArrowRightIcon,
  ShieldIcon,
  BoxIcon,
  CircuitIcon,
} from './Icons';

export default function FrontPage({ onSignUp, onLogIn }) {
  const [activeTab, setActiveTab] = useState('diagnose');

  const pillars = [
    {
      id: 'diagnose',
      title: 'Condition Assessment',
      label: 'Diagnostics',
      icon: DiagnoseIcon,
      tagline: 'Instant clarity on whether to fix, trade, or recycle.',
      description:
        'Upload snapshots and report basic hardware state. ReCircuit analyzes physical wear and operational integrity to calculate whether repair, market resale, or sustainable recycling delivers the best return.',
      benefits: [
        'Objective condition evaluation',
        'Transparent repair cost & recovery value estimates',
        'Direct link to local repair centers or marketplace salvage'
      ],
      preview: {
        badge: 'Assessment Complete',
        accent: 'var(--accent)',
        device: 'Smartphone / Laptop',
        metrics: [
          { label: 'Integrity', val: 'Chassis Wear' },
          { label: 'Recommended Path', val: 'Component Resale' },
          { label: 'Estimated Value', val: 'Recoverable' },
        ],
        action: 'Recommended action: List functional modular parts on marketplace'
      }
    },
    {
      id: 'marketplace',
      title: 'Circular Exchange',
      label: 'Marketplace',
      icon: MarketplaceIcon,
      tagline: 'Connect surplus hardware with those who need it.',
      description:
        'Avoid letting salvageable parts sit forgotten in drawers or landfills. List whole devices or individual functioning components—screens, memory chips, chassis modules—with direct peer messaging.',
      benefits: [
        'Dedicated ecosystem for whole units and harvested parts',
        'Built-in secure messaging between buyers and sellers',
        'Drastically lower e-waste through modular reuse'
      ],
      preview: {
        badge: 'Live Marketplace',
        accent: 'var(--sell)',
        device: 'Modular Hardware Listing',
        metrics: [
          { label: 'Unit', val: 'Display & Battery' },
          { label: 'Condition', val: 'Tested Functional' },
          { label: 'Impact', val: '0% Landfill' },
        ],
        action: 'Direct buyer inquiry: Instant chat enabled'
      }
    },
    {
      id: 'upgrade',
      title: 'Longevity Planning',
      label: 'Upgrade Advisor',
      icon: UpgradeIcon,
      tagline: 'Extend the performance lifespan of your current setup.',
      description:
        'Newer is not always necessary. Our compatibility engine analyzes current bottlenecks and points to cost-effective component upgrades and certified repair partners before you consider replacement.',
      benefits: [
        'Targeted performance bottleneck resolution',
        'Practical budget tiers vs cost of new replacement',
        'Curated network of verified local service centers'
      ],
      preview: {
        badge: 'Optimization Plan',
        accent: 'var(--upgrade)',
        device: 'Workstation / Notebook',
        metrics: [
          { label: 'Target', val: 'Speed & Storage' },
          { label: 'Path', val: 'Modular Upgrade' },
          { label: 'Longevity Boost', val: '+2-3 Years' },
        ],
        action: 'Estimated savings: Significant vs buying new'
      }
    }
  ];

  const currentPillar = pillars.find((p) => p.id === activeTab) || pillars[0];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-[var(--border)]">
        <div className="hero-glow" aria-hidden="true" />
        
        <div className="mx-auto max-w-6xl px-6 relative z-10">
          <div className="max-w-3xl space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--accent-dim)] border border-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">
              <CircuitIcon className="w-3.5 h-3.5" />
              <span>Sustainable Electronics Lifecycle Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--text)] leading-[1.12]">
              Give electronics a <span className="text-[var(--accent)]">second life.</span>
            </h1>

            <p className="text-base sm:text-xl text-[var(--text-muted)] leading-relaxed max-w-2xl">
              Turn unused, slowing, or damaged gadgets into real recovered value. ReCircuit helps you evaluate device condition, exchange working hardware, and discover smarter paths forward.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <button
                onClick={onSignUp}
                className="btn btn-primary text-sm font-semibold px-7 py-3.5 shadow-md hover:-translate-y-0.5 transition-transform"
              >
                Get Started
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onLogIn}
                className="btn btn-outline text-sm font-medium px-6 py-3.5"
              >
                Sign In to Account
              </button>
            </div>

            {/* Trust strip */}
            <div className="pt-8 grid grid-cols-3 gap-6 border-t border-[var(--border)] max-w-xl">
              <div>
                <p className="text-xl font-bold text-[var(--text)]">3-Way</p>
                <p className="text-xs text-[var(--text-muted)]">Repair, Trade, or Recycle</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text)]">Circular</p>
                <p className="text-xs text-[var(--text-muted)]">Verified Parts Exchange</p>
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--text)]">Eco-First</p>
                <p className="text-xs text-[var(--text-muted)]">Responsible Tech Lifecycle</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive 3-Pillar Experience ───────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="section-label">Core Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)]">
              Three pillars built for hardware longevity
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-muted)]">
              Explore how ReCircuit connects diagnostic evaluations, peer-to-peer exchanges, and upgrade paths.
            </p>
          </div>

          {/* Interactive Navigation Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] gap-1 shadow-inner">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                const isSelected = activeTab === pillar.id;
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setActiveTab(pillar.id)}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isSelected
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm border border-[var(--border)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{pillar.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Showcase Card */}
          <div className="card p-8 md:p-12 border border-[var(--border)] bg-[var(--surface-2)]/60">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              {/* Left explanation */}
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                    {currentPillar.title}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
                    {currentPillar.tagline}
                  </h3>
                </div>

                <p className="text-sm sm:text-base text-[var(--text-muted)] leading-relaxed">
                  {currentPillar.description}
                </p>

                <div className="space-y-3 pt-2">
                  {currentPillar.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-dim)] border border-[var(--accent)]/30 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                      </div>
                      <span className="text-sm font-medium text-[var(--text)]">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button
                    onClick={onSignUp}
                    className="btn btn-primary text-xs font-semibold py-2.5 px-5"
                  >
                    Try {currentPillar.label}
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-[var(--text-dim)]">Account required for full access</span>
                </div>
              </div>

              {/* Right interactive preview graphic */}
              <div className="lg:col-span-5">
                <div className="card p-6 bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-dim)] text-[var(--accent)]">
                      {currentPillar.preview.badge}
                    </span>
                    <span className="text-xs text-[var(--text-dim)] font-medium">
                      {currentPillar.preview.device}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {currentPillar.preview.metrics.map((m, i) => (
                      <div key={i} className="p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-center">
                        <p className="text-[10px] text-[var(--text-dim)] uppercase font-semibold">{m.label}</p>
                        <p className="text-xs font-bold text-[var(--text)] mt-1 truncate">{m.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                    <span>{currentPillar.preview.action}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Circular Lifecycle Process ────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="section-label">Sustainable Path</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)]">
              Closing the loop on electronics
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-muted)]">
              How ReCircuit guides every device toward its most responsible and economical outcome.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Inspect & Assess',
                desc: 'Upload visual condition and functional responses to get an immediate objective recommendation.',
                icon: DiagnoseIcon,
              },
              {
                step: '02',
                title: 'Decide the Outcome',
                desc: 'Choose from repair, salvageable part recovery, whole-device resale, or certified e-waste recycling.',
                icon: ShieldIcon,
              },
              {
                step: '03',
                title: 'Trade & Connect',
                desc: 'List working components on the marketplace or locate nearby certified repair workshops.',
                icon: MarketplaceIcon,
              },
              {
                step: '04',
                title: 'Extend Lifespan',
                desc: 'Maximize device longevity and minimize carbon footprint through purposeful hardware reuse.',
                icon: RecycleIcon,
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="card p-6 bg-[var(--surface)] border border-[var(--border)] relative space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--accent)] tracking-wider">{card.step}</span>
                    <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text)]">{card.title}</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bottom Call To Action ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-[var(--surface)] text-center">
        <div className="mx-auto max-w-4xl px-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)]">
            Ready to explore your hardware's full potential?
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-muted)] max-w-xl mx-auto">
            Create an account or sign in to access the diagnostic engine, hardware marketplace, and upgrade planner.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <button
              onClick={onSignUp}
              className="btn btn-primary text-sm font-semibold px-8 py-3.5"
            >
              Sign Up for ReCircuit
            </button>
            <button
              onClick={onLogIn}
              className="btn btn-outline text-sm font-medium px-8 py-3.5"
            >
              Log In
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
