import { useState } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import StatusLegend from './components/StatusLegend';
import TraceDivider from './components/TraceDivider';
import AnalyzeForm from './components/AnalyzeForm';
import ResultPanel from './components/ResultPanel';
import UpgradeAdvisor from './components/UpgradeAdvisor';
import RepairShopFinder from './components/RepairShopFinder';
import ChatWidget from './components/ChatWidget';
import Marketplace from './components/Marketplace';
import CreateListingForm from './components/CreateListingForm';
import ListingDetail from './components/ListingDetail';
import Dashboard from './components/Dashboard';

export default function App() {
  const [view, setView] = useState('landing');
  const [result, setResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [lastDeviceMeta, setLastDeviceMeta] = useState({ deviceType: 'phone' });
  const [openListing, setOpenListing] = useState(null);
  const [marketplaceKey, setMarketplaceKey] = useState(0);

  function handleResult(res, meta, file) {
    setResult(res);
    setLastDeviceMeta(meta);
    setImageFile(file || null);
  }

  function resetAnalysis() { setResult(null); setImageFile(null); }

  function handleListingCreated() {
    setMarketplaceKey((k) => k + 1);
    setView('marketplace');
  }

  function handleListingChanged(updated) {
    setOpenListing(updated);
    setMarketplaceKey((k) => k + 1);
  }

  function navigate(v) {
    setView(v);
    if (v !== 'analyze') resetAnalysis();
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav view={view} setView={navigate} />

      {/* ── Landing ─────────────────────────────────────────────────── */}
      {view === 'landing' && (
        <>
          <Hero onStart={() => navigate('analyze')} />
          <StatusLegend />
        </>
      )}

      {/* ── Diagnose ────────────────────────────────────────────────── */}
      {view === 'analyze' && (
        <section className="mx-auto max-w-5xl px-5 py-14">
          <p className="section-label mb-2">Diagnostic Tool</p>
          <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">Analyze your device</h1>
          <p className="text-sm text-[var(--text-muted)] mb-10">Upload photos and fill in the details — we'll tell you whether to sell, repair, recycle, or upgrade.</p>
          {!result && <AnalyzeForm onResult={handleResult} />}
          {result && (
            <ResultPanel
              result={result}
              imageFile={imageFile}
              onReset={resetAnalysis}
              onGoUpgrade={() => { resetAnalysis(); navigate('upgrade'); }}
              onGoSell={() => { resetAnalysis(); navigate('sell'); }}
              onGoShops={() => { resetAnalysis(); navigate('shops'); }}
            />
          )}
        </section>
      )}

      {/* ── Dashboard ───────────────────────────────────────────────── */}
      {view === 'dashboard' && (
        <Dashboard onNavigate={navigate} />
      )}

      {/* ── Marketplace browse ──────────────────────────────────────── */}
      {view === 'marketplace' && (
        <Marketplace
          key={marketplaceKey}
          onOpenListing={setOpenListing}
          onSell={() => navigate('sell')}
        />
      )}

      {/* ── Create listing ──────────────────────────────────────────── */}
      {view === 'sell' && (
        <section className="mx-auto max-w-3xl px-5 py-14">
          <p className="section-label mb-2">List it</p>
          <h1 className="text-3xl font-bold mb-10 text-[var(--text)]">
            Sell the whole device or its parts
          </h1>
          <CreateListingForm
            prefill={{ deviceType: lastDeviceMeta.deviceType }}
            onCreated={handleListingCreated}
          />
        </section>
      )}

      {/* ── Listing detail modal ─────────────────────────────────────── */}
      {openListing && (
        <ListingDetail
          listing={openListing}
          onClose={() => setOpenListing(null)}
          onChanged={handleListingChanged}
        />
      )}

      {/* ── Upgrade advisor ─────────────────────────────────────────── */}
      {view === 'upgrade' && (
        <section className="mx-auto max-w-3xl px-5 py-14">
          <UpgradeAdvisor prefillDeviceType={lastDeviceMeta.deviceType} />
        </section>
      )}

      {/* ── Repair shops ────────────────────────────────────────────── */}
      {view === 'shops' && (
        <section className="mx-auto max-w-4xl px-5 py-14">
          <RepairShopFinder />
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border)] mt-16">
        <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-dim)]">
            Circuit — college capstone project
          </p>
          <p className="text-xs text-[var(--text-dim)]">
            React · FastAPI · YOLOv8 · Firebase · Cloudinary — all free-tier
          </p>
        </div>
      </footer>

      <ChatWidget />
    </div>
  );
}
