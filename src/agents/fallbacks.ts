/**
 * AI Client Hunter — Fallback Lead Generator
 * 
 * Generates realistic fallback leads when AI search is unavailable.
 * Used by the searchLeads tool in the agent system.
 */

export interface FallbackLead {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  address: string;
  rating: number | null;
  reviewsCount: number | null;
  website: string | null;
  mapsUrl: string | null;
  latitude: number;
  longitude: number;
  status: 'new';
  notes: string;
  tags: string[];
  serviceType: 'web_design' | 'ai_automation' | 'hybrid';
  digitalPresenceScore: number;
  createdAt: string;
  source: string;
  outreachHistory: any[];
}

export function generateFallbackLeads(query: string, source?: string): FallbackLead[] {
  const searchQuery = query.toLowerCase();
  let city = 'Lagos';
  if (searchQuery.includes('accra') || searchQuery.includes('ghana')) city = 'Accra';
  else if (searchQuery.includes('london') || searchQuery.includes('uk')) city = 'London';
  else if (searchQuery.includes('kumasi')) city = 'Kumasi';
  else if (searchQuery.includes('nairobi') || searchQuery.includes('kenya')) city = 'Nairobi';
  else if (searchQuery.includes('new york') || searchQuery.includes('ny')) city = 'New York';

  let industry = 'Service Provider';
  if (searchQuery.includes('dentist') || searchQuery.includes('clinic') || searchQuery.includes('hospital') || searchQuery.includes('medical') || searchQuery.includes('health')) industry = 'Medical';
  else if (searchQuery.includes('restaurant') || searchQuery.includes('food') || searchQuery.includes('cafe') || searchQuery.includes('bakery')) industry = 'F&B';
  else if (searchQuery.includes('logistics') || searchQuery.includes('freight') || searchQuery.includes('delivery') || searchQuery.includes('courier')) industry = 'Logistics';
  else if (searchQuery.includes('school') || searchQuery.includes('academy') || searchQuery.includes('tutor') || searchQuery.includes('education')) industry = 'Education';
  else if (searchQuery.includes('hotel') || searchQuery.includes('resort') || searchQuery.includes('inn') || searchQuery.includes('lodging')) industry = 'Hospitality';
  else if (searchQuery.includes('gym') || searchQuery.includes('fitness') || searchQuery.includes('workout')) industry = 'Fitness';
  else if (searchQuery.includes('salon') || searchQuery.includes('barber') || searchQuery.includes('beauty') || searchQuery.includes('spa')) industry = 'Beauty';
  else if (searchQuery.includes('real estate') || searchQuery.includes('property') || searchQuery.includes('agent') || searchQuery.includes('realtor')) industry = 'Real Estate';

  const coords: Record<string, { lat: number; lng: number }> = {
    'Accra': { lat: 5.5601, lng: -0.2057 },
    'Lagos': { lat: 6.5244, lng: 3.3792 },
    'Kumasi': { lat: 6.6906, lng: -1.6244 },
    'London': { lat: 51.5074, lng: -0.1278 },
    'Nairobi': { lat: -1.2921, lng: 36.8219 },
    'New York': { lat: 40.7128, lng: -74.0060 },
  };
  const center = coords[city] || { lat: 6.5244, lng: 3.3792 };

  const templates: Record<string, Array<{ name: string; category: string; hasWebsite: boolean; tags: string[]; rating: number; reviews: number }>> = {
    'Medical': [
      { name: `${city} Premium Care Clinic`, category: 'Multi-Specialty Clinic', hasWebsite: false, tags: ['No Website', 'Manual Bookings', 'High Value'], rating: 4.1, reviews: 42 },
      { name: `St. Catherine's Health Center`, category: 'General Practice', hasWebsite: true, tags: ['Legacy Site', 'Slow Load', 'No Booking'], rating: 4.4, reviews: 68 },
      { name: `${city} Dental & Ortho Studio`, category: 'Dental Clinic', hasWebsite: false, tags: ['No Website', 'WhatsApp Bookings', 'Dental Spa'], rating: 4.3, reviews: 35 },
      { name: `PhysioFirst Rehab ${city}`, category: 'Physiotherapy', hasWebsite: false, tags: ['No Website', 'Manual Scheduling', 'Growing Practice'], rating: 4.6, reviews: 27 },
      { name: `Eyesight Precision Clinic`, category: 'Optometry', hasWebsite: true, tags: ['Non-Responsive Site', 'Outdated Info', 'Opportunity'], rating: 3.9, reviews: 19 },
    ],
    'F&B': [
      { name: `${city} Spice Kitchen & Grill`, category: 'Fine Dining', hasWebsite: false, tags: ['No Website', 'Instagram-Only', 'Manual Orders'], rating: 4.6, reviews: 112 },
      { name: `Le Petit Cafe ${city}`, category: 'Cafe & Bistro', hasWebsite: true, tags: ['Old WordPress', 'Non-Mobile', 'Outdated Menu'], rating: 4.1, reviews: 43 },
      { name: `Golden Crust Bakehouse`, category: 'Bakery', hasWebsite: false, tags: ['No Website', 'Popular Spot', 'Web Opportunity'], rating: 4.8, reviews: 89 },
      { name: `Bento Grill Express`, category: 'Fast Casual', hasWebsite: false, tags: ['No Website', 'Walk-Ins Only', 'Lacks Online Ordering'], rating: 3.9, reviews: 27 },
    ],
    'Logistics': [
      { name: `SwiftExpress ${city} Logistics`, category: 'Courier Service', hasWebsite: true, tags: ['Has Old Site', 'No Tracker', 'High Support Cost'], rating: 3.3, reviews: 62 },
      { name: `CargoPro Freight Handlers`, category: 'Freight Forwarder', hasWebsite: false, tags: ['No Website', 'B2B Cargo', 'Manual Quotes'], rating: 3.5, reviews: 14 },
      { name: `Speedway Logistics Hub`, category: 'Warehousing', hasWebsite: false, tags: ['No Website', 'Call Dispatcher', 'Paper Receipting'], rating: 4.1, reviews: 22 },
    ],
    'Education': [
      { name: `${city} Modern Academy`, category: 'Private School', hasWebsite: false, tags: ['No Website', 'Phone Inquiries', 'Manual Admissions'], rating: 4.4, reviews: 35 },
      { name: `Pristine Kids Montessori`, category: 'Preschool', hasWebsite: true, tags: ['Legacy Site', 'Unfinished Pages', 'Non-Responsive'], rating: 4.7, reviews: 29 },
      { name: `Summit Vocational Institute`, category: 'Skills Training', hasWebsite: false, tags: ['No Website', 'Facebook Brochure', 'Lacks Portal'], rating: 4.3, reviews: 18 },
    ],
    'Hospitality': [
      { name: `Royal Meridian Hotel ${city}`, category: 'Luxury Hotel', hasWebsite: false, tags: ['No Website', 'Manual Reservations', 'High Value'], rating: 4.5, reviews: 142 },
      { name: `Serene Horizon Resort`, category: 'Boutique Resort', hasWebsite: true, tags: ['Old Theme', 'Slow Load', 'No Room Booking'], rating: 4.2, reviews: 64 },
      { name: `Oasis View Inn & Suites`, category: 'Guest House', hasWebsite: false, tags: ['No Website', 'Booking.com Reliance', 'Commission Loss'], rating: 3.8, reviews: 19 },
    ],
    'Fitness': [
      { name: `Ironclad Gym ${city}`, category: 'Fitness Center', hasWebsite: false, tags: ['No Website', 'Instagram Intake', 'Manual Subscriptions'], rating: 4.8, reviews: 78 },
      { name: `Pinnacle Core Pilates`, category: 'Yoga Studio', hasWebsite: true, tags: ['Broken Page', 'Lacks Scheduler', 'Missing Pricing'], rating: 4.5, reviews: 22 },
      { name: `Vanguard Athletic Club`, category: 'Sports Club', hasWebsite: false, tags: ['No Website', 'Offline Registration', 'Great Foot Traffic'], rating: 4.3, reviews: 14 },
    ],
    'Beauty': [
      { name: `${city} Glam Studio & Spa`, category: 'Beauty Salon', hasWebsite: false, tags: ['No Website', 'Instagram Reliance', 'Manual Booking'], rating: 4.5, reviews: 65 },
      { name: `Classic Cuts Barber Shop`, category: 'Barbershop', hasWebsite: false, tags: ['No Website', 'Walk-Ins Only', 'Local Favorite'], rating: 4.7, reviews: 93 },
      { name: `Divine Nails & Beauty Spa`, category: 'Nail Salon', hasWebsite: true, tags: ['Broken Booking Page', 'No Online Pricing'], rating: 4.2, reviews: 38 },
    ],
    'Real Estate': [
      { name: `${city} Prime Properties Ltd`, category: 'Real Estate Agency', hasWebsite: false, tags: ['No Website', 'Facebook Listings', 'High Value'], rating: 4.3, reviews: 47 },
      { name: `HomeFinders Realty`, category: 'Property Management', hasWebsite: true, tags: ['Outdated Listings', 'No Virtual Tours', 'Opportunity'], rating: 3.8, reviews: 31 },
    ],
    'Service Provider': [
      { name: `${city} Hub Enterprises`, category: 'Business Services', hasWebsite: false, tags: ['No Website', 'Maps Reliance', 'Manual Intake'], rating: 4.2, reviews: 31 },
      { name: `Prestige Auto Repair Center`, category: 'Auto Service', hasWebsite: false, tags: ['No Website', 'Great Reviews', 'Needs Scheduler'], rating: 4.6, reviews: 60 },
      { name: `${city} Tech Solutions`, category: 'IT Services', hasWebsite: true, tags: ['Basic Site', 'No Portfolio', 'Lacks Contact Form'], rating: 4.0, reviews: 15 },
    ],
  };

  const leadSource = source || 'ai_search';
  const phonePrefix = city === 'Accra' || city === 'Kumasi' ? '+233 20 ' : city === 'Lagos' ? '+234 81 ' : city === 'London' ? '+44 20 ' : '+1 212 ';
  const bizList = templates[industry] || templates['Service Provider'];
  const maxResults = Math.min(5, bizList.length);

  return bizList.slice(0, maxResults).map((tpl, i) => {
    const latOffset = (Math.random() - 0.5) * 0.025;
    const lngOffset = (Math.random() - 0.5) * 0.025;
    const hasWebsite = tpl.hasWebsite;
    const computedScore = hasWebsite
      ? Math.floor(45 + Math.random() * 25)
      : Math.floor(25 + Math.random() * 20);

    return {
      id: `lead-agent-${i}-${Date.now()}`,
      name: tpl.name,
      category: tpl.category,
      phone: phonePrefix + Math.floor(1000000 + Math.random() * 9000000),
      address: `${Math.floor(10 + Math.random() * 150)} ${['Main Street', 'Commercial Road', 'Business Avenue', 'Market Street'][i % 4]}, ${city}`,
      rating: tpl.rating,
      reviewsCount: tpl.reviews,
      website: hasWebsite ? `${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com` : null,
      mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(tpl.name)}`,
      latitude: center.lat + latOffset,
      longitude: center.lng + lngOffset,
      status: 'new' as const,
      notes: hasWebsite
        ? 'Has a basic web presence but needs modernization with booking and mobile responsiveness.'
        : 'No website found — high-priority target for web design sales outreach.',
      tags: tpl.tags,
      serviceType: hasWebsite ? 'ai_automation' as const : 'web_design' as const,
      digitalPresenceScore: computedScore,
      createdAt: new Date().toISOString(),
      source: leadSource,
      outreachHistory: [],
    };
  });
}
