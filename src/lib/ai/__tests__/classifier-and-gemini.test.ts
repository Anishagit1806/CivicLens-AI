import { afterEach, describe, expect, it, vi } from 'vitest';
import { runDeterministicTriage } from '@/lib/ai/classifier';
import { analyzeCivicIssue, clearTriageCache } from '@/lib/ai/gemini';

describe('Deterministic civic classifier & fallback', () => {
  it('classifies water leakage near hospital as critical with water_leakage category', () => {
    const result = runDeterministicTriage({
      title: 'Burst drinking water pipeline outside hospital gate',
      description:
        'Major main pipe burst flooding hospital approach road and blocking ambulance lane.',
      locationText: 'Hospital Main Gate',
    });

    expect(result.predictedCategory).toBe('water_leakage');
    expect(result.severity).toBe('critical');
    expect(result.provider).toBe('deterministic-fallback');
    expect(result.recommendations.length).toBeGreaterThanOrEqual(2);
    expect(result.limitationsNote).toContain('deterministic');
  });

  it('classifies Tamil streetlight descriptions accurately', () => {
    const result = runDeterministicTriage({
      title: 'தெருவிளக்கு பழுது மற்றும் மின்சார கம்பி',
      description: 'பள்ளி அருகே தெருவிளக்கு எரியாமல் இருட்டாக உள்ளது மற்றும் மின்கம்பி தொங்குகிறது.',
      locationText: 'மயிலாப்பூர்',
    });

    expect(result.predictedCategory).toBe('damaged_streetlights');
    expect(result.severity).toBe('critical');
  });

  it('assigns low severity to brief non-hazardous reports', () => {
    const result = runDeterministicTriage({
      title: 'Minor bench paint faded',
      description: 'Park bench paint looks slightly worn out.',
      selectedCategory: 'other',
    });

    expect(result.predictedCategory).toBe('other');
    expect(result.severity).toBe('low');
  });
});

describe('Gemini AI server integration & safe fallback', () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    clearTriageCache();
    vi.restoreAllMocks();
  });

  it('falls back gracefully and caches result when GEMINI_API_KEY is absent', async () => {
    delete process.env.GEMINI_API_KEY;
    clearTriageCache();

    const first = await analyzeCivicIssue({
      title: 'Overflowing garbage bin near bus stop',
      description: 'Garbage bin has been overflowing for three days causing bad smell.',
      selectedCategory: 'garbage',
    });
    const second = await analyzeCivicIssue({
      title: 'Overflowing garbage bin near bus stop',
      description: 'Garbage bin has been overflowing for three days causing bad smell.',
      selectedCategory: 'garbage',
    });

    expect(first.provider).toBe('deterministic-fallback');
    expect(first.predictedCategory).toBe('garbage');
    expect(second.cached).toBe(true);
  });
});
