import type { AITriageResult, IssueCategory, IssueSeverity } from '@/types/civic';

interface CategoryRule {
  category: IssueCategory;
  keywords: string[];
  baseUrgency: number;
  baseImpact: number;
  recommendations: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: 'water_leakage',
    keywords: [
      'water',
      'pipe',
      'leak',
      'burst',
      'pipeline',
      'drinking water',
      'contamination',
      'குடிநீர்',
      'குழாய்',
      'கசிவு',
    ],
    baseUrgency: 74,
    baseImpact: 78,
    recommendations: [
      'Dispatch Municipal Water Board rapid-response crew to isolate the main valve and inspect pressure loss.',
      'Test nearby supply lines for backflow contamination and place safety barricades around pooling water.',
      'Schedule permanent pipe joint sealing and restore road surface after pressure testing.',
    ],
  },
  {
    category: 'drainage',
    keywords: [
      'drain',
      'sewage',
      'sewer',
      'manhole',
      'flood',
      'waterlogging',
      'overflow',
      'stormwater',
      'கழிவுநீர்',
      'வடிகால்',
    ],
    baseUrgency: 72,
    baseImpact: 76,
    recommendations: [
      'Deploy desilting jetting unit to clear the blocked stormwater or sewage line.',
      'Inspect and secure open or damaged manhole covers immediately to prevent pedestrian accidents.',
      'Apply vector-control sanitization around stagnant water zones and log preventive cleaning.',
    ],
  },
  {
    category: 'damaged_streetlights',
    keywords: [
      'streetlight',
      'street light',
      'lamp',
      'dark',
      'pole',
      'bulb',
      'electric',
      'wire',
      'spark',
      'தெருவிளக்கு',
      'மின்சார',
    ],
    baseUrgency: 66,
    baseImpact: 70,
    recommendations: [
      'Route electrical maintenance team to inspect pole wiring, MCB breaker, and luminaire fixture.',
      'If exposed wiring or leaning pole is reported, isolate power feed and cordon off the radius.',
      'Upgrade faulty fixture to energy-efficient LED luminaire and verify dusk-to-dawn timer.',
    ],
  },
  {
    category: 'potholes',
    keywords: [
      'pothole',
      'crater',
      'pit',
      'cavity',
      'two-wheeler',
      'bike',
      'tyre',
      'குழி',
      'பள்ளம்',
    ],
    baseUrgency: 68,
    baseImpact: 74,
    recommendations: [
      'Place reflective warning cones around deep road depressions during peak traffic hours.',
      'Dispatch cold-mix or hot-mix asphalt patching unit to level and compact the carriageway.',
      'Inspect surrounding 20m stretch for sub-base water seepage causing recurring potholes.',
    ],
  },
  {
    category: 'road_damage',
    keywords: [
      'road',
      'asphalt',
      'pavement',
      'sinkhole',
      'crack',
      'divider',
      'footpath',
      'bridge',
      'சாலை',
      'உடைப்பு',
    ],
    baseUrgency: 70,
    baseImpact: 78,
    recommendations: [
      'Conduct structural road-bed assessment to rule out underground utility erosion or sinkhole risk.',
      'Divert heavy vehicles if lane width is compromised and install temporary steel plates if needed.',
      'Assign Roads & Highways engineering crew for resurfacing and kerb restoration.',
    ],
  },
  {
    category: 'garbage',
    keywords: [
      'garbage',
      'trash',
      'waste',
      'dump',
      'bin',
      'sanitation',
      'smell',
      'stray',
      'குப்பை',
      'துர்நாற்றம்',
    ],
    baseUrgency: 60,
    baseImpact: 68,
    recommendations: [
      'Schedule immediate compactor collection truck clearance for accumulated mixed waste.',
      'Sanitize the bin perimeter and replace damaged or overflowing community waste bins.',
      'Review daily collection route adherence for this ward to prevent repeat dumping.',
    ],
  },
];

const CRITICAL_HAZARD_TERMS = [
  'hospital',
  'school',
  'ambulance',
  'accident',
  'injury',
  'live wire',
  'sparking',
  'sinkhole',
  'flooding',
  'collapsed',
  'toxic',
  'sewage overflow',
  'highway',
  'emergency',
  'children',
  'மருத்துவமனை',
  'பள்ளி',
  'விபத்து',
];

const HIGH_HAZARD_TERMS = [
  'main road',
  'junction',
  'intersection',
  'bus stop',
  'darkness',
  'broken',
  'deep',
  'days',
  'week',
  'traffic',
  'pedestrian',
  'foul smell',
  'drinking',
  'நெரிசல்',
];

export function runDeterministicTriage(params: {
  title: string;
  description: string;
  selectedCategory?: IssueCategory;
  locationText?: string;
}): AITriageResult {
  const combined = `${params.title} ${params.description} ${params.locationText ?? ''}`.toLowerCase();

  let bestRule: CategoryRule | null = null;
  let bestHits = 0;

  for (const rule of CATEGORY_RULES) {
    let hits = 0;
    for (const kw of rule.keywords) {
      if (combined.includes(kw)) {
        hits += 1;
      }
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestRule = rule;
    }
  }

  const predictedCategory: IssueCategory =
    bestRule?.category ?? params.selectedCategory ?? 'other';

  const criticalHits = CRITICAL_HAZARD_TERMS.filter((t) => combined.includes(t)).length;
  const highHits = HIGH_HAZARD_TERMS.filter((t) => combined.includes(t)).length;

  let urgencyScore = bestRule?.baseUrgency ?? 52;
  let publicImpactScore = bestRule?.baseImpact ?? 55;

  urgencyScore = Math.min(98, urgencyScore + criticalHits * 11 + highHits * 5);
  publicImpactScore = Math.min(98, publicImpactScore + criticalHits * 10 + highHits * 5);

  let severity: IssueSeverity = 'medium';
  if (criticalHits >= 1 || urgencyScore >= 88) {
    severity = 'critical';
  } else if (highHits >= 2 || urgencyScore >= 72) {
    severity = 'high';
  } else if (bestHits === 0 && highHits === 0 && params.description.length < 60) {
    severity = 'low';
    urgencyScore = Math.min(urgencyScore, 42);
    publicImpactScore = Math.min(publicImpactScore, 45);
  }

  const confidence =
    bestHits >= 3 ? 0.88 : bestHits === 2 ? 0.79 : bestHits === 1 ? 0.68 : 0.54;

  const hazardSummary =
    criticalHits > 0
      ? `Detected ${criticalHits} high-risk safety/sensitive-zone indicator(s) near public infrastructure.`
      : highHits > 0
        ? `Detected ${highHits} commuter or neighborhood impact indicator(s) requiring timely municipal intervention.`
        : 'Standard civic maintenance priority inferred from category and description context.';

  const recommendations = bestRule?.recommendations ?? [
    'Assign municipal field inspector to verify site conditions and confirm responsible department.',
    'Document photographic evidence on site and establish safe pedestrian clearance.',
    'Update citizen tracker with target SLA completion window.',
  ];

  return {
    predictedCategory,
    confidence,
    severity,
    severityExplanation: `${hazardSummary} Deterministic rule-based triage scored urgency at ${urgencyScore}/100 and public impact at ${publicImpactScore}/100.`,
    urgencyScore,
    publicImpactScore,
    recommendations,
    provider: 'deterministic-fallback',
    limitationsNote:
      'Generated using deterministic rule-based classification (keyword & hazard heuristics). It does not inspect photographic pixel content when running offline or without Gemini API.',
  };
}
