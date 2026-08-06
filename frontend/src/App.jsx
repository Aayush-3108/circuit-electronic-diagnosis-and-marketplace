import { useState } from "react";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import StatusLegend from "./components/StatusLegend";
import AnalyzeForm from "./components/AnalyzeForm";
import ResultPanel from "./components/ResultPanel";
import UpgradeAdvisor from "./components/UpgradeAdvisor";
import RepairShopFinder from "./components/RepairShopFinder";
import ChatWidget from "./components/ChatWidget";
import Marketplace from "./components/Marketplace";
import CreateListingForm from "./components/CreateListingForm";
import ListingPage from "./components/ListingPage";
import Dashboard from "./components/Dashboard";
import Inbox from "./components/Inbox";
import Conversation from "./components/Conversation";
import AuthModal from "./components/AuthModal";

export default function App() {
  const [view, setView] = useState("landing");
  const [result, setResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [lastDeviceMeta, setLastDeviceMeta] = useState({ deviceType: "phone" });
  const [showAuth, setShowAuth] = useState(false);
  const [openListing, setOpenListing] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [marketplaceKey, setMarketplaceKey] = useState(0);

  function handleResult(res, meta, file) {
    setResult(res);
    setLastDeviceMeta(meta);
    setImageFile(file || null);
  }

  function resetAnalysis() { setResult(null); setImageFile(null); }

  function handleListingCreated() {
    setMarketplaceKey((k) => k + 1);
    setView("marketplace");
  }

  function handleListingChanged(updated) {
    if (!updated) {
      setOpenListing(null);
      setView("marketplace");
    } else {
      setOpenListing(updated);
    }
    setMarketplaceKey((k) => k + 1);
  }

  function handleOpenListing(l) {
    setOpenListing(l);
    setView("listing_page");
  }

  function handleStartChat(conversation) {
    setActiveConversation(conversation);
    setView("chat");
  }

  function navigate(v) {
    setView(v);
    if (v !== "analyze") resetAnalysis();
  }

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <div className="min-h-screen bg-[var(--bg)]">
        <Nav view={view} setView={navigate} onShowAuth={() => setShowAuth(true)} />

        {view === "landing" && (
          <>
            <Hero onStart={() => navigate("analyze")} />
            <StatusLegend />
          </>
        )}

        {view === "analyze" && (
          <section className="mx-auto max-w-5xl px-5 py-14">
            <p className="section-label mb-2">Diagnostic Tool</p>
            <h1 className="text-3xl font-bold mb-2 text-[var(--text)]">Analyze your device</h1>
            <p className="text-sm text-[var(--text-muted)] mb-10">
              Upload photos and fill in the details to get a sell, repair, recycle or upgrade recommendation.
            </p>
            {!result && <AnalyzeForm onResult={handleResult} />}
            {result && (
              <ResultPanel
                result={result}
                meta={lastDeviceMeta}
                imageFile={imageFile}
                onReset={resetAnalysis}
                onGoUpgrade={() => { resetAnalysis(); navigate("upgrade"); }}
                onGoSell={() => { resetAnalysis(); navigate("sell"); }}
                onGoShops={() => { resetAnalysis(); navigate("shops"); }}
              />
            )}
          </section>
        )}

        {view === "dashboard" && <Dashboard onNavigate={navigate} />}

        {view === "marketplace" && (
          <Marketplace
            key={marketplaceKey}
            onOpenListing={handleOpenListing}
            onSell={() => navigate("sell")}
          />
        )}

        {view === "sell" && (
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

        {view === "listing_page" && openListing && (
          <section className="mx-auto max-w-4xl px-5 py-14">
            <ListingPage
              listing={openListing}
              onClose={() => navigate("marketplace")}
              onChanged={handleListingChanged}
              onChatStarted={handleStartChat}
            />
          </section>
        )}

        {view === "inbox" && (
          <section className="mx-auto max-w-4xl px-5 py-14">
            <Inbox onOpenChat={handleStartChat} />
          </section>
        )}

        {view === "chat" && activeConversation && (
          <section className="mx-auto max-w-4xl px-5 py-6 h-[80vh] flex flex-col">
            <Conversation
              conversation={activeConversation}
              onBack={() => navigate("inbox")}
            />
          </section>
        )}

        {view === "upgrade" && (
          <section className="mx-auto max-w-3xl px-5 py-14">
            <UpgradeAdvisor prefillDeviceType={lastDeviceMeta.deviceType} />
          </section>
        )}

        {view === "shops" && (
          <section className="mx-auto max-w-4xl px-5 py-14">
            <RepairShopFinder />
          </section>
        )}

        <footer className="border-t border-[var(--border)] mt-16">
          <div className="mx-auto max-w-6xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-[var(--text-dim)]">Circuit - college capstone project</p>
            <p className="text-xs text-[var(--text-dim)]">React . FastAPI . YOLOv8 . Firebase . Cloudinary - all free-tier</p>
          </div>
        </footer>

        <ChatWidget />
      </div>
    </>
  );
}
