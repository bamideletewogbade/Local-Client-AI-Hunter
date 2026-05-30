import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Sparkles, Building2, Globe, Loader2,
  Check, Plus, Map, ChevronDown, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, LeadSource } from '../types';
import MapView from './MapView';
import AgentHandoffPipeline from './AgentHandoffPipeline';

interface DiscoveryEngineProps {
  onSaveLead: (lead: Lead) => Promise<boolean>;
  savedLeadNames: string[];
  onInspectLead: (lead: Lead) => void;
  crmLeads: Lead[];
  activeLeadId?: string;
}

export const ALL_CITIES = [
  // Africa
  'Accra', 'Kumasi', 'Lagos', 'Abuja', 'Nairobi', 'Cape Town', 'Johannesburg',
  'Dar es Salaam', 'Kampala', 'Kigali', 'Addis Ababa', 'Cairo', 'Casablanca',
  // Middle East
  'Dubai', 'Doha', 'Riyadh',
  // North America
  'New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Houston',
  'Seattle', 'Boston', 'Denver', 'Toronto', 'Vancouver', 'Montreal',
  // Europe
  'London', 'Manchester', 'Birmingham', 'Liverpool', 'Edinburgh',
  'Paris', 'Berlin', 'Munich', 'Madrid', 'Barcelona', 'Rome', 'Milan',
  'Amsterdam', 'Brussels',
  // Asia Pacific
  'Sydney', 'Melbourne', 'Singapore', 'Tokyo', 'Mumbai', 'Delhi',
];

export const COUNTRIES_AND_CITIES = [
  { code: 'GH', name: 'Ghana 🇬🇭', cities: ['Accra', 'Kumasi'] },
  { code: 'NG', name: 'Nigeria 🇳🇬', cities: ['Lagos', 'Abuja'] },
  { code: 'KE', name: 'Kenya 🇰🇪', cities: ['Nairobi'] },
  { code: 'ZA', name: 'South Africa 🇿🇦', cities: ['Cape Town', 'Johannesburg'] },
  { code: 'TZ', name: 'Tanzania 🇹🇿', cities: ['Dar es Salaam'] },
  { code: 'UG', name: 'Uganda 🇺🇬', cities: ['Kampala'] },
  { code: 'RW', name: 'Rwanda 🇷🇼', cities: ['Kigali'] },
  { code: 'ET', name: 'Ethiopia 🇪🇹', cities: ['Addis Ababa'] },
  { code: 'EG', name: 'Egypt 🇪🇬', cities: ['Cairo'] },
  { code: 'MA', name: 'Morocco 🇲🇦', cities: ['Casablanca'] },
  { code: 'AE', name: 'UAE 🇦🇪', cities: ['Dubai'] },
  { code: 'QA', name: 'Qatar 🇶🇦', cities: ['Doha'] },
  { code: 'SA', name: 'Saudi Arabia 🇸🇦', cities: ['Riyadh'] },
  { code: 'GB', name: 'United Kingdom 🇬🇧', cities: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Edinburgh'] },
  { code: 'US', name: 'United States 🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'San Francisco', 'Miami', 'Houston', 'Seattle', 'Boston', 'Denver'] },
  { code: 'CA', name: 'Canada 🇨🇦', cities: ['Toronto', 'Vancouver', 'Montreal'] },
  { code: 'FR', name: 'France 🇫🇷', cities: ['Paris'] },
  { code: 'DE', name: 'Germany 🇩🇪', cities: ['Berlin', 'Munich'] },
  { code: 'ES', name: 'Spain 🇪🇸', cities: ['Madrid', 'Barcelona'] },
  { code: 'IT', name: 'Italy 🇮🇹', cities: ['Rome', 'Milan'] },
  { code: 'NL', name: 'Netherlands 🇳🇱', cities: ['Amsterdam'] },
  { code: 'BE', name: 'Belgium 🇧🇪', cities: ['Brussels'] },
  { code: 'AU', name: 'Australia 🇦🇺', cities: ['Sydney', 'Melbourne'] },
  { code: 'SG', name: 'Singapore 🇸🇬', cities: ['Singapore'] },
  { code: 'JP', name: 'Japan 🇯🇵', cities: ['Tokyo'] },
  { code: 'IN', name: 'India 🇮🇳', cities: ['Mumbai', 'Delhi'] },
];

const QUICK_PRESETS = [
  { label: 'Hotels & Lodging', query: 'Hotel', icon: '🏨' },
  { label: 'Restaurants & Cafes', query: 'Restaurant', icon: '🍽️' },
  { label: 'Gyms & Fitness', query: 'Gym', icon: '🏋️' },
  { label: 'Medical & Dental', query: 'Clinic', icon: '🏥' },
  { label: 'Schools & Education', query: 'School', icon: '🏫' },
  { label: 'Salons & Spas', query: 'Salon', icon: '💇' },
];

const NICHE_AUTOCOMPLETE = [
  'Dentist', 'Cafe', 'Restaurant', 'Barber', 'Salon', 'Bakery',
  'Hotel', 'School', 'Hospital', 'Gym', 'Pharmacy', 'Clinic',
  'Pizza', 'Laundry', 'Auto Repair', 'Plumber', 'Electrician',
  'Lawyer', 'Real Estate', 'Daycare', 'Pet Store', 'Supermarket',
  'Boutique', 'Spa', 'Car Wash', 'Church', 'Bank', 'Insurance'
];

export default function DiscoveryEngine({
  onSaveLead, savedLeadNames, onInspectLead, crmLeads, activeLeadId
}: DiscoveryEngineProps) {
  const [query, setQuery] = useState('Dental Clinic');
  const [location, setLocation] = useState('Accra');
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<Lead[]>([]);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);

  const triggerSearch = async (targetQuery?: string, targetLoc?: string) => {
    const q = targetQuery || query;
    const l = targetLoc !== undefined ? targetLoc : location;

    setIsSearching(true);
    setSearchNotice(null);
    setHasSearched(true);
    setShowPipeline(false);
    setPipelineComplete(false);
    try {
      const response = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, location: l, source: 'ai_search' as LeadSource }),
      });
      if (!response.ok) throw new Error("Search gateway error.");
      const data = await response.json();
      setDiscoveredLeads(data.leads || []);
      if (data.isFallback) {
        localStorage.setItem('hunter_ai_fallback', 'true');
        window.dispatchEvent(new Event('storage'));
      }
      if (data.notice) {
        setSearchNotice(data.notice);
      }
    } catch (err) {
      console.error("Discovery Search fail:", err);
    } finally {
      setIsSearching(false);
      // Auto-show the handoff pipeline when search completes with results
      setTimeout(() => setShowPipeline(true), 400);
    }
  };

  // Initial search on mount
  useEffect(() => {
    const prefillNiche = localStorage.getItem('hunter_prefill_niche');
    const prefillCity = localStorage.getItem('hunter_prefill_city');

    let targetQ = 'Dental Clinic';
    let targetL = 'Accra';

    if (prefillNiche) {
      targetQ = prefillNiche;
      setQuery(prefillNiche);
      localStorage.removeItem('hunter_prefill_niche');
    }
    if (prefillCity) {
      targetL = prefillCity;
      setLocation(prefillCity);
      localStorage.removeItem('hunter_prefill_city');
    }

    triggerSearch(targetQ, targetL);
  }, []);

  const handleSaveToPipeline = async (ld: Lead) => {
    setSavingId(ld.id);
    const success = await onSaveLead(ld);
    if (success) {
      setDiscoveredLeads(prev => prev.map(item => {
        if (item.name === ld.name && item.address === ld.address) {
          return { ...item, isSaved: true };
        }
        return item;
      }));
    }
    setSavingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !location.trim()) return;
    triggerSearch();
  };

  return (
    <div className="space-y-6 animate-fade-in dark-scrollbar">
      {/* ════════════════════════════════════════ */}
      {/* HERO SEARCH SECTION — Cinematic dark gradient hero */}
      {/* ════════════════════════════════════════ */}
      <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900 via-[#0C0C0E] to-slate-950 shadow-xl shadow-blue-600/5">
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none transition-opacity duration-500 group-hover:opacity-[0.08]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
        {/* Ambient glow orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none animate-shimmer" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 shadow-lg shadow-blue-600/20 ring-1 ring-blue-400/20">
              <Search className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-white">Lead Scanner</h2>
              <p className="text-[10px] text-zinc-500 font-mono">Discover local businesses with weak digital presence</p>
            </div>
          </div>

          {/* Search form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {/* Keyword input */}
              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono mb-1.5">
                  Business Type
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    list="niche-autocomplete"
                    placeholder="e.g. Dental Clinic, Gym, Restaurant..."
                    className="w-full bg-[#09090B] border border-zinc-800 text-zinc-200 placeholder-zinc-600 rounded-xl pl-10 pr-3 py-2.5 text-xs outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <datalist id="niche-autocomplete">
                    {NICHE_AUTOCOMPLETE.map(n => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Location input */}
              <div className="sm:col-span-2 relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono mb-1.5">
                  City / Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    list="city-autocomplete"
                    placeholder="e.g. Accra, London, Lagos..."
                    className="w-full bg-[#09090B] border border-zinc-800 text-zinc-200 placeholder-zinc-600 rounded-xl pl-10 pr-3 py-2.5 text-xs outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <datalist id="city-autocomplete">
                    {ALL_CITIES.map(city => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Submit button */}
              <div className="sm:col-span-1 flex flex-col justify-end">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 font-mono mb-1.5 sm:invisible">
                  &nbsp;
                </label>
                <button
                  type="submit"
                  disabled={isSearching || !query.trim() || !location.trim()}
                  className="w-full h-[38px] flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-bold text-xs transition-all shadow-lg shadow-blue-600/15 disabled:shadow-none cursor-pointer active:scale-[0.98]"
                >
                  {isSearching ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick preset chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 font-mono mr-1 shrink-0">
                Quick:
              </span>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.query}
                  type="button"
                  onClick={() => {
                    setQuery(preset.query);
                    triggerSearch(preset.query, location);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9.5px] font-semibold border transition-all cursor-pointer ${
                    query.toLowerCase() === preset.query.toLowerCase()
                      ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Map toggle — compact button */}
      {discoveredLeads.length > 0 && !isSearching && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">
              <span className="text-white font-bold">{discoveredLeads.length}</span> leads found
            </span>
          </div>
          <button
            onClick={() => setShowMap(!showMap)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
              showMap
                ? 'bg-blue-600/15 border-blue-500/30 text-blue-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <Map className="h-3 w-3" />
            <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
          </button>
        </div>
      )}

      {/* Map view */}
      <AnimatePresence>
        {showMap && discoveredLeads.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: 'auto', opacity: 1, marginBottom: 0 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="origin-top overflow-hidden rounded-xl border border-zinc-800"
          >
            <MapView leads={discoveredLeads} onSelectLead={onInspectLead} activeLeadId={activeLeadId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Handoff Pipeline — shown after search completes */}
      <AnimatePresence>
        {showPipeline && !isSearching && hasSearched && discoveredLeads.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="origin-top overflow-hidden"
          >
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <button
                onClick={() => setShowPipeline(false)}
                className="flex items-center gap-2 mb-3 w-full text-left"
              >
                <div className="flex items-center gap-2 flex-1">
                  <Activity className="h-4 w-4 text-blue-400" />
                  <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-300">
                    Agent Pipeline Flow
                  </span>
                  {pipelineComplete && (
                    <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Complete
                    </span>
                  )}
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-600 rotate-180" />
              </button>

              <AgentHandoffPipeline
                autoRun={showPipeline}
                leads={discoveredLeads}
                searchQuery={query}
                searchLocation={location}
                onPipelineComplete={() => setPipelineComplete(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search notice */}
      {searchNotice && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border border-blue-500/20 px-4 py-3 text-xs text-blue-200 font-medium backdrop-blur-sm"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
          </span>
          <p className="leading-relaxed">{searchNotice}</p>
        </motion.div>
      )}

      {/* ════════════════════════════════════════ */}
      {/* RESULTS SECTION */}
      {/* ════════════════════════════════════════ */}
      
      {/* Loading state */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="relative mb-5">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            <div className="absolute -inset-3 rounded-full bg-blue-500/5 animate-ping" />
          </div>
          <h5 className="text-sm font-semibold text-zinc-200">Scanning for leads</h5>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Searching Google Maps for {query} in {location}...
          </p>
        </div>
      )}

      {/* Empty state (after search, no results) */}
      {!isSearching && hasSearched && discoveredLeads.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-zinc-600" />
          </div>
          <h5 className="text-sm font-semibold text-zinc-300">No leads found</h5>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Try a different business type or location. Broader keywords often yield more results.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['Hotel', 'Restaurant', 'Gym'].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setQuery(suggestion);
                  triggerSearch(suggestion, location);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-semibold hover:border-zinc-700 hover:text-zinc-200 transition-all cursor-pointer"
              >
                Try "{suggestion}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results grid */}
      {!isSearching && discoveredLeads.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-1"
        >
          {discoveredLeads.map((ld) => {
            const isSaved = savedLeadNames.includes(ld.name) || ld.isSaved;

            return (
              <motion.div
                layout
                key={ld.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="group relative rounded-xl border border-zinc-800/60 bg-[#0C0C0E]/60 p-4 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:bg-[#0C0C0E]/80 hover:shadow-xl hover:shadow-blue-600/10 hover:-translate-y-0.5 cinematic-card"
              >
                {/* Score badge — top right */}
                <div className={`absolute top-3 right-3 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                  ld.digitalPresenceScore < 40
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : ld.digitalPresenceScore < 60
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {ld.digitalPresenceScore}/100
                </div>

                {/* Card content */}
                <div className="space-y-2.5 pr-12">
                  <div>
                    <h4 className="text-xs font-bold text-white truncate" title={ld.name}>{ld.name}</h4>
                    <span className="text-[9.5px] text-zinc-500 font-mono block mt-0.5">{ld.category}</span>
                  </div>

                  <p className="text-[10.5px] text-zinc-400 font-sans line-clamp-2 leading-relaxed">
                    {ld.address}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {ld.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-[9px] rounded bg-[#161619] border border-zinc-800/80 px-1.5 py-px text-zinc-500 font-mono">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Website / NO WEBSITE */}
                  {ld.website ? (
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-emerald-500/70 shrink-0" />
                      <span className="text-[9.5px] text-zinc-500 truncate max-w-[140px]" title={ld.website}>
                        {ld.website.replace('http://', '').replace('https://', '').replace('www.', '')}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 border border-rose-500/25 rounded-md text-rose-300 text-[9px] font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse-glow">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                      <span>No Website</span>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="border-t border-zinc-800/60 mt-3 pt-3 flex items-center justify-between">
                  <button
                    onClick={() => onInspectLead(ld)}
                    className="text-[10px] font-semibold text-zinc-500 hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    Details
                  </button>

                  <button
                    onClick={() => handleSaveToPipeline(ld)}
                    disabled={isSaved || savingId === ld.id}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all border cursor-pointer ${
                      isSaved
                        ? 'bg-zinc-800/30 border-zinc-700/50 text-zinc-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 border-blue-600 text-white active:scale-95 shadow-sm shadow-blue-600/10'
                    }`}
                  >
                    {savingId === ld.id ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : isSaved ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <Plus className="h-2.5 w-2.5" />
                    )}
                    {isSaved ? 'Saved' : 'Save to CRM'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
