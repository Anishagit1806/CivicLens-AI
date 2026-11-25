import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { calculatePriority } from '@/lib/domain/priority';
import { runDeterministicTriage } from '@/lib/ai/classifier';
import type {
  CivicIssuePublic,
  IssueHistoryEntry,
  SupportedLocale,
  UserNotification,
  UserRole,
} from '@/types/civic';

export interface DemoUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  preferredLanguage: SupportedLocale;
  passwordHash: string;
  createdAt: string;
}

export interface DemoStoreState {
  sequenceCounter: number;
  users: DemoUserRecord[];
  issues: CivicIssuePublic[];
  history: IssueHistoryEntry[];
  notifications: UserNotification[];
  upvotedByUser: Record<string, string[]>;
}

export function getDataDir(): string {
  const configured = process.env.CIVICLENS_DATA_DIR;
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), '.civiclens-data');
}

function getStoreFilePath(): string {
  return path.join(getDataDir(), 'store.json');
}

export function getUploadsDir(): string {
  return path.join(getDataDir(), 'uploads');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function buildSeedState(): DemoStoreState {
  const citizenId = '11111111-1111-4111-8111-111111111111';
  const citizenTwoId = '22222222-2222-4222-8222-222222222222';
  const adminId = '99999999-9999-4999-8999-999999999999';

  const users: DemoUserRecord[] = [
    {
      id: citizenId,
      email: 'citizen@civiclens.local',
      fullName: 'Arjun Subramanian',
      role: 'citizen',
      preferredLanguage: 'en',
      passwordHash: hashPassword('Citizen123!'),
      createdAt: '2026-11-18T08:00:00.000Z',
    },
    {
      id: citizenTwoId,
      email: 'kavitha@civiclens.local',
      fullName: 'Kavitha Natarajan',
      role: 'citizen',
      preferredLanguage: 'ta',
      passwordHash: hashPassword('Citizen123!'),
      createdAt: '2026-11-19T08:00:00.000Z',
    },
    {
      id: adminId,
      email: 'admin@civiclens.local',
      fullName: 'Municipal Operations Officer',
      role: 'admin',
      preferredLanguage: 'en',
      passwordHash: hashPassword('Admin123!'),
      createdAt: '2026-11-15T08:00:00.000Z',
    },
  ];

  const seedRaw = [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      referenceCode: 'CL-2026-1001',
      reporterId: citizenId,
      title: 'Burst drinking water pipeline flooding hospital approach road',
      description:
        'Main distribution pipeline ruptured outside Rajiv Gandhi Hospital Gate 2 causing high-pressure water wastage, muddy pooling, and ambulance slowdown.',
      category: 'water_leakage' as const,
      locationText: 'EVR Periyar Salai, Hospital Gate 2',
      wardOrZone: 'Ward 58 - Park Town',
      latitude: 13.0815,
      longitude: 80.2755,
      status: 'in_progress' as const,
      assignedDepartment: 'Metro Water Rapid Response',
      assignedToLabel: 'Zone 5 Pipeline Crew',
      upvoteCount: 6,
      createdAt: '2026-11-22T06:30:00.000Z',
      updatedAt: '2026-11-23T09:15:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      referenceCode: 'CL-2026-1002',
      reporterId: citizenTwoId,
      title: 'Deep waterlogged pothole cluster near Anna Flyover bus bay',
      description:
        'Three interconnected craters over 20 cm deep on the left commuter lane causing sudden swerving and two-wheeler skids during peak evening traffic.',
      category: 'potholes' as const,
      locationText: 'Anna Salai, Gemini Circle Southbound',
      wardOrZone: 'Ward 114 - Teynampet',
      latitude: 13.0524,
      longitude: 80.2512,
      status: 'verified' as const,
      assignedDepartment: 'Highways & Asphalt Maintenance',
      assignedToLabel: null,
      upvoteCount: 4,
      createdAt: '2026-11-23T11:20:00.000Z',
      updatedAt: '2026-11-24T08:10:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      referenceCode: 'CL-2026-1003',
      reporterId: citizenId,
      title: 'Exposed live wiring on tilted streetlight pole near school crossing',
      description:
        'Streetlight pole #SL-418 is leaning 20 degrees with damaged junction cover and visible sparking wires directly beside Government High School pedestrian crossing.',
      category: 'damaged_streetlights' as const,
      locationText: 'Luz Church Road, Mylapore',
      wardOrZone: 'Ward 124 - Mylapore',
      latitude: 13.0368,
      longitude: 80.2676,
      status: 'assigned' as const,
      assignedDepartment: 'Electrical Maintenance Wing',
      assignedToLabel: 'South Electrical Squad B',
      upvoteCount: 5,
      createdAt: '2026-11-23T15:40:00.000Z',
      updatedAt: '2026-11-24T10:00:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      referenceCode: 'CL-2026-1004',
      reporterId: citizenTwoId,
      title: 'Blocked stormwater drain causing sewage backflow into residential lane',
      description:
        'Silt and plastic debris have completely clogged the stormwater grate for four days, forcing foul stagnant water over the footpath and school bus stop.',
      category: 'drainage' as const,
      locationText: '2nd Avenue, Anna Nagar East',
      wardOrZone: 'Ward 102 - Anna Nagar',
      latitude: 13.085,
      longitude: 80.2101,
      status: 'submitted' as const,
      assignedDepartment: null,
      assignedToLabel: null,
      upvoteCount: 3,
      createdAt: '2026-11-24T07:45:00.000Z',
      updatedAt: '2026-11-24T07:45:00.000Z',
      resolvedAt: null,
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
      referenceCode: 'CL-2026-1005',
      reporterId: citizenId,
      title: 'Overflowing community garbage compactor bin attracting stray animals',
      description:
        'Uncollected mixed municipal waste spilling onto the service road for 72 hours, blocking pedestrian walkway and causing severe foul odor.',
      category: 'garbage' as const,
      locationText: 'Lattice Bridge Road, Adyar',
      wardOrZone: 'Ward 173 - Adyar',
      latitude: 13.0067,
      longitude: 80.257,
      status: 'resolved' as const,
      assignedDepartment: 'Solid Waste Management',
      assignedToLabel: 'Adyar Compactor Unit 4',
      upvoteCount: 2,
      createdAt: '2026-11-19T05:00:00.000Z',
      updatedAt: '2026-11-20T14:30:00.000Z',
      resolvedAt: '2026-11-20T14:30:00.000Z',
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6',
      referenceCode: 'CL-2026-1006',
      reporterId: citizenTwoId,
      title: 'Collapsed pavement kerb and eroded road shoulder near metro station',
      description:
        'Heavy monsoon runoff washed out 8 meters of pavement edge creating a sharp drop next to pedestrian exit.',
      category: 'road_damage' as const,
      locationText: '100 Feet Road, Vadapalani',
      wardOrZone: 'Ward 130 - Kodambakkam',
      latitude: 13.0507,
      longitude: 80.2121,
      status: 'resolved' as const,
      assignedDepartment: 'Roads & Bridges Engineering',
      assignedToLabel: 'West Civil Division',
      upvoteCount: 3,
      createdAt: '2026-11-18T09:00:00.000Z',
      updatedAt: '2026-11-21T16:20:00.000Z',
      resolvedAt: '2026-11-21T16:20:00.000Z',
    },
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7',
      referenceCode: 'CL-2026-1007',
      reporterId: citizenId,
      title: 'Dark stretch of 4 non-working streetlights along pedestrian underpass',
      description:
        'Four consecutive LED streetlamps have remained off for five nights, reducing visibility for evening commuters exiting the suburban rail station.',
      category: 'damaged_streetlights' as const,
      locationText: 'GST Road, Guindy Station Approach',
      wardOrZone: 'Ward 142 - Guindy',
      latitude: 13.0085,
      longitude: 80.2127,
      status: 'submitted' as const,
      assignedDepartment: null,
      assignedToLabel: null,
      upvoteCount: 2,
      createdAt: '2026-11-25T04:15:00.000Z',
      updatedAt: '2026-11-25T04:15:00.000Z',
      resolvedAt: null,
    },
  ];

  const issues: CivicIssuePublic[] = seedRaw.map((raw) => {
    const triage = runDeterministicTriage({
      title: raw.title,
      description: raw.description,
      selectedCategory: raw.category,
      locationText: raw.locationText,
    });
    const priority = calculatePriority({
      severity: triage.severity,
      urgencyScore: triage.urgencyScore,
      publicImpactScore: triage.publicImpactScore,
      upvoteCount: raw.upvoteCount,
    });

    return {
      id: raw.id,
      referenceCode: raw.referenceCode,
      reporterId: raw.reporterId,
      reporterLabel: 'Verified Citizen',
      title: raw.title,
      description: raw.description,
      category: raw.category,
      aiPredictedCategory: triage.predictedCategory,
      aiCategoryConfidence: triage.confidence,
      aiProvider: triage.provider,
      severity: triage.severity,
      severityExplanation: triage.severityExplanation,
      urgencyScore: triage.urgencyScore,
      publicImpactScore: triage.publicImpactScore,
      priorityScore: priority.priorityScore,
      priorityBreakdown: priority.breakdown,
      aiRecommendations: triage.recommendations,
      aiLimitationsNote: triage.limitationsNote,
      locationText: raw.locationText,
      wardOrZone: raw.wardOrZone,
      latitude: raw.latitude,
      longitude: raw.longitude,
      imageUrl: null,
      imageAlt: null,
      status: raw.status,
      assignedDepartment: raw.assignedDepartment,
      assignedToLabel: raw.assignedToLabel,
      duplicateOfId: null,
      duplicateSimilarity: null,
      upvoteCount: raw.upvoteCount,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      resolvedAt: raw.resolvedAt,
    };
  });

  const history: IssueHistoryEntry[] = [
    {
      id: 'hist-1001-1',
      issueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      actorRole: 'citizen',
      action: 'report_submitted',
      fromStatus: null,
      toStatus: 'submitted',
      note: 'Initial citizen report logged with GPS coordinates.',
      createdAt: '2026-11-22T06:30:00.000Z',
    },
    {
      id: 'hist-1001-2',
      issueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      actorRole: 'admin',
      action: 'status_updated',
      fromStatus: 'submitted',
      toStatus: 'in_progress',
      note: 'Verified hospital access impact; dispatched Zone 5 Pipeline Crew.',
      createdAt: '2026-11-23T09:15:00.000Z',
    },
    {
      id: 'hist-1005-1',
      issueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
      actorRole: 'admin',
      action: 'resolved',
      fromStatus: 'in_progress',
      toStatus: 'resolved',
      note: 'Waste cleared and bin perimeter sanitized.',
      createdAt: '2026-11-20T14:30:00.000Z',
    },
  ];

  const notifications: UserNotification[] = [
    {
      id: 'notif-1',
      userId: citizenId,
      issueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      title: 'CL-2026-1001 is now In Progress',
      message: 'Zone 5 Pipeline Crew has been dispatched to EVR Periyar Salai.',
      isRead: false,
      createdAt: '2026-11-23T09:15:00.000Z',
    },
    {
      id: 'notif-2',
      userId: citizenId,
      issueId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',
      title: 'CL-2026-1005 marked Resolved',
      message: 'Adyar Compactor Unit 4 completed waste clearance at Lattice Bridge Road.',
      isRead: true,
      createdAt: '2026-11-20T14:30:00.000Z',
    },
  ];

  return {
    sequenceCounter: 1007,
    users,
    issues,
    history,
    notifications,
    upvotedByUser: {},
  };
}

export function readDemoStore(): DemoStoreState {
  const filePath = getStoreFilePath();
  if (!fs.existsSync(filePath)) {
    const initial = buildSeedState();
    writeDemoStore(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as DemoStoreState;
  } catch {
    const fallback = buildSeedState();
    writeDemoStore(fallback);
    return fallback;
  }
}

export function writeDemoStore(state: DemoStoreState): void {
  const dir = getDataDir();
  fs.mkdirSync(dir, { recursive: true });
  const filePath = getStoreFilePath();
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export function resetDemoStore(): DemoStoreState {
  const fresh = buildSeedState();
  writeDemoStore(fresh);
  return fresh;
}
