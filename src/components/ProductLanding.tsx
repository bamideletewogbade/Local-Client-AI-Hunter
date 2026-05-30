import { useState, useEffect, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { 
  MapPin, 
  Sparkles, 
  Check, 
  ArrowRight, 
  Database,
  Mail,
  Twitter,
  Linkedin,
  FileText,
  ClipboardList,
  Cpu,
  Search,
  Zap,
  ClipboardCheck,
  PenTool,
  CheckCircle,
  Globe,
  Smartphone,
  Gauge
} from 'lucide-react';

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

interface ProductLandingProps {
  onStartApp: () => void;
  isFirebaseConfigured: boolean;
  onConnectDatabase: () => void;
}

// ─── Discovery Report Types ───
interface ReportFinding {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
  effort: string;
  value: string;
  color: string;
}

interface DiscoveryReport {
  businessName: string;
  industry: string;
  location: string;
  score: number;
  findings: ReportFinding[];
}

interface DiscoveryFormState {
  businessName: string;
  industry: string;
  website: string;
  painPoints: string[];
  budget: string;
  isSubmitting: boolean;
  isComplete: boolean;
}

export default function ProductLanding({ onStartApp, isFirebaseConfigured, onConnectDatabase }: ProductLandingProps) {
  // Interactive Hero Widget State
  const [selectedNiche, setSelectedNiche] = useState('Gym');
  const [targetCountry, setTargetCountry] = useState('GH');
  const [targetCity, setTargetCity] = useState('Accra');
  const [isCustomHeroLocation, setIsCustomHeroLocation] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Compare Tab State
  const [activeCompareTab, setActiveCompareTab] = useState<'rating' | 'website' | 'outreach'>('website');

  // Discovery Call 3-Step Engine State (persisted to localStorage)
  const [activeDiscoveryStep, setActiveDiscoveryStep] = useState<number>(1);
  const [visibleDiscoverySteps, setVisibleDiscoverySteps] = useState<Set<number>>(new Set([1]));
  const [discoveryForm, setDiscoveryForm] = useLocalStorage<DiscoveryFormState>('hunter_discovery_form', {
    businessName: '',
    industry: '',
    website: '',
    painPoints: [],
    budget: '$1k–$3k',
    isSubmitting: false,
    isComplete: false,
  });
  // Reset transient process flags on reload (prevents stuck spinner)
  if (discoveryForm.isSubmitting || discoveryForm.isComplete) {
    setDiscoveryForm(f => ({ ...f, isSubmitting: false, isComplete: false }));
  }
  const [generatedReport, setGeneratedReport] = useLocalStorage<DiscoveryReport | null>('hunter_discovery_report', null);

  // IntersectionObserver to animate steps into view
  const stepRef1 = useRef<HTMLDivElement>(null);
  const stepRef2 = useRef<HTMLDivElement>(null);
  const stepRef3 = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const refs = [stepRef1, stepRef2, stepRef3];
    const observers: IntersectionObserver[] = [];
    refs.forEach((ref, idx) => {
      if (!ref.current) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleDiscoverySteps(prev => new Set([...prev, idx + 1]));
          }
        },
        { threshold: 0.2 }
      );
      observer.observe(ref.current);
      observers.push(observer);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  // Handle the Interactive Search simulation
  const handleLaunchInstantScan = () => {
    setIsSimulating(true);
    // Persist to local storage so Discovery search can read & prefill
    localStorage.setItem('hunter_prefill_niche', selectedNiche);
    localStorage.setItem('hunter_prefill_city', targetCity);
    
    setTimeout(() => {
      setIsSimulating(false);
      onStartApp();
    }, 850);
  };

  return (
    <div id="product-landing-root" className="bg-[#FAFAFB] text-zinc-900 selection:bg-blue-600/10 selection:text-blue-600 min-h-screen">
      
      {/* 🚀 Iconic Hero Section with Float Widget Block & Mosaic Background */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-zinc-200 bg-linear-to-b from-white via-zinc-50/30 to-zinc-100/40">
        
        {/* Subtle geometric line design accents in the background */}
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full border-x border-dashed border-zinc-200/60" />
          <div className="absolute top-1/3 left-0 w-full h-px border-t border-dashed border-zinc-200/60" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:items-center">
          
          {/* Left Column: Bold Copy and Bullet Indicators */}
          <div className="lg:col-span-7 space-y-8 text-left max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span className="font-display tracking-tight">AscendSME · Lumi · Hone · AI Client Finder</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 font-display leading-[1.08]">
              Skip cold outreach. <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-indigo-700">
                Get real local clients.
              </span>
            </h1>

            <p className="text-zinc-600 text-base sm:text-lg font-light leading-relaxed">
              Why send thousands of spam emails? Our intelligent radar scans Google Maps, diagnoses slow or missing local business websites, and generates customized redesign mockups to win clients directly.
            </p>

            {/* Quick Iconic 1-2-3 list, inspired by the reference sites */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-800">Scan Google Maps directly</p>
                  <p className="text-xs text-zinc-500">Pick any city or niche to find real, active businesses with poor online presence.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-800">Run a smart design audit</p>
                  <p className="text-xs text-zinc-500">Find exactly what is broken—whether it is raw speed, mobile bugs, or broken website links.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-sm font-bold text-zinc-800">Present direct, beautiful value</p>
                  <p className="text-xs text-zinc-500">Create a personalized redesign pitch with layout code structures to start high-ticket relationships.</p>
                </div>
              </div>
            </div>

            {/* Credibility logos */}
            <div className="pt-6 border-t border-zinc-200/80">
              <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono mb-3">TRUSTED BY FREELANCERS & AGENCIES WORLDWIDE</p>
              <div className="flex flex-wrap gap-4 items-center opacity-70">
                <span className="text-xs font-extrabold text-zinc-400 tracking-wider">STRIPE PIONEER</span>
                <span className="text-zinc-300">•</span>
                <span className="text-xs font-extrabold text-zinc-400 tracking-wider">SHOPIFY INSIDER</span>
                <span className="text-zinc-300">•</span>
                <span className="text-xs font-extrabold text-zinc-400 tracking-wider">YCOMBINATOR ASSIST</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sleek Floating Action Controller Widget (Classic @levelsio layout) */}
          <div className="lg:col-span-5 relative mt-4 lg:mt-0">
            {/* Soft decorative background glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-10" />

            {/* Main Interactive Floating Widget Container */}
            <div className="relative bg-zinc-900 text-white rounded-3xl border border-zinc-800 shadow-2xl p-6 sm:p-8">
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-wider uppercase">Live Lead Scanner</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">No Credit Card Needed</span>
              </div>

              <h2 className="text-lg sm:text-xl font-bold font-display tracking-tight text-white mb-5">
                Find local clients in seconds
              </h2>

              <div className="space-y-4">
                
                {/* Search Term Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Select target niche
                    </label>
                    <span className="text-[9px] text-zinc-500">Preset or type custom</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {[
                      { label: '🏨 Hotels', query: 'Hotel' },
                      { label: '🏫 Schools', query: 'School' },
                      { label: '🏥 Hospitals', query: 'Hospital' },
                      { label: '🏋️ Gyms', query: 'Gym' }
                    ].map((n) => (
                      <button
                        key={n.query}
                        type="button"
                        onClick={() => setSelectedNiche(n.query)}
                        className={`text-xs py-2 rounded-xl border transition-all text-center cursor-pointer ${
                          selectedNiche.toLowerCase() === n.query.toLowerCase()
                            ? 'bg-blue-600 border-blue-500 text-white font-bold'
                            : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:border-zinc-500'
                        }`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                  {/* Custom type-in capability */}
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedNiche}
                      onChange={(e) => setSelectedNiche(e.target.value)}
                      list="niche-autocomplete-hero"
                      placeholder="Or type custom niche (e.g. Dentist, Cafe...)"
                      className="w-full bg-zinc-850 border border-zinc-750 text-zinc-150 placeholder-zinc-600 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-zinc-500 font-medium font-sans"
                    />
                    <datalist id="niche-autocomplete-hero">
                      {['Dentist', 'Cafe', 'Restaurant', 'Barber', 'Salon', 'Bakery', 'Hotel', 'School', 'Hospital', 'Gym', 'Pharmacy', 'Clinic', 'Pizza', 'Laundry', 'Auto Repair', 'Plumber', 'Electrician', 'Lawyer', 'Real Estate', 'Daycare', 'Pet Store', 'Supermarket', 'Boutique', 'Spa'].map(niche => (
                        <option key={niche} value={niche} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Target Location cascading selector / dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Target Location
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const newMode = !isCustomHeroLocation;
                        setIsCustomHeroLocation(newMode);
                        if (!newMode) {
                          setTargetCity('Accra');
                          setTargetCountry('GH');
                        }
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                    >
                      {isCustomHeroLocation ? "Select Hub" : "Type Custom"}
                    </button>
                  </div>

                  {isCustomHeroLocation ? (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-500" />
                      <input
                        type="text"
                        value={targetCity}
                        onChange={(e) => setTargetCity(e.target.value)}
                        list="city-autocomplete-hero"
                        placeholder="e.g. Accra, Lagos, London..."
                        className="w-full bg-zinc-850 border border-zinc-750 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-medium"
                      />
                      <datalist id="city-autocomplete-hero">
                        {ALL_CITIES.map(city => (
                          <option key={city} value={city} />
                        ))}
                      </datalist>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] text-zinc-500 block mb-0.5">Country</label>
                        <select
                          value={targetCountry}
                          onChange={(e) => {
                            const code = e.target.value;
                            setTargetCountry(code);
                            const match = COUNTRIES_AND_CITIES.find(c => c.code === code);
                            if (match && match.cities.length > 0) {
                              setTargetCity(match.cities[0]);
                            }
                          }}
                          className="w-full bg-zinc-850 border border-zinc-750 text-zinc-200 rounded-xl text-xs px-2 py-2 cursor-pointer font-sans outline-none focus:border-zinc-600"
                        >
                          {COUNTRIES_AND_CITIES.map(c => (
                            <option key={c.code} value={c.code} className="bg-zinc-900 text-zinc-200">
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[9px] text-zinc-500 block mb-0.5">City Hub</label>
                        <select
                          value={targetCity}
                          onChange={(e) => {
                            setTargetCity(e.target.value);
                          }}
                          className="w-full bg-zinc-850 border border-zinc-750 text-zinc-200 rounded-xl text-xs px-2 py-2 cursor-pointer font-sans outline-none focus:border-zinc-600"
                        >
                          {COUNTRIES_AND_CITIES.find(c => c.code === targetCountry)?.cities.map(ct => (
                            <option key={ct} value={ct} className="bg-zinc-900 text-zinc-200">
                              {ct}
                            </option>
                          )) || <option value="Accra" className="bg-zinc-900 text-zinc-205">Accra</option>}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Big Action Call To Action Button with dynamic loading feedback */}
                <button
                  type="button"
                  onClick={handleLaunchInstantScan}
                  disabled={isSimulating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-3.5 px-4 text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 active:scale-98"
                >
                  {isSimulating ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Scanning Maps Coordinates...</span>
                    </div>
                  ) : (
                    <>
                      <span>Find {selectedNiche} Leads Near {targetCity} →</span>
                    </>
                  )}
                </button>

                {/* Database Backup indicator link */}
                <div className="pt-2 flex justify-between items-center text-[10px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <Database className="h-3 w-3 text-zinc-500" />
                    <span>Mode: {isFirebaseConfigured ? 'Cloud Live Firestore' : 'Offline Local Backup'}</span>
                  </span>
                  {!isFirebaseConfigured && (
                    <button 
                      onClick={onConnectDatabase}
                      className="text-emerald-400 hover:underline cursor-pointer font-bold"
                    >
                      Connect DB
                    </button>
                  )}
                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Removed: Masonry Feed section — redundant with AgentProcessFlow */}

      {/* Removed: Interactive Simulator section — deep demo redundant with AgentProcessFlow */}

      {/* 🎯 Discovery Call 3-Step Engine — Questionnaire → AI Analysis → Custom Report */}
      <section className="relative overflow-hidden bg-zinc-950 py-24 sm:py-32 border-b border-zinc-800/60">
        {/* Background grid pattern matching AgentProcessFlow */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
        {/* Ambient glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-600/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          {/* Section header */}
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-18">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 mb-4">
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-mono tracking-widest text-emerald-300/80 uppercase font-bold">
                Discovery Engine
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-[1.1]">
              One call. Full diagnosis.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                A plan they can't refuse.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 font-light mt-4 max-w-2xl mx-auto leading-relaxed">
              Skip the generic pitch. Our standardized discovery questionnaire captures everything about a prospect's business,
              then our AI agents build a detailed, customized report showing exactly what they need — and why you're the one to deliver it.
            </p>
          </div>

          {/* ─── 3-Step Flow ─── */}
          <div className="max-w-5xl mx-auto">
            
            {/* Step 1: Discovery Questionnaire */}
            <DiscoveryStep
              stepNumber={1}
              title="Discovery Questionnaire"
              subtitle="Standardized intake — 2 minutes"
              description="Answer a smart, structured questionnaire about the prospect's business. Every answer feeds directly into our AI analysis engine."
              icon={ClipboardList}
              color="#3b82f6"
              innerRef={stepRef1}
              isExpanded={activeDiscoveryStep === 1}
              onToggle={() => setActiveDiscoveryStep(activeDiscoveryStep === 1 ? -1 : 1)}
              visible={visibleDiscoverySteps.has(1)}
            >
              <div className="space-y-3.5">
                {/* Business info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">Business Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Joe's Pizza"
                      value={discoveryForm.businessName}
                      onChange={(e) => setDiscoveryForm(f => ({ ...f, businessName: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500/60 transition-colors font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">Industry</label>
                    <select
                      value={discoveryForm.industry}
                      onChange={(e) => setDiscoveryForm(f => ({ ...f, industry: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500/60 transition-colors font-sans cursor-pointer"
                    >
                      <option value="" className="bg-zinc-900">Select industry...</option>
                      <option value="restaurant" className="bg-zinc-900">🍕 Restaurant / Cafe</option>
                      <option value="fitness" className="bg-zinc-900">🏋️ Fitness / Gym</option>
                      <option value="medical" className="bg-zinc-900">🏥 Medical / Dental</option>
                      <option value="education" className="bg-zinc-900">🏫 Education / School</option>
                      <option value="retail" className="bg-zinc-900">🛍️ Retail / Store</option>
                      <option value="service" className="bg-zinc-900">🔧 Home Service</option>
                      <option value="other" className="bg-zinc-900">📌 Other</option>
                    </select>
                  </div>
                </div>

                {/* Website & social */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">Current Website URL</label>
                  <input
                    type="text"
                    placeholder="e.g. joespizza.com — or leave blank if none"
                    value={discoveryForm.website}
                    onChange={(e) => setDiscoveryForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-blue-500/60 transition-colors font-sans"
                  />
                </div>

                {/* Pain points — checkbox grid */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-2">Identified Pain Points (select all that apply)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'no_website', label: 'No website at all', emoji: '🚫' },
                    { id: 'slow_speed', label: 'Slow loading speed', emoji: '🐢' },
                    { id: 'mobile_broken', label: 'Broken on mobile', emoji: '📱' },
                    { id: 'no_seo', label: 'Poor SEO / no Google Maps', emoji: '🔍' },
                    { id: 'outdated', label: 'Looks outdated / unprofessional', emoji: '📟' },
                    { id: 'no_booking', label: 'No online booking / orders', emoji: '📋' },
                  ].map((p) => {
                    const isSelected = discoveryForm.painPoints.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setDiscoveryForm(f => ({
                            ...f,
                            painPoints: isSelected
                              ? f.painPoints.filter(x => x !== p.id)
                              : [...f.painPoints, p.id]
                          }));
                        }}
                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/15 border-blue-500/50 text-blue-200'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className={`h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-blue-500 border-blue-400'
                            : 'bg-zinc-800 border-zinc-700'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <span>{p.emoji} {p.label}</span>
                      </button>
                    );
                  })}
                  </div>
                </div>

                {/* Budget range */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 font-mono mb-1.5">Estimated Budget Range</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['$500–$1k', '$1k–$3k', '$3k–$8k', '$8k+'].map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setDiscoveryForm(f => ({ ...f, budget: range }))}
                        className={`rounded-xl border py-2 text-[10px] font-bold transition-all cursor-pointer ${
                          discoveryForm.budget === range
                            ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-300'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate report CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscoveryForm(f => ({ ...f, isSubmitting: true }));
                      // Simulate AI analysis delay
                      setTimeout(() => {
                        setDiscoveryForm(f => ({ ...f, isSubmitting: false, isComplete: true }));
                        setGeneratedReport(generateMockReport(discoveryForm));
                        setActiveDiscoveryStep(3);
                        setTimeout(() => {
                          document.getElementById('discovery-report-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 300);
                      }, 2000);
                    }}
                    disabled={!discoveryForm.businessName || !discoveryForm.industry || discoveryForm.isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl py-3 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-600/20 active:scale-[0.98] disabled:cursor-not-allowed"
                  >
                    {discoveryForm.isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>AI Agents Analyzing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <span>Generate Discovery Report</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </button>
                  <p className="text-[9px] text-zinc-600 mt-2 font-mono text-center">
                    {discoveryForm.isComplete ? '✓ Report ready — scroll to Step 3' : 'All fields are optional except Business Name & Industry'}
                  </p>
                </div>
              </div>
            </DiscoveryStep>

            {/* Step 2: AI Analysis visualization */}
            <StepConnector visible={visibleDiscoverySteps.has(2)} />

            <DiscoveryStep
              stepNumber={2}
              title="AI Multi-Agent Analysis"
              subtitle="5 agents process the data — 3 seconds"
              description="Scanner, Analyzer, and Auditor agents cross-reference the questionnaire answers against live market data to build a comprehensive deficit report."
              icon={Cpu}
              color="#8b5cf6"
              innerRef={stepRef2}
              isExpanded={activeDiscoveryStep === 2}
              onToggle={() => setActiveDiscoveryStep(activeDiscoveryStep === 2 ? -1 : 2)}
              visible={visibleDiscoverySteps.has(2)}
            >
              <div className="space-y-3">
                {/* Agent processing visualization */}
                {[
                  { name: 'Scanner Agent', status: 'complete', detail: 'Market data fetched — 47 similar businesses analyzed', icon: Search, color: '#3b82f6' },
                  { name: 'Analyzer Agent', status: 'complete', detail: 'Digital footprint scored — 64/100 (below threshold)', icon: Zap, color: '#8b5cf6' },
                  { name: 'Auditor Agent', status: 'complete', detail: '8 critical deficits identified across 4 categories', icon: ClipboardCheck, color: '#f59e0b' },
                  { name: 'Pitcher Agent', status: 'processing', detail: 'Building custom proposal wireframes...', icon: PenTool, color: '#06b6d4' },
                ].map((agent, idx) => {
                  const AgentIcon = agent.icon;
                  return (
                    <div key={agent.name} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 py-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: agent.color + '20', borderColor: agent.color + '30', borderWidth: 1 }}
                      >
                        <AgentIcon className="h-4 w-4" style={{ color: agent.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-200">{agent.name}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{agent.detail}</p>
                      </div>
                      <div>
                        {agent.status === 'complete' ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <div className="h-4 w-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Market insight chip */}
                <div className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-3.5 text-xs text-zinc-300">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 font-mono block mb-1">⚡ Market Insight</span>
                  Businesses in <strong className="text-zinc-100">{discoveryForm.industry || 'your target'}</strong> with modern websites see <strong className="text-emerald-400">3.4× more</strong> inbound leads than those without. Your prospect is leaving money on the table.
                </div>
              </div>
            </DiscoveryStep>

            {/* Step 3: Custom Report output */}
            <StepConnector visible={visibleDiscoverySteps.has(3)} />

            <DiscoveryStep
              stepNumber={3}
              title="Custom Discovery Report"
              subtitle="Ready to present — detailed & actionable"
              description="A comprehensive, beautifully formatted report tailored to this specific prospect. Ready to present as proof of value and close the deal."
              icon={FileText}
              color="#10b981"
              innerRef={stepRef3}
              isExpanded={activeDiscoveryStep === 3}
              onToggle={() => setActiveDiscoveryStep(activeDiscoveryStep === 3 ? -1 : 3)}
              visible={visibleDiscoverySteps.has(3)}
            >
              <div id="discovery-report-section">
                {generatedReport ? (
                  <div className="space-y-3.5">
                    {/* Report header */}
                    <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">Prepared For</p>
                          <h4 className="text-lg font-bold font-display text-white mt-1">{generatedReport.businessName}</h4>
                          <p className="text-xs text-zinc-400">{generatedReport.industry} • {generatedReport.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-zinc-500">Digital Presence Score</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-2 w-24 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-1000"
                                style={{
                                  width: `${generatedReport.score}%`,
                                  background: generatedReport.score < 40
                                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                    : 'linear-gradient(90deg, #f59e0b, #10b981)'
                                }}
                              />
                            </div>
                            <span className={`text-sm font-bold font-display ${
                              generatedReport.score < 40 ? 'text-red-400' : generatedReport.score < 70 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {generatedReport.score}/100
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Findings sections */}
                    {generatedReport.findings.map((finding, idx) => {
                      const FindingIcon = finding.icon;
                      return (
                        <div key={idx} className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: finding.color + '20' }}
                            >
                              <FindingIcon className="h-3.5 w-3.5" style={{ color: finding.color }} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-zinc-200">{finding.title}</p>
                              <p className="text-[10px] text-zinc-500">{finding.severity === 'critical' ? '🔴 Critical' : finding.severity === 'high' ? '🟠 High Priority' : '🟡 Improvement'}</p>
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-relaxed">{finding.description}</p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-[10px] font-bold font-mono text-zinc-500 uppercase tracking-wider">Fix effort:</span>
                            <span className="text-[10px] text-zinc-400">{finding.effort}</span>
                            <span className="text-zinc-700">•</span>
                            <span className="text-[10px] font-bold font-mono text-emerald-500 uppercase tracking-wider">Value: {finding.value}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* CTA */}
                    <button
                      type="button"
                      onClick={onStartApp}
                      className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl py-3.5 text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span>Start Scanning Real Leads Now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-10 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-xl">
                    <FileText className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500 font-medium">Complete Step 1 to generate a discovery report</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Fill in the questionnaire and click "Generate Discovery Report"</p>
                  </div>
                )}
              </div>
            </DiscoveryStep>

          </div>
        </div>
      </section>

      {/* 🚀 Sleek Monetization Checklist Layout (Minimalist Card Tiers) */}
      <section className="py-24 bg-white border-b border-zinc-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-600 font-mono">Value Tiering</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-zinc-900 mt-2">
              Start finding local leads free
            </h2>
            <p className="text-sm text-zinc-500 mt-2">
              Begin searching local Google Map listings and check their ratings instantly. Upgrade to Pro when you need live Firebase backup, unlimited smart audits, and layout suggestions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            {/* Tier 1: Free */}
            <div className="bg-[#FAFAFB] border border-zinc-200 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-300 transition-all">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono bg-zinc-200 px-2 py-0.5 rounded-md">
                  Basic
                </span>
                <h3 className="text-xl font-bold font-display text-zinc-950 mt-4">Free Starter</h3>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">Perfect for freelance web designers starting out locally.</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-3xl font-extrabold font-display text-zinc-950">$0</span>
                  <span className="text-zinc-400 text-xs ml-1">/ forever</span>
                </div>

                <div className="border-t border-zinc-200/60 my-6" />

                <ul className="space-y-3.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Scan Unlimited Google Map Listings</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Check digital status of local leads</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Keep track of leads in a simple list</span>
                  </li>
                  <li className="flex items-start gap-2.5 line-through text-zinc-400">
                    <span>Smart AI website audit</span>
                  </li>
                  <li className="flex items-start gap-2.5 line-through text-zinc-400">
                    <span>Cloud backups & database sync</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onStartApp}
                className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-3 transition-all cursor-pointer text-center mt-8 active:scale-98"
              >
                Start Scanning Free
              </button>
            </div>

            {/* Tier 2: Pro */}
            <div className="bg-white border-2 border-blue-600 rounded-3xl p-8 flex flex-col justify-between relative shadow-xl shadow-blue-600/5 transition-transform hover:scale-[1.01]">
              <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] uppercase font-bold tracking-widest font-mono rounded-full px-2.5 py-1">
                Best Choice
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600 font-mono bg-blue-50 px-2.5 py-1 rounded-md">
                  Professional
                </span>
                <h3 className="text-xl font-bold font-display text-zinc-950 mt-4">Pro Hunter</h3>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">Advanced tools for busy designers and agency builders.</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-3xl font-extrabold font-display text-zinc-950">$29</span>
                  <span className="text-zinc-400 text-xs ml-1 font-sans">/ month</span>
                </div>

                <div className="border-t border-zinc-200/60 my-6" />

                <ul className="space-y-3.5 text-xs text-zinc-600 font-medium">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-950"><strong>Everything in Free</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-950"><strong>Unlimited smart audits</strong> (find website flaws and checklist improvements)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-zinc-950"><strong>Live Cloud Database integration</strong> (save data securely to backup)</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Real-time cross-device list sync</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Generate custom website ideas & outreach emails</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onStartApp}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-3 transition-all cursor-pointer text-center mt-8 active:scale-98 shadow-md shadow-blue-600/10"
              >
                Get Professional License
              </button>
            </div>

            {/* Tier 3: Agency */}
            <div className="bg-[#FAFAFB] border border-zinc-200 rounded-3xl p-8 flex flex-col justify-between hover:border-zinc-300 transition-all">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono bg-zinc-200 px-2 py-0.5 rounded-md">
                  Scale
                </span>
                <h3 className="text-xl font-bold font-display text-zinc-950 mt-4">Agency Plan</h3>
                <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed">Built for teams and busy agencies scaling client acquisition.</p>
                
                <div className="mt-6 flex items-baseline">
                  <span className="text-3xl font-extrabold font-display text-zinc-950">$89</span>
                  <span className="text-zinc-400 text-xs ml-1">/ month</span>
                </div>

                <div className="border-t border-zinc-200/60 my-6" />

                <ul className="space-y-3.5 text-xs text-zinc-600">
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Everything in Pro</strong></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Up to 10 team seats with custom scopes</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Export leads to Zapier or other CRMs</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Share proposals under your own name</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={onStartApp}
                className="w-full rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold py-3 transition-all cursor-pointer text-center mt-8 active:scale-98"
              >
                Contact Agency Sales
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* 💌 Bottom Footer */}
      <footer className="py-16 border-t border-zinc-200 bg-zinc-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center justify-center gap-6">
            
            {/* Attribution */}
            <div className="space-y-1">
              <p className="text-zinc-800 text-[11px] font-bold tracking-widest uppercase font-sans">
                Built with ❤️ by <span className="text-blue-600 hover:underline">Bamidele Tewogbade</span>
              </p>
              <p className="text-[10px] text-zinc-400 font-light max-w-md mx-auto">
                Helping modern agencies target, discover, analyze, and automate local client contracts seamlessly across the full project portfolio.
              </p>
            </div>

            {/* Social Handles */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a 
                href="mailto:bishoptewogbade@gmail.com" 
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-600 transition-colors font-medium border border-zinc-200 px-3 py-1.5 bg-white rounded-full shadow-xs"
                title="Send official email"
              >
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                <span>bishoptewogbade@gmail.com</span>
              </a>

              <div className="flex items-center gap-3">
                <a 
                  href="https://twitter.com/btewogbade" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 text-zinc-500 hover:text-sky-500 hover:border-sky-200 transition-all border border-zinc-200 bg-white rounded-full shadow-xs flex items-center justify-center"
                  title="Follow Bamidele on Twitter"
                >
                  <Twitter className="h-4 w-4" />
                </a>

                <a 
                  href="https://linkedin.com/in/btewogbade" 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 text-zinc-500 hover:text-blue-700 hover:border-blue-200 transition-all border border-zinc-200 bg-white rounded-full shadow-xs flex items-center justify-center"
                  title="Connect on LinkedIn"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Platform Brand */}
            <div className="pt-4 border-t border-zinc-200/80 w-full max-w-sm">
              <p className="text-[10px] font-extrabold tracking-wider text-zinc-450 font-mono uppercase">
                AscendSME · Lumi · Hone · AI Client Finder © {new Date().getFullYear()}
              </p>
            </div>

          </div>
        </div>
      </footer>

    </div>
  );
}

// ─── Discovery Step Animated Card ───
function DiscoveryStep({
  stepNumber,
  title,
  subtitle,
  description,
  icon: Icon,
  color,
  isExpanded,
  onToggle,
  visible,
  innerRef,
  children,
}: {
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isExpanded: boolean;
  onToggle: () => void;
  visible: boolean;
  innerRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={innerRef}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      {/* Step indicator pill */}
      <div className="flex items-center gap-4 mb-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-sm"
          style={{ backgroundColor: color }}
        >
          {stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-bold font-display text-white tracking-tight">{title}</h3>
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
              style={{ borderColor: color + '40', color: color, backgroundColor: color + '15' }}
            >
              {subtitle}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 font-light mt-0.5 max-w-xl">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="h-8 w-8 rounded-lg border border-zinc-800 bg-zinc-900/60 flex items-center justify-center hover:border-zinc-700 transition-all cursor-pointer shrink-0"
        >
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expandable content */}
      <div
        className={`transition-all duration-400 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pl-14 pb-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: color + '20' }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-200">{title}</p>
                <p className="text-[10px] text-zinc-500">{subtitle}</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step Connector Line ───
function StepConnector({ visible }: { visible: boolean }) {
  return (
    <div
      className={`flex justify-center py-3 transition-all duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="h-6 w-px bg-gradient-to-b from-blue-500/60 to-purple-500/60" />
        <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
        <div className="h-6 w-px bg-gradient-to-b from-purple-500/60 to-emerald-500/60" />
      </div>
    </div>
  );
}

// ─── Mock Report Generator ───
function generateMockReport(form: DiscoveryFormState): DiscoveryReport {
  const industryLabel = {
    restaurant: 'Restaurant / Cafe',
    fitness: 'Fitness / Gym',
    medical: 'Medical / Dental',
    education: 'Education / School',
    retail: 'Retail / Store',
    service: 'Home Service',
    other: 'Local Business',
  }[form.industry] || 'Local Business';

  const hasWebsite = form.website.trim().length > 0;
  const painCount = form.painPoints.length;
  const baseScore = hasWebsite ? 45 : 20;
  const score = Math.min(100, Math.max(10, baseScore - painCount * 5 + (form.budget === '$8k+' ? 15 : form.budget === '$3k–$8k' ? 10 : form.budget === '$1k–$3k' ? 5 : 0)));

  return {
    businessName: form.businessName || 'Your Prospect',
    industry: industryLabel,
    location: 'Local Market',
    score,
    findings: [
      {
        icon: Globe,
        title: 'Digital Presence',
        description: hasWebsite
          ? 'Your prospect has a website, but it lacks modern performance standards. Page speed, mobile responsiveness, and SEO metadata need significant improvement to rank in local search results.'
          : 'Your prospect has no website at all. This is the single biggest conversion opportunity — businesses without websites lose 68% of potential customers to competitors with a basic online presence.',
        severity: hasWebsite ? 'high' : 'critical',
        effort: hasWebsite ? '2-3 weeks' : '1-2 weeks',
        value: hasWebsite ? '+120% lead potential' : '+340% lead potential',
        color: hasWebsite ? '#f59e0b' : '#ef4444',
      },
      {
        icon: Smartphone,
        title: 'Mobile Optimization',
        description: painCount > 0 && form.painPoints.includes('mobile_broken')
          ? 'Mobile experience is broken or severely degraded. Over 72% of local searches happen on mobile devices — a poor mobile experience is actively driving customers to competitors.'
          : 'Mobile responsiveness is below modern standards. Google prioritizes mobile-friendly sites in local search rankings, directly affecting visibility and foot traffic.',
        severity: form.painPoints.includes('mobile_broken') ? 'critical' : 'high',
        effort: '1-2 weeks',
        value: '+200% mobile traffic',
        color: form.painPoints.includes('mobile_broken') ? '#ef4444' : '#f59e0b',
      },
      {
        icon: Gauge,
        title: 'Performance & Speed',
        description: form.painPoints.includes('slow_speed')
          ? 'Page load time exceeds 4 seconds (industry benchmark: under 2.5s). Each additional second of load time reduces conversions by 12%. A performance audit and optimization are urgently needed.'
          : 'Page speed is below the recommended threshold. Core Web Vitals (LCP, FID, CLS) need improvement to meet Google\'s ranking standards and provide a smooth user experience.',
        severity: form.painPoints.includes('slow_speed') ? 'critical' : 'high',
        effort: '1-3 weeks',
        value: '+35% conversion rate',
        color: form.painPoints.includes('slow_speed') ? '#ef4444' : '#f59e0b',
      },
      {
        icon: Search,
        title: 'Local SEO & Discoverability',
        description: form.painPoints.includes('no_seo')
          ? 'Business is missing from Google Maps and local search results. This means they are invisible to the 86% of consumers who use Google Maps to find local businesses. Setting up and optimizing a Google Business Profile is step one.'
          : 'Local SEO signals are weak. The business likely has unoptimized or unclaimed Google Business listings, inconsistent NAP (Name, Address, Phone) data, and poor local citation coverage.',
        severity: form.painPoints.includes('no_seo') ? 'critical' : 'high',
        effort: '2-4 weeks',
        value: '+180% local visibility',
        color: form.painPoints.includes('no_seo') ? '#ef4444' : '#f59e0b',
      },
      {
        icon: ClipboardList,
        title: 'Conversion & Booking Funnel',
        description: form.painPoints.includes('no_booking')
          ? 'No online booking, ordering, or appointment system exists. Customers must call or visit in person — creating friction that drives them to competitors with seamless digital booking experiences.'
          : 'The current site lacks structured calls-to-action and conversion optimization. Adding clear booking flows, contact forms, and lead capture mechanisms could dramatically increase inbound inquiries.',
        severity: form.painPoints.includes('no_booking') ? 'critical' : 'high',
        effort: '1-2 weeks',
        value: '+150% booked appointments',
        color: form.painPoints.includes('no_booking') ? '#ef4444' : '#f59e0b',
      },
    ],
  };
}
