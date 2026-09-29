import { useState, useEffect } from "react";
import Nav from "./components/Nav";
import FrontPage from "./components/FrontPage";
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
import { useAuth } from "./context/AuthContext";
import { CircuitIcon } from "./components/Icons";

export default function App() {
  const { user } = useAuth();
  const [view, setView] = useState("landing");
  const [result, setResult] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [lastDeviceMeta, setLastDeviceMeta] = useState({ deviceType: "phone" });
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [openListing, setOpenListing] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [marketplaceKey, setMarketplaceKey] = useState(0);

  // If user logs in while on landing, redirect to the main diagnose tool
  useEffect(() => {
    if (user && view === "landing") {
      setView("analyze");
    } else if (!user && view !== "landing") {
      setView("landing");
    }
  }, [user]);

  function openAuth(mode = "login") {
    setAuthMode(mode);
    setShowAuth(true);
  }

  function handleResult(res, meta, file) {
    setResult(res);
    setLastDeviceMeta(meta);
    setImageFile(file || null);
  }

  function resetAnalysis() {
    setResult(null);
    setImageFile(null);
  }

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
    if (!user && v !== "landing") {
      openAuth("signup");
      return;
    }
    setView(v);
    if (v !== "analyze") resetAnalysis();
  }

  return (
    <>
      {showAuth && (
        <AuthModal
          initialMode={authMode}
          onClose={() => setShowAuth(false)}
        />
      )}

      <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-between">
        <div>
          <Nav
            view={view}
            setView={navigate}
            onShowAuth={(mode) => openAuth(mode || "login")}
          />

          {/* Unauthenticated Landing / Creative Front Page */}
          {!user && (
            <FrontPage
              onSignUp={() => openAuth("signup")}
              onLogIn={() => openAuth("login")}
            />
          )}

          {/* Authenticated Application Experience */}
          {user && (
            <>
              {view === "analyze" && (
                <section className="mx-auto max-w-5xl px-5 py-12">
                  <div className="mb-8">
                    <span className="section-label">Device Diagnostics</span>
                    <h1 className="text-3xl font-bold mt-1 text-[var(--text)]">
                      Condition Assessment
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Upload clear photos and provide device details to discover whether to repair, sell for parts, or recycle.
                    </p>
                  </div>
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
                <section className="mx-auto max-w-3xl px-5 py-12">
                  <div className="mb-8">
                    <span className="section-label">Marketplace Listing</span>
                    <h1 className="text-3xl font-bold mt-1 text-[var(--text)]">
                      List a Device or Salvaged Parts
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      Create an active listing for buyers looking for refurbished hardware or donor components.
                    </p>
                  </div>
                  <CreateListingForm
                    prefill={{ deviceType: lastDeviceMeta.deviceType }}
                    onCreated={handleListingCreated}
                  />
                </section>
              )}

              {view === "listing_page" && openListing && (
                <section className="mx-auto max-w-4xl px-5 py-12">
                  <ListingPage
                    listing={openListing}
                    onClose={() => navigate("marketplace")}
                    onChanged={handleListingChanged}
                    onChatStarted={handleStartChat}
                  />
                </section>
              )}

              {view === "inbox" && (
                <section className="mx-auto max-w-4xl px-5 py-12">
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
                <section className="mx-auto max-w-3xl px-5 py-12">
                  <UpgradeAdvisor prefillDeviceType={lastDeviceMeta.deviceType} />
                </section>
              )}

              {view === "shops" && (
                <section className="mx-auto max-w-4xl px-5 py-12">
                  <RepairShopFinder />
                </section>
              )}
            </>
          )}
        </div>

        <footer className="border-t border-[var(--border)] mt-16 bg-[var(--surface)]">
          <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CircuitIcon className="w-5 h-5 text-[var(--accent)]" />
              <span className="font-bold text-sm tracking-tight text-[var(--text)]">ReCircuit</span>
              <span className="text-xs text-[var(--text-dim)]">· Sustainable Electronics Platform</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Diagnose · Trade · Upgrade
            </p>
          </div>
        </footer>

        <ChatWidget />
      </div>
    </>
  );
}
