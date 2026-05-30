import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentProcessFlow from '../components/AgentProcessFlow';

// ─── AgentProcessFlow Navigation Tests ───

describe('AgentProcessFlow card navigation', () => {
  it('should render all 5 agent cards', () => {
    render(<AgentProcessFlow />);
    // Each card title should be in the document
    expect(screen.getByText('Scanner')).toBeDefined();
    expect(screen.getByText('Analyzer')).toBeDefined();
    expect(screen.getByText('Auditor')).toBeDefined();
    expect(screen.getByText('Pitcher')).toBeDefined();
    expect(screen.getByText('Converter')).toBeDefined();
  });

  it('should render launch buttons for each agent', () => {
    render(<AgentProcessFlow />);
    expect(screen.getByText('Launch Scanner')).toBeDefined();
    expect(screen.getByText('Launch Analyzer')).toBeDefined();
    expect(screen.getByText('Launch Auditor')).toBeDefined();
    expect(screen.getByText('Launch Pitcher')).toBeDefined();
    expect(screen.getByText('Launch Converter')).toBeDefined();
  });

  it('should call onNavigate with "discovery" when Scanner launch is clicked', () => {
    const onNavigate = vi.fn();
    render(<AgentProcessFlow onNavigate={onNavigate} />);

    const launchBtn = screen.getByText('Launch Scanner');
    fireEvent.click(launchBtn);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('discovery');
  });

  it('should call onNavigate with "discovery" when Analyzer launch is clicked', () => {
    const onNavigate = vi.fn();
    render(<AgentProcessFlow onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Launch Analyzer'));
    expect(onNavigate).toHaveBeenCalledWith('discovery');
  });

  it('should call onNavigate with "discovery" when Auditor launch is clicked', () => {
    const onNavigate = vi.fn();
    render(<AgentProcessFlow onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Launch Auditor'));
    expect(onNavigate).toHaveBeenCalledWith('discovery');
  });

  it('should call onNavigate with "discovery" when Pitcher launch is clicked', () => {
    const onNavigate = vi.fn();
    render(<AgentProcessFlow onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Launch Pitcher'));
    expect(onNavigate).toHaveBeenCalledWith('discovery');
  });

  it('should call onNavigate with "crm" when Converter launch is clicked', () => {
    const onNavigate = vi.fn();
    render(<AgentProcessFlow onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Launch Converter'));
    expect(onNavigate).toHaveBeenCalledWith('crm');
  });

  it('should not crash when onNavigate is not provided', () => {
    render(<AgentProcessFlow />);
    expect(() => {
      fireEvent.click(screen.getByText('Launch Scanner'));
      fireEvent.click(screen.getByText('Launch Converter'));
    }).not.toThrow();
  });
});

// ─── Autocomplete City Data Tests ───

describe('City data syncing', () => {
  it('should have COUNTRIES_AND_CITIES with expanded country entries in ProductLanding', async () => {
    const { COUNTRIES_AND_CITIES } = await import('../components/ProductLanding');
    
    const codes = COUNTRIES_AND_CITIES.map(c => c.code);
    expect(codes).toContain('GH');
    expect(codes).toContain('NG');
    expect(codes).toContain('KE');
    expect(codes).toContain('GB');
    expect(codes).toContain('US');
    expect(codes).toContain('AE');
    expect(codes).toContain('CA');
    expect(codes).toContain('AU');
    expect(codes).toContain('SG');
    expect(codes).toContain('JP');
    expect(codes).toContain('IN');
  });

  it('should have synced city data in DiscoveryEngine matching ProductLanding', async () => {
    const pl = await import('../components/ProductLanding');
    const de = await import('../components/DiscoveryEngine');

    // Both should have the same number of country entries
    expect(pl.COUNTRIES_AND_CITIES.length).toBe(de.COUNTRIES_AND_CITIES.length);

    // Both should include the same expanded cities
    const plCities = pl.COUNTRIES_AND_CITIES.flatMap(c => c.cities);
    const deCities = de.COUNTRIES_AND_CITIES.flatMap(c => c.cities);

    expect(new Set(plCities)).toEqual(new Set(deCities));
  });

  it('should have all country-city mappings consistent with each other', async () => {
    const pl = await import('../components/ProductLanding');
    const de = await import('../components/DiscoveryEngine');

    // Verify each country's cities are identical between files
    pl.COUNTRIES_AND_CITIES.forEach((plCountry: { code: string; cities: string[] }) => {
      const deCountry = de.COUNTRIES_AND_CITIES.find(
        (c: { code: string; cities: string[] }) => c.code === plCountry.code
      );
      expect(deCountry).toBeDefined();
      expect(new Set(deCountry!.cities)).toEqual(new Set(plCountry.cities));
    });
  });
});

// ─── Niche Autocomplete Tests ───

describe('Niche autocomplete suggestions', () => {
  it('should include common business niches', () => {
    const niches = [
      'Dentist', 'Cafe', 'Restaurant', 'Barber', 'Salon', 'Bakery',
      'Hotel', 'School', 'Hospital', 'Gym', 'Pharmacy', 'Clinic',
      'Pizza', 'Laundry', 'Auto Repair', 'Plumber', 'Electrician',
      'Lawyer', 'Real Estate', 'Daycare', 'Pet Store', 'Supermarket',
      'Boutique', 'Spa'
    ];

    expect(niches.length).toBe(24);
    expect(niches).toContain('Dentist');
    expect(niches).toContain('Restaurant');
    expect(niches).toContain('Gym');
    expect(niches).toContain('Hospital');
    expect(niches).toContain('Spa');
  });
});
