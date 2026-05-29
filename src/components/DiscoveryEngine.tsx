import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Sparkles, Building2, Phone, Globe, Star, ArrowRight,
  Loader2, Check, Copy, Settings, Calendar, Award, Layout, Plus, CheckCircle, Map,
  Edit2, Trash2, RotateCcw, Navigation, MapPin as MapPinIcon, Facebook, Linkedin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, SearchQueryConfig, LeadSource } from '../types';
import MapView from './MapView';

interface DiscoveryEngineProps {
  onSaveLead: (lead: Lead) => Promise<boolean>;
  savedLeadNames: string[];
  onInspectLead: (lead: Lead) => void;
  crmLeads: Lead[];
  activeLeadId?: string;
}

const COUNTRIES_AND_CITIES = [
  {
    code: 'GH',
    name: 'Ghana 🇬🇭',
    cities: ['Accra', 'Kumasi']
  },
  {
    code: 'NG',
    name: 'Nigeria 🇳🇬',
    cities: ['Lagos']
  },
  {
    code: 'KE',
    name: 'Kenya 🇰🇪',
    cities: ['Nairobi']
  },
  {
    code: 'GB',
    name: 'United Kingdom 🇬🇧',
    cities: ['London']
  },
  {
    code: 'US',
    name: 'United States 🇺🇸',
    cities: ['New York']
  }
];

export default function DiscoveryEngine({ onSaveLead, savedLeadNames, onInspectLead, crmLeads, activeLeadId }: DiscoveryEngineProps) {
  const [query, setQuery] = useState('Dental Clinic');
  const [location, setLocation] = useState('Accra');
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState<Lead[]>([]);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  // Cascading Selector States
  const [selectedCountry, setSelectedCountry] = useState('GH');
  const [selectedCity, setSelectedCity] = useState('Accra');
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  
  // Persistent Custom Presets State
  const DEFAULT_PRESETS = [
    { label: '🏨 Hotels & Lodging', query: 'Hotels' },
    { label: '🏫 Schools & Academies', query: 'Schools' },
    { label: '🏥 Hospitals & Medical', query: 'Hospitals' },
    { label: '🏋️ Gyms & Fitness Centers', query: 'Gyms' }
  ];

  const [presets, setPresets] = useState<{ label: string; query: string }[]>(() => {
    try {
      const saved = localStorage.getItem('lead_target_presets_list');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse presets from localStorage", e);
    }
    return DEFAULT_PRESETS;
  });

  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [newPresetLabel, setNewPresetLabel] = useState('');
  const [newPresetQuery, setNewPresetQuery] = useState('');
  const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);
  const [editingPresetLabel, setEditingPresetLabel] = useState('');
  const [editingPresetQuery, setEditingPresetQuery] = useState('');

  const savePresetsToStorage = (updatedPresets: { label: string; query: string }[]) => {
    setPresets(updatedPresets);
    localStorage.setItem('lead_target_presets_list', JSON.stringify(updatedPresets));
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetLabel.trim() || !newPresetQuery.trim()) return;
    const updated = [...presets, { label: newPresetLabel.trim(), query: newPresetQuery.trim() }];
    savePresetsToStorage(updated);
    setNewPresetLabel('');
    setNewPresetQuery('');
  };

  const handleDeletePreset = (index: number) => {
    const updated = presets.filter((_, idx) => idx !== index);
    savePresetsToStorage(updated);
    if (editingPresetIdx === index) {
      setEditingPresetIdx(null);
    }
  };

  const handleStartEditPreset = (index: number) => {
    setEditingPresetIdx(index);
    setEditingPresetLabel(presets[index].label);
    setEditingPresetQuery(presets[index].query);
  };

  const handleSaveEditPreset = (index: number) => {
    if (!editingPresetLabel.trim() || !editingPresetQuery.trim()) return;
    const updated = [...presets];
    updated[index] = { label: editingPresetLabel.trim(), query: editingPresetQuery.trim() };
    savePresetsToStorage(updated);
    setEditingPresetIdx(null);
  };

  const handleResetPresets = () => {
    savePresetsToStorage(DEFAULT_PRESETS);
    setEditingPresetIdx(null);
  };

  const PRESET_CITIES = ['Accra', 'Lagos', 'London', 'Kumasi'];

  const triggerSearch = async (targetQuery?: string, targetLoc?: string) => {
    const q = targetQuery || query;
    const l = targetLoc !== undefined ? targetLoc : location;
    
    setIsSearching(true);
    setSearchNotice(null);
    try {
      const response = await fetch('/api/leads/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, location: l, source: searchSource }),
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
    }
  };

  // Perform initial search to show something beautiful on load
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
      if (prefillCity === 'Kumasi') {
        setSelectedCountry('GH');
        setSelectedCity('Kumasi');
      } else if (prefillCity === 'Lagos') {
        setSelectedCountry('NG');
        setSelectedCity('Lagos');
      } else if (prefillCity === 'London') {
        setSelectedCountry('GB');
        setSelectedCity('London');
      } else if (prefillCity === 'Accra') {
        setSelectedCountry('GH');
        setSelectedCity('Accra');
      } else {
        setIsCustomLocation(true);
      }
      localStorage.removeItem('hunter_prefill_city');
    }
    
    triggerSearch(targetQ, targetL);
  }, []);

  const [searchSource, setSearchSource] = useState<LeadSource>('ai_search');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Source labels and icons
  const sourceOptions: { value: LeadSource; label: string; icon: string }[] = [
    { value: 'ai_search', label: 'AI Search', icon: '🤖' },
    { value: 'google_maps', label: 'Google Maps', icon: '📍' },
    { value: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { value: 'facebook', label: 'Facebook', icon: '👍' }
  ];

  const getSourceLabel = (source?: LeadSource) => {
    const opt = sourceOptions.find(o => o.value === source);
    return opt || { label: 'AI Search', icon: '🤖' };
  };

  const handleSaveToPipeline = async (ld: Lead) => {
    setSavingId(ld.id);
    const success = await onSaveLead(ld);
    if (success) {
      // update localized tags in search output
      setDiscoveredLeads(prev => prev.map(item => {
        if (item.name === ld.name && item.address === ld.address) {
          return { ...item, isSaved: true };
        }
        return item;
      }));
    }
    setSavingId(null);
  };

  return (
    <div id="discovery-engine-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* Search Filter Controls Left */}
      <div className={`transition-all duration-500 ease-in-out ${showMap ? 'lg:col-span-4' : 'lg:col-span-3'} space-y-5`}>
        <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-950/80 border border-blue-900/30 text-blue-400">
              <Search className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-sans font-bold text-white">Target Lead Parameters</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Business Keyword</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Dental clinic, Gym, Bakery..."
                  className="w-full bg-[#09090B] border border-zinc-800 p-2.5 pl-9 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Target Location</label>
                <button
                  type="button"
                  onClick={() => {
                    const newMode = !isCustomLocation;
                    setIsCustomLocation(newMode);
                    if (newMode) {
                      // Set input to whatever is currently saved
                    } else {
                      // Reset to the cascading values
                      setLocation(selectedCity);
                    }
                  }}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                >
                  {isCustomLocation ? "Select Hub" : "Type Custom"}
                </button>
              </div>

              {isCustomLocation ? (
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Accra, Lagos, London..."
                    className="w-full bg-[#09090B] border border-zinc-800 p-2.5 pl-9 text-xs text-zinc-200 placeholder-zinc-500 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] text-zinc-300 font-medium block mb-0.5">Country</label>
                    <select
                      value={selectedCountry}
                      onChange={(e) => {
                        const code = e.target.value;
                        setSelectedCountry(code);
                        const match = COUNTRIES_AND_CITIES.find(c => c.code === code);
                        if (match && match.cities.length > 0) {
                          setSelectedCity(match.cities[0]);
                          setLocation(match.cities[0]);
                        }
                      }}
                      className="w-full bg-[#09090B] border border-zinc-805 text-zinc-300 rounded-lg text-xs p-2.5 outline-none focus:border-blue-550 cursor-pointer"
                    >
                      {COUNTRIES_AND_CITIES.map(c => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9.5px] text-zinc-300 font-medium block mb-0.5">City Hub</label>
                    <select
                      value={selectedCity}
                      onChange={(e) => {
                        setSelectedCity(e.target.value);
                        setLocation(e.target.value);
                      }}
                      className="w-full bg-[#09090B] border border-zinc-805 text-zinc-300 rounded-lg text-xs p-2.5 outline-none focus:border-blue-550 cursor-pointer"
                    >
                      {COUNTRIES_AND_CITIES.find(c => c.code === selectedCountry)?.cities.map(ct => (
                        <option key={ct} value={ct}>
                          {ct}
                        </option>
                      )) || <option>Accra</option>}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Source Selector */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Data Source</label>
              <div className="grid grid-cols-2 gap-1.5">
                {sourceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSearchSource(opt.value)}
                    className={`px-2 py-1.5 border rounded text-center text-[10px] transition-all cursor-pointer ${
                      searchSource === opt.value
                        ? 'bg-blue-950/40 text-blue-400 border-blue-900/40 font-semibold'
                        : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                    }`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => triggerSearch()}
              disabled={isSearching}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs py-2.5 shadow-lg shadow-blue-900/10 cursor-pointer transition-all active:scale-[0.99]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Discovering Prospects...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-blue-200" />
                  Discover Prospects
                </>
              )}
            </button>
          </div>
        </div>

        {/* Preset selections */}
        <div className="rounded-xl border border-zinc-800 bg-[#0C0C0E] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 block font-sans">Lead Target presets</span>
            <button
              onClick={() => setIsEditingPresets(!isEditingPresets)}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="Manage Presets"
            >
              <Settings className="h-3.5 w-3.5" />
              {isEditingPresets ? "Done" : "Manage"}
            </button>
          </div>
          
          {isEditingPresets ? (
            <div className="space-y-3">
              {/* Existing presets list under edit */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {presets.map((ind, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5 p-2 bg-zinc-900/60 border border-zinc-805 rounded-lg">
                    {editingPresetIdx === idx ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={editingPresetLabel}
                          onChange={(e) => setEditingPresetLabel(e.target.value)}
                          placeholder="Label (e.g. 🦷 Dentist Clinic)"
                          className="w-full bg-[#09090B] border border-zinc-700 p-1.5 text-xs text-zinc-200 rounded outline-none focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={editingPresetQuery}
                          onChange={(e) => setEditingPresetQuery(e.target.value)}
                          placeholder="Search Query (e.g. Dentist)"
                          className="w-full bg-[#09090B] border border-zinc-700 p-1.5 text-xs text-zinc-200 rounded outline-none focus:border-blue-500"
                        />
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => setEditingPresetIdx(null)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-300 font-semibold px-2 py-0.5 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEditPreset(idx)}
                            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-semibold px-2.5 py-0.5 rounded transition-colors cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-semibold text-zinc-200 truncate">{ind.label}</p>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">{ind.query}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleStartEditPreset(idx)}
                            className="text-zinc-400 hover:text-blue-400 p-1 transition-colors cursor-pointer"
                            title="Edit preset"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeletePreset(idx)}
                            className="text-zinc-400 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Delete preset"
                          >
                            <Trash2 className="h-3 w-3 animate-pulse-once" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {presets.length === 0 && (
                  <p className="text-center text-[11px] text-zinc-300 font-medium py-4">No custom presets. Add some below!</p>
                )}
              </div>

              {/* Add New Preset Form */}
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Add New Preset</span>
                <input
                  type="text"
                  value={newPresetLabel}
                  onChange={(e) => setNewPresetLabel(e.target.value)}
                  placeholder="Button Label (e.g. 🍣 Sushi Bars)"
                  className="w-full bg-[#09090B] border border-zinc-800 p-2 text-xs text-zinc-300 placeholder-zinc-600 rounded focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  value={newPresetQuery}
                  onChange={(e) => setNewPresetQuery(e.target.value)}
                  placeholder="Query Keyword (e.g. Sushi)"
                  className="w-full bg-[#09090B] border border-zinc-800 p-2 text-xs text-zinc-300 placeholder-zinc-600 rounded focus:border-blue-500 outline-none"
                />
                <button
                  onClick={handleAddPreset}
                  disabled={!newPresetLabel.trim() || !newPresetQuery.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3/12 w-3 text-white" /> Add Custom Niche
                </button>
              </div>

              {/* Reset Default list */}
              <div className="border-t border-zinc-800 pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleResetPresets}
                  className="text-[10px] text-zinc-400 hover:text-zinc-250 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore Defaults
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPresets(false)}
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
                >
                  Done Editing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {presets.map((ind, idx) => (
                <button
                  key={`${ind.label}-${idx}`}
                  onClick={() => {
                    setQuery(ind.query);
                    triggerSearch(ind.query, location);
                  }}
                  className={`w-full flex items-center justify-between text-left text-xs rounded-lg p-2.5 border transition-all cursor-pointer ${
                    query === ind.query
                      ? 'bg-zinc-800/60 border-zinc-700 text-white font-semibold'
                      : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span>{ind.label}</span>
                  <ArrowRight className="h-3 w-3 opacity-40 shrink-0" />
                </button>
              ))}
              {presets.length === 0 && (
                <div className="text-center p-3 text-xs text-zinc-400 border border-dashed border-zinc-800 rounded-lg bg-[#09090B]/60">
                  No presets defined. Click 'Manage' to add custom niches!
                </div>
              )}
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-2">Popular hubs</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setLocation(c);
                    setIsCustomLocation(false);
                    if (c === 'Accra' || c === 'Kumasi') {
                      setSelectedCountry('GH');
                      setSelectedCity(c);
                    } else if (c === 'Lagos') {
                      setSelectedCountry('NG');
                      setSelectedCity('Lagos');
                    } else if (c === 'London') {
                      setSelectedCountry('GB');
                      setSelectedCity('London');
                    }
                    triggerSearch(query, c);
                  }}
                  className={`px-2 py-1.5 border rounded text-center text-xs transition-all cursor-pointer ${
                    location === c
                      ? 'bg-blue-950/40 text-blue-400 border-blue-900/40 font-semibold'
                      : 'bg-[#09090B] border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Records Lists Right */}
      <div className={`transition-all duration-500 ease-in-out ${showMap ? 'lg:col-span-8' : 'lg:col-span-9'} space-y-4`}>
        
        {/* Toggle Controls for Map view / List expansion */}
        <div id="map-toggle-panel" className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#0C0C0E] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-950/40 border border-blue-900/30 text-blue-400">
              <Map className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Geographical Workspace</h3>
              <p className="text-[10px] text-zinc-400">Visualize prospects context on live mapping layers</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-zinc-400">Show Map Pin-layer</span>
            <span id="map-status-text" className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
              showMap 
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/40' 
                : 'bg-amber-950/20 text-amber-500 border-amber-900/30'
            }`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 transition-all duration-300 ${
                  showMap ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 transition-all duration-300 ${
                  showMap 
                    ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' 
                    : 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
                }`}></span>
              </span>
              {showMap ? 'Map Visible' : 'Map Hidden'}
            </span>
            <button
              onClick={() => setShowMap(!showMap)}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                showMap ? 'bg-blue-600' : 'bg-zinc-850 border border-zinc-750'
              }`}
              id="map-toggle-switch"
              role="switch"
              aria-checked={showMap}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  showMap ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Render Map Frame if enabled with elegant, hardware-accelerated collapse transitions */}
        <AnimatePresence initial={false}>
          {showMap && (
            <motion.div
              initial={{ height: 0, opacity: 0, scaleY: 0.95, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, scaleY: 1, marginBottom: 16 }}
              exit={{ height: 0, opacity: 0, scaleY: 0.95, marginBottom: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="origin-top overflow-hidden"
            >
              <MapView leads={discoveredLeads} onSelectLead={onInspectLead} activeLeadId={activeLeadId} />
            </motion.div>
          )}
        </AnimatePresence>

        {searchNotice && (
          <div className="flex items-center gap-2.5 rounded-xl bg-blue-950/40 border border-blue-900/40 px-4 py-2.5 text-xs text-blue-100 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 flex shrink-0 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.7)]"></span>
            <p className="leading-relaxed">{searchNotice}</p>
          </div>
        )}

        {/* Leads Lists - Smooth scaling and dynamic layout alignment */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-sans font-semibold text-zinc-400 flex items-center gap-2">
              Discovered Business Opportunities
              <span className="rounded bg-[#0C0C0E] text-zinc-300 px-2 py-0.5 border border-zinc-800 font-mono text-[10px]">
                {discoveredLeads.length} Found
              </span>
            </span>
            <span className="text-[10px] text-zinc-400 italic">Values generated in real-time</span>
          </div>

          {isSearching ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C0E]/40 border border-zinc-800 rounded-xl">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
              <h5 className="text-sm font-semibold text-zinc-200">Querying Google Search Grounding</h5>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Gemini is performing a localized search matching your specified keywords to filter real, registered phone profiles, ratings, and websites.
              </p>
            </div>
          ) : discoveredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C0E]/40 border border-zinc-800 rounded-xl">
              <Building2 className="h-8 w-8 text-zinc-700 mb-2" />
              <h5 className="text-xs font-semibold text-zinc-400">No leads discovered yet</h5>
              <p className="text-[11px] text-zinc-400 mt-1">Specify parameters above and trigger lead search to populate deals.</p>
            </div>
          ) : (
            <motion.div 
              layout
              className={`grid grid-cols-1 md:grid-cols-2 ${showMap ? 'lg:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'} gap-3.5`}
            >
              {discoveredLeads.map((ld) => {
                const isSaved = savedLeadNames.includes(ld.name) || ld.isSaved;

                return (
                  <motion.div
                    layout
                    key={ld.id}
                    className="group flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#0C0C0E]/90 p-4 transition-all duration-200 hover:border-zinc-750 hover:bg-[#0C0C0E]"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="max-w-[70%]">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate" title={ld.name}>{ld.name}</h4>
                            <span className="text-[10px]" title={getSourceLabel(ld.source).label}>{getSourceLabel(ld.source).icon}</span>
                          </div>
                          <span className="text-[9.5px] text-zinc-300 font-mono tracking-wider block mt-0.5">{ld.category}</span>
                        </div>
                        {/* Digital Score Badge Gauge */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                            ld.digitalPresenceScore < 40
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : ld.digitalPresenceScore < 60
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {ld.digitalPresenceScore}/100
                          </span>
                          <span className="text-[8.5px] text-zinc-300 mt-0.5 uppercase tracking-wider font-semibold">Maturity</span>
                        </div>
                      </div>

                      <p className="text-[10.5px] text-zinc-300 font-sans line-clamp-2 min-h-[30px] leading-relaxed">
                        {ld.address}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {ld.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] rounded bg-[#161619] border border-zinc-800/80 px-1.5 py-px text-zinc-300 font-medium font-mono">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-zinc-800/60 mt-3 pt-3 flex items-center justify-between">
                      {/* Website label */}
                      {ld.website ? (
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3 text-emerald-400 shrink-0" />
                          <span className="text-[10px] text-zinc-400 truncate max-w-[120px] font-medium" title={ld.website}>
                            {ld.website.replace('http://', '').replace('https://', '').replace('www.', '')}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-500/10 px-2 py-0.5 border border-rose-500/20 rounded text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                          <span>NO WEBSITE</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onInspectLead(ld)}
                          className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          Details
                        </button>
                        
                        <button
                          onClick={() => handleSaveToPipeline(ld)}
                          disabled={isSaved || savingId === ld.id}
                          className={`flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold transition-all border ${
                            isSaved
                              ? 'bg-zinc-900/80 border-zinc-800 text-zinc-350 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-500 border-blue-600 text-white cursor-pointer active:scale-95'
                          }`}
                        >
                          {savingId === ld.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : isSaved ? (
                            <CheckCircle className="h-2.5 w-2.5 text-blue-400" />
                          ) : (
                            <Plus className="h-2.5 w-2.5" />
                          )}
                          {isSaved ? 'In CRM' : 'Save CRM'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

    </div>
  );
}
