import { describe, it, expect } from 'vitest';
import { generatePriorityScore } from '../components/PriorityScoreGauge';

describe('generatePriorityScore', () => {
  it('should return a valid PriorityScore object with all required fields', () => {
    const result = generatePriorityScore({
      rating: 4.5,
      reviewsCount: 25,
      website: 'https://example.com',
      digitalPresenceScore: 60,
      category: 'Hospital',
      phone: '+233501234567',
      address: 'Accra, Ghana',
    });

    expect(result).toBeDefined();
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.probabilityOfClosing).toBeGreaterThanOrEqual(0);
    expect(result.probabilityOfClosing).toBeLessThanOrEqual(10);
    expect(result.revenuePotential).toBeGreaterThanOrEqual(0);
    expect(result.revenuePotential).toBeLessThanOrEqual(10);
    expect(result.aiReadiness).toBeGreaterThanOrEqual(0);
    expect(result.aiReadiness).toBeLessThanOrEqual(10);
    expect(result.whatsappDependence).toBeGreaterThanOrEqual(0);
    expect(result.whatsappDependence).toBeLessThanOrEqual(10);
    expect(result.easeOfAccess).toBeGreaterThanOrEqual(0);
    expect(result.easeOfAccess).toBeLessThanOrEqual(10);
    expect(result.factors).toHaveLength(5);
  });

  it('should produce a higher overall score for leads with no website (high urgency)', () => {
    const noWebsite = generatePriorityScore({
      rating: 4.0,
      category: 'Restaurant',
      phone: '+233501234567',
      address: 'Accra',
    });

    const hasWebsite = generatePriorityScore({
      rating: 4.0,
      category: 'Restaurant',
      phone: '+233501234567',
      address: 'Accra',
      website: 'https://restaurant.com',
    });

    // No website should have higher probability of closing (easier sale)
    expect(noWebsite.probabilityOfClosing).toBeGreaterThanOrEqual(hasWebsite.probabilityOfClosing);
  });

  it('should assign higher revenue potential to known high-value categories', () => {
    const hospital = generatePriorityScore({ category: 'Hospital', rating: 4.0 });
    const salon = generatePriorityScore({ category: 'Salon', rating: 4.0 });

    expect(hospital.revenuePotential).toBeGreaterThanOrEqual(salon.revenuePotential);
  });

  it('should return 5 factors with correct labels and weights', () => {
    const result = generatePriorityScore({ category: 'School' });

    const factorLabels = result.factors.map(f => f.label);
    expect(factorLabels).toContain('Probability of Closing');
    expect(factorLabels).toContain('Revenue Potential');
    expect(factorLabels).toContain('AI Readiness');
    expect(factorLabels).toContain('WhatsApp Dependence');
    expect(factorLabels).toContain('Ease of Access');

    const totalWeight = result.factors.reduce((sum, f) => sum + f.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 1);
  });

  it('should give higher WhatsApp dependence score when phone is available', () => {
    const withPhone = generatePriorityScore({ phone: '+233501234567', category: 'Retail' });
    const withoutPhone = generatePriorityScore({ category: 'Retail' });

    expect(withPhone.whatsappDependence).toBeGreaterThan(withoutPhone.whatsappDependence);
  });

  it('should give lower ease of access when key contact info is missing', () => {
    const fullInfo = generatePriorityScore({
      phone: '+233501234567',
      address: 'Accra',
      rating: 4.5,
      website: 'https://example.com',
      category: 'General',
    });

    const minimalInfo = generatePriorityScore({ category: 'General' });

    expect(fullInfo.easeOfAccess).toBeGreaterThan(minimalInfo.easeOfAccess);
  });

  it('should handle empty/null/undefined fields gracefully', () => {
    const emptyLead = generatePriorityScore({});

    expect(emptyLead.overall).toBeGreaterThanOrEqual(0);
    expect(emptyLead.factors).toHaveLength(5);
    emptyLead.factors.forEach(factor => {
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(factor.score).toBeLessThanOrEqual(factor.maxScore);
    });
  });

  it('should produce consistent results for the same input', () => {
    const input = {
      rating: 4.2,
      reviewsCount: 50,
      website: 'https://clinic.com',
      digitalPresenceScore: 70,
      category: 'Clinic',
      phone: '+233501234567',
      address: 'Kumasi',
    };

    const result1 = generatePriorityScore(input);
    const result2 = generatePriorityScore(input);

    expect(result1.overall).toBe(result2.overall);
    expect(result1.factors).toEqual(result2.factors);
  });

  it('should score overall between 0 and 100 for all combinations', () => {
    const testCases = [
      { category: 'Hospital', rating: 5, website: 'https://hosp.com', phone: '+233501234567', address: 'Accra', digitalPresenceScore: 90 },
      { category: 'Salon', phone: '+233501234567' },
      { category: 'Gym' },
      { category: 'School', rating: 3.5, website: 'https://school.com' },
      { category: 'Hotel', rating: 4.8, phone: '+233501234567', address: 'Airport Area' },
    ];

    testCases.forEach((tc, i) => {
      const result = generatePriorityScore(tc);
      expect(
        result.overall,
        `Test case ${i} (${tc.category}) — expected overall in [0,100], got ${result.overall}`
      ).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });
  });
});
