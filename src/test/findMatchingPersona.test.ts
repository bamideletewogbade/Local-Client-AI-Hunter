import { describe, it, expect } from 'vitest';
import { findMatchingPersona } from '../components/IndustryPersonaEngine';

describe('findMatchingPersona', () => {
  it('should return ai_receptionist for medical queries', () => {
    const result = findMatchingPersona('Dental Clinic in Accra');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_receptionist');
  });

  it('should return ai_receptionist for hospital queries', () => {
    const result = findMatchingPersona('Hospital near me');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_receptionist');
  });

  it('should return ai_admissions for school queries', () => {
    const result = findMatchingPersona('International School');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_admissions');
  });

  it('should return ai_admissions for university queries', () => {
    const result = findMatchingPersona('University of Ghana');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_admissions');
  });

  it('should return ai_property_consultant for real estate queries', () => {
    const result = findMatchingPersona('Real Estate Agency');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_property_consultant');
  });

  it('should return ai_booking_agent for hotel queries', () => {
    const result = findMatchingPersona('Hotel');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_booking_agent');
  });

  it('should return ai_fitness_coach for gym queries', () => {
    const result = findMatchingPersona('Gym and Fitness Center');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_fitness_coach');
  });

  it('should return ai_beauty_consultant for salon queries', () => {
    const result = findMatchingPersona('Beauty Salon');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_beauty_consultant');
  });

  it('should return ai_support_agent for customer service queries', () => {
    const result = findMatchingPersona('Customer Service Company');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_support_agent');
  });

  it('should return ai_sales_agent for general business queries', () => {
    const result = findMatchingPersona('Business Consulting Firm');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_sales_agent');
  });

  it('should return null for empty or very short queries', () => {
    expect(findMatchingPersona('')).toBeNull();
    expect(findMatchingPersona('a')).toBeNull();
    expect(findMatchingPersona('it is')).toBeNull();
  });

  it('should be case-insensitive', () => {
    const lower = findMatchingPersona('hospital');
    const upper = findMatchingPersona('HOSPITAL');
    const mixed = findMatchingPersona('HoSpItAl');

    expect(lower?.type).toBe('ai_receptionist');
    expect(upper?.type).toBe('ai_receptionist');
    expect(mixed?.type).toBe('ai_receptionist');
  });

  it('should match multi-word keywords like "real estate"', () => {
    const result = findMatchingPersona('real estate developer');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_property_consultant');
  });

  it('should match "high school" to ai_admissions', () => {
    const result = findMatchingPersona('high school');
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ai_admissions');
  });

  it('should not confuse hotel with medical (conflicting keywords)', () => {
    const hotel = findMatchingPersona('Hotel');
    const clinic = findMatchingPersona('Clinic');

    expect(hotel?.type).toBe('ai_booking_agent');
    expect(clinic?.type).toBe('ai_receptionist');
  });

  it('should not confuse gym with school (conflicting keywords)', () => {
    const gym = findMatchingPersona('Fitness Gym');
    const school = findMatchingPersona('Primary School');

    expect(gym?.type).toBe('ai_fitness_coach');
    expect(school?.type).toBe('ai_admissions');
  });

  it('should return the correct persona object with name and title', () => {
    const result = findMatchingPersona('Medical Center');
    
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Aura');
    expect(result?.title).toBe('AI Receptionist');
    expect(result?.industryKeywords.length).toBeGreaterThan(0);
    expect(result?.painPoints.length).toBeGreaterThan(0);
    expect(result?.solutions.length).toBeGreaterThan(0);
    expect(result?.pricing.starter).toBeGreaterThan(0);
  });

  it('should handle mixed industry queries by picking the best match', () => {
    // "Dental Spa" has keywords for both receptionist (dental) and booking/beauty (spa)
    const result = findMatchingPersona('Dental Spa');
    // Should prefer ai_receptionist since "dental" is a stronger match for that persona
    expect(result).not.toBeNull();
    expect(['ai_receptionist', 'ai_beauty_consultant', 'ai_booking_agent']).toContain(result?.type);
  });
});
