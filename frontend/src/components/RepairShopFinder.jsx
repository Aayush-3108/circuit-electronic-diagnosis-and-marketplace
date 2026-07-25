import { useState, useEffect, useMemo } from 'react';
import { getRepairShops } from '../api';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom inline SVG Leaflet markers with warm theme colors
const createCustomIcon = (bgColor, textColor, char = '📍') => {
  return L.divIcon({
    html: `
      <div style="
        background: ${bgColor};
        color: ${textColor};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #FEFDF9;
        box-shadow: 0 4px 12px rgba(28, 26, 23, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      " class="leaflet-marker-hover">
        ${char}
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, 14, { animate: true });
    }
  }, [center, map]);
  return null;
}

const CITIES = [
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
];

export default function RepairShopFinder() {
  const [shops, setShops] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [activeShop, setActiveShop] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  const userIcon = useMemo(() => createCustomIcon('#059669', '#FFFFFF', '📍'), []);
  const shopIcon = useMemo(() => createCustomIcon('#EA580C', '#FFFFFF', '🏪'), []);
  const activeShopIcon = useMemo(() => createCustomIcon('#1D4ED8', '#FFFFFF', '⭐'), []);

  async function fetchShops(lat, lng, radius) {
    setError(null);
    setLoading(true);
    setUserCoords([lat, lng]);
    try {
      const results = await getRepairShops({ lat, lng, radiusKm: radius });
      setShops(results);
      if (results && results.length > 0) {
        setActiveShop(results[0]);
      }
    } catch (err) {
      setError(err.message || 'Unable to load repair shops. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  }

  function handleLocate() {
    if (!navigator.geolocation) {
      fetchShops(12.9716, 77.5946, radiusKm);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchShops(pos.coords.latitude, pos.coords.longitude, radiusKm),
      () => {
        setError('Location access denied. Showing nearby centers for Bangalore.');
        fetchShops(12.9716, 77.5946, radiusKm);
      }
    );
  }

  async function handleCitySearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'CircuitApp/1.0' } }
      );
      const data = await resp.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        fetchShops(lat, lng, radiusKm);
      } else {
        setError(`No coordinates found for "${searchQuery}". Try a major city or pincode.`);
        setLoading(false);
      }
    } catch {
      setError('Search failed. Select a city from the shortcuts below.');
      setLoading(false);
    }
  }

  useEffect(() => {
    handleLocate();
  }, []);

  const centerCoords = userCoords || [12.9716, 77.5946];

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              Verified Repair Network
            </p>
            <h1 className="text-2xl font-bold text-[var(--text)]">Nearby Electronics Repair Shops</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)] font-medium">Search Radius:</span>
            <select
              value={radiusKm}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRadiusKm(r);
                if (userCoords) fetchShops(userCoords[0], userCoords[1], r);
              }}
              className="input-field text-xs py-1 px-3 border border-[var(--border)] rounded-lg bg-[var(--surface-2)] text-[var(--text)] font-semibold"
            >
              <option value={3}>3 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
            </select>
          </div>
        </div>

        {/* Controls & Search bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleCitySearch} className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search area, city or pincode (e.g. Indiranagar, Mumbai 400001)…"
              className="input-field text-xs flex-1"
            />
            <button type="submit" disabled={loading} className="btn btn-primary text-xs shrink-0">
              Search
            </button>
          </form>
          <button
            onClick={handleLocate}
            disabled={loading}
            className="btn btn-warm text-xs shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>📍</span> {loading ? 'Locating…' : 'Use My GPS Location'}
          </button>
        </div>

        {/* City Shortcuts */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[var(--text-dim)] font-medium">Quick Cities:</span>
          {CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => fetchShops(c.lat, c.lng, radiusKm)}
              disabled={loading}
              className={`px-3 py-1 rounded-full border text-xs transition-all ${
                userCoords && Math.abs(userCoords[0] - c.lat) < 0.1
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)] font-bold'
                  : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] hover:border-[var(--text)] hover:text-[var(--text)]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--repair)] bg-[var(--repair-dim)] px-4 py-2.5 text-xs text-[var(--repair)] font-medium">
            {error}
          </div>
        )}
      </div>

      {/* Main Map & Shop List Layout */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Map */}
        <div className="lg:col-span-7 card p-2 space-y-3">
          <div className="h-[460px] rounded-xl overflow-hidden relative border border-[var(--border)]">
            <MapContainer
              center={centerCoords}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapRecenter center={userCoords} />

              {/* User GPS Marker */}
              {userCoords && (
                <Marker position={userCoords} icon={userIcon}>
                  <Popup>
                    <div className="text-xs font-semibold text-gray-800">Your Search Location</div>
                  </Popup>
                </Marker>
              )}

              {/* Repair Shop Markers */}
              {shops &&
                shops.map((shop, i) => {
                  const isActive = activeShop?.name === shop.name;
                  return (
                    <Marker
                      key={i}
                      position={[shop.latitude, shop.longitude]}
                      icon={isActive ? activeShopIcon : shopIcon}
                      eventHandlers={{ click: () => setActiveShop(shop) }}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 p-1">
                          <p className="font-bold text-gray-900">{shop.name}</p>
                          <p className="text-gray-600">{shop.address}</p>
                          <p className="text-amber-600 font-semibold">★ {shop.rating} rating</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
          <div className="px-3 py-1.5 flex justify-between items-center text-[10px] text-[var(--text-dim)] font-medium">
            <span>● Green Pin: Your Location</span>
            <span>● Orange Pin: Repair Shop</span>
            <span>● Blue Pin: Selected Center</span>
          </div>
        </div>

        {/* Right: Shop Cards & Directions Panel */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Shops Nearby ({shops ? shops.length : 0})
            </p>
            {userCoords && (
              <span className="text-[10px] text-[var(--text-dim)] font-mono">
                {userCoords[0].toFixed(3)}°, {userCoords[1].toFixed(3)}°
              </span>
            )}
          </div>

          <div className="max-h-[460px] overflow-y-auto space-y-3 pr-1">
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-24 rounded-xl bg-[var(--surface-2)] animate-pulse" />
                ))}
              </div>
            )}

            {!loading && shops && shops.length === 0 && (
              <div className="card p-6 text-center space-y-2">
                <p className="text-2xl">🏪</p>
                <p className="text-xs font-semibold text-[var(--text)]">No shops found in {radiusKm}km radius</p>
                <p className="text-[10px] text-[var(--text-muted)]">Try increasing search radius or picking a city above.</p>
              </div>
            )}

            {!loading &&
              shops &&
              shops.map((shop, i) => {
                const isActive = activeShop?.name === shop.name;
                const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${shop.latitude},${shop.longitude}`;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveShop(shop)}
                    className={`card p-4 space-y-3 cursor-pointer transition-all border ${
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--surface)] shadow-md ring-1 ring-[var(--accent)]/30'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text)] leading-snug">{shop.name}</h4>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{shop.address}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--repair)] bg-[var(--repair-dim)] px-2 py-0.5 rounded-md border border-[var(--repair)]/20">
                          ★ {shop.rating}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/60 text-xs">
                      {shop.distance_km !== undefined ? (
                        <span className="font-semibold text-[var(--accent)]">
                          {shop.distance_km} km away
                        </span>
                      ) : (
                        <span className="text-[var(--text-dim)]">Nearby</span>
                      )}

                      <a
                        href={gmapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-outline text-[11px] py-1 px-3 flex items-center gap-1 hover:bg-[var(--accent)] hover:text-white"
                      >
                        Get Directions ↗
                      </a>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
