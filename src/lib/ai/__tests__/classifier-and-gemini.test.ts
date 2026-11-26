import { afterEach, describe, expect, it, vi } from 'vitest';
import { runDeterministicTriage } from '@/lib/ai/classifier';
import { analyzeCivicIssue, clearTriageCache } from '@/lib/ai/gemini';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: mockGenerateContent,
    };
  },
}));

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
      description:
        'பள்ளி அருகே தெருவிளக்கு எரியாமல் இருட்டாக உள்ளது மற்றும் மின்கம்பி தொங்குகிறது.',
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
    mockGenerateContent.mockReset();
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

  it('parses structured Gemini JSON (including fenced JSON) and validates with Zod', async () => {
    process.env.GEMINI_API_KEY = 'test-server-gemini-key-value';
    clearTriageCache();

    mockGenerateContent.mockResolvedValueOnce({
      text: [
        '```json',
        JSON.stringify({
          predictedCategory: 'drainage',
          confidence: 0.92,
          severity: 'high',
          severityExplanation:
            'Blocked stormwater culvert is causing knee-deep waterlogging beside a transit stop.',
          urgencyScore: 84,
          publicImpactScore: 82,
          recommendations: [
            'Dispatch hydro-jetting desilting unit immediately.',
            'Deploy temporary pedestrian safety barriers.',
          ],
        }),
        '```',
      ].join('\n'),
    });

    const result = await analyzeCivicIssue({
      title: 'Severe stormwater drain overflow near bus terminal',
      description:
        'Stormwater drain is completely choked causing knee-deep flooding across the bus bay.',
      selectedCategory: 'drainage',
      locationText: 'Koyambedu Bus Terminus',
    });

    expect(result.provider).toBe('gemini');
    expect(result.predictedCategory).toBe('drainage');
    expect(result.severity).toBe('high');
    expect(result.confidence).toBe(0.92);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('falls back safely when Gemini returns invalid schema or throws', async () => {
    process.env.GEMINI_API_KEY = 'test-server-gemini-key-value';
    clearTriageCache();

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({ invalidField: true }),
    });

    const result = await analyzeCivicIssue({
      title: 'Large pothole near main market road',
      description: 'Deep asphalt pothole damaging vehicles near the vegetable market entrance.',
      selectedCategory: 'potholes',
    });

    expect(result.provider).toBe('deterministic-fallback');
    expect(result.predictedCategory).toBe('potholes');
  });
});
