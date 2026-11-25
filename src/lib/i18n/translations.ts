import type {
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  SupportedLocale,
} from '@/types/civic';

export interface TranslationDictionary {
  brandName: string;
  brandTagline: string;
  nav: {
    home: string;
    explore: string;
    map: string;
    report: string;
    dashboard: string;
    admin: string;
    analytics: string;
    login: string;
    register: string;
    logout: string;
  };
  modeBanner: {
    demoTitle: string;
    demoSubtitle: string;
    supabaseTitle: string;
    unconfiguredTitle: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    statReports: string;
    statResolved: string;
    statAvgPriority: string;
    statCriticalOpen: string;
  };
  workflow: {
    heading: string;
    subheading: string;
    steps: Array<{ title: string; detail: string }>;
  };
  categories: Record<IssueCategory, string>;
  severities: Record<IssueSeverity, string>;
  statuses: Record<IssueStatus, string>;
  reportForm: {
    heading: string;
    subheading: string;
    titleLabel: string;
    titlePlaceholder: string;
    categoryLabel: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    locationLabel: string;
    locationPlaceholder: string;
    wardLabel: string;
    latitudeLabel: string;
    longitudeLabel: string;
    useCurrentLocation: string;
    photoLabel: string;
    photoHint: string;
    photoAltLabel: string;
    photoAltPlaceholder: string;
    previewAiButton: string;
    submitButton: string;
    submitting: string;
    duplicateWarningTitle: string;
    duplicateWarningBody: string;
  };
  explorer: {
    heading: string;
    subheading: string;
    searchPlaceholder: string;
    allCategories: string;
    allSeverities: string;
    allStatuses: string;
    sortByPriority: string;
    sortByNewest: string;
    sortByOldest: string;
    sortByUpvotes: string;
    emptyTitle: string;
    emptyBody: string;
    upvote: string;
    viewDetails: string;
  };
  detail: {
    backToExplore: string;
    aiTriageHeading: string;
    priorityBreakdownHeading: string;
    recommendationsHeading: string;
    historyHeading: string;
    limitationsHeading: string;
    duplicateNotice: string;
    assignedDept: string;
    wardLabel: string;
    coordinatesLabel: string;
  };
  admin: {
    heading: string;
    subheading: string;
    verifyAndAssign: string;
    updateStatus: string;
    departmentLabel: string;
    assigneeLabel: string;
    noteLabel: string;
    saveDecision: string;
    unauthorizedTitle: string;
    unauthorizedBody: string;
  };
  analytics: {
    heading: string;
    subheading: string;
    totalReports: string;
    resolutionRate: string;
    avgResolutionHours: string;
    duplicateClusters: string;
    byCategoryHeading: string;
    bySeverityHeading: string;
    byStatusHeading: string;
    byWardHeading: string;
  };
  common: {
    loading: string;
    errorPrefix: string;
    previous: string;
    next: string;
    pageOf: string;
    priorityScore: string;
    confidence: string;
    geminiLabel: string;
    fallbackLabel: string;
    skipToContent: string;
  };
}

export const TRANSLATIONS: Record<SupportedLocale, TranslationDictionary> = {
  en: {
    brandName: 'CivicLens AI',
    brandTagline: 'Intelligent Civic Infrastructure Triage & Resolution',
    nav: {
      home: 'Overview',
      explore: 'Issue Explorer',
      map: 'Live Map',
      report: 'Report Issue',
      dashboard: 'My Dashboard',
      admin: 'Admin Triage',
      analytics: 'Analytics',
      login: 'Sign In',
      register: 'Register',
      logout: 'Sign Out',
    },
    modeBanner: {
      demoTitle: 'Local Demo Store Active',
      demoSubtitle:
        'Running with isolated local persistence and deterministic/server AI triage because Supabase environment variables are not configured. Clearly separated from live cloud deployment.',
      supabaseTitle: 'Connected to Supabase PostgreSQL + Auth + RLS',
      unconfiguredTitle: 'Configuration Required: Set Supabase environment variables or enable demo mode.',
    },
    hero: {
      eyebrow: 'Smart-City Public Infrastructure Governance',
      title: 'Turn citizen reports into prioritized, accountable municipal action.',
      subtitle:
        'CivicLens AI combines structured Gemini triage, transparent priority scoring, spatial duplicate detection, and verifiable municipal status tracking in English and Tamil.',
      primaryCta: 'Report a Civic Issue',
      secondaryCta: 'Explore Live Issues',
      statReports: 'Total Tracked Reports',
      statResolved: 'Resolved Issues',
      statAvgPriority: 'Avg Priority Score',
      statCriticalOpen: 'Open High/Critical',
    },
    workflow: {
      heading: 'End-to-End Civic Resolution Pipeline',
      subheading:
        'Every submission passes through verifiable validation, AI-assisted classification, spatial deduplication, and human-authorized municipal dispatch.',
      steps: [
        {
          title: '1. Citizen Reports with Geo & Photo Evidence',
          detail: 'Validated location, coordinates, description, and compressed image.',
        },
        {
          title: '2. AI Triage & Severity Explanation',
          detail: 'Gemini structured JSON (or deterministic fallback) classifies & explains risk.',
        },
        {
          title: '3. Duplicate & Priority Engine',
          detail: 'Haversine proximity + text similarity catches duplicates; transparent weighted score ranks work.',
        },
        {
          title: '4. Admin Verification & Resolution Tracking',
          detail: 'Authorized officials verify, assign departments, and log auditable updates.',
        },
      ],
    },
    categories: {
      potholes: 'Potholes',
      garbage: 'Garbage & Sanitation',
      water_leakage: 'Water Leakage',
      damaged_streetlights: 'Damaged Streetlights',
      drainage: 'Drainage & Flooding',
      road_damage: 'Road Damage',
      other: 'Other Civic Issues',
    },
    severities: {
      low: 'Low Severity',
      medium: 'Medium Severity',
      high: 'High Severity',
      critical: 'Critical Severity',
    },
    statuses: {
      submitted: 'Submitted',
      verified: 'Verified',
      assigned: 'Assigned',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      rejected: 'Rejected',
    },
    reportForm: {
      heading: 'Submit a Civic Infrastructure Report',
      subheading:
        'Provide clear details and location coordinates. AI triage assists municipal engineers; all priority calculations remain transparent.',
      titleLabel: 'Issue Title',
      titlePlaceholder: 'e.g., Deep pothole near Government Hospital bus stop',
      categoryLabel: 'Issue Category',
      descriptionLabel: 'Detailed Description',
      descriptionPlaceholder:
        'Describe the hazard, duration, traffic or pedestrian impact, and nearby landmarks...',
      locationLabel: 'Street Address / Landmark',
      locationPlaceholder: 'e.g., Anna Salai Junction, opposite Metro Gate B',
      wardLabel: 'Ward / Municipal Zone',
      latitudeLabel: 'Latitude',
      longitudeLabel: 'Longitude',
      useCurrentLocation: 'Use Browser GPS',
      photoLabel: 'Evidence Photograph (Optional)',
      photoHint: 'JPEG, PNG, or WebP up to 5 MB. Automatically resized and verified on upload.',
      photoAltLabel: 'Photo Description (Accessibility Alt Text)',
      photoAltPlaceholder: 'e.g., Waterlogged pothole spanning half of the left traffic lane',
      previewAiButton: 'Preview AI Triage & Duplicate Check',
      submitButton: 'Submit Official Report',
      submitting: 'Submitting & Running Triage...',
      duplicateWarningTitle: 'Potential Duplicate Reports Detected Nearby',
      duplicateWarningBody:
        'Existing open reports were found within 400 meters with similar descriptions. Review them before creating a duplicate, or submit to corroborate.',
    },
    explorer: {
      heading: 'Public Civic Issue Explorer',
      subheading: 'Search, filter, sort, and verify municipal infrastructure reports.',
      searchPlaceholder: 'Search by title, street, ward, or reference code...',
      allCategories: 'All Categories',
      allSeverities: 'All Severities',
      allStatuses: 'All Statuses',
      sortByPriority: 'Highest Priority',
      sortByNewest: 'Newest First',
      sortByOldest: 'Oldest First',
      sortByUpvotes: 'Most Corroborated',
      emptyTitle: 'No matching civic issues found',
      emptyBody: 'Try broadening your search terms or clearing active category and status filters.',
      upvote: 'Corroborate Issue',
      viewDetails: 'Inspect Report',
    },
    detail: {
      backToExplore: 'Back to Issue Explorer',
      aiTriageHeading: 'AI Classification & Severity Assessment',
      priorityBreakdownHeading: 'Transparent Priority Score Formula',
      recommendationsHeading: 'Recommended Municipal Actions',
      historyHeading: 'Auditable Status History',
      limitationsHeading: 'AI Scope & Limitations',
      duplicateNotice: 'Linked as a related/duplicate report',
      assignedDept: 'Assigned Department',
      wardLabel: 'Ward / Zone',
      coordinatesLabel: 'Coordinates',
    },
    admin: {
      heading: 'Municipal Admin Triage Console',
      subheading:
        'Verify citizen submissions, merge duplicate reports, assign engineering departments, and advance official status.',
      verifyAndAssign: 'Review & Update Workflow',
      updateStatus: 'Status',
      departmentLabel: 'Assigned Department',
      assigneeLabel: 'Field Team / Officer Label',
      noteLabel: 'Official Audit Note',
      saveDecision: 'Save Official Update',
      unauthorizedTitle: 'Administrator Authorization Required',
      unauthorizedBody:
        'Only authenticated accounts with the administrator role can verify, assign, or alter civic report statuses.',
    },
    analytics: {
      heading: 'Municipal Resolution Analytics',
      subheading: 'Computed directly from stored civic issue records with zero fabricated metrics.',
      totalReports: 'Total Stored Reports',
      resolutionRate: 'Resolution Rate',
      avgResolutionHours: 'Mean Time to Resolve',
      duplicateClusters: 'Flagged Duplicates',
      byCategoryHeading: 'Reports by Category',
      bySeverityHeading: 'Severity Distribution',
      byStatusHeading: 'Workflow Status Pipeline',
      byWardHeading: 'Load by Municipal Ward',
    },
    common: {
      loading: 'Loading civic data...',
      errorPrefix: 'Error:',
      previous: 'Previous',
      next: 'Next',
      pageOf: 'Page',
      priorityScore: 'Priority Score',
      confidence: 'Confidence',
      geminiLabel: 'Gemini AI',
      fallbackLabel: 'Deterministic Fallback',
      skipToContent: 'Skip to main content',
    },
  },
  ta: {
    brandName: 'CivicLens AI',
    brandTagline: 'அறிவார்ந்த நகராட்சி அடிப்படை வசதி கண்காணிப்பு தளம்',
    nav: {
      home: 'முகப்பு',
      explore: 'புகார் பட்டியல்',
      map: 'வரைபடம்',
      report: 'புகார் பதிவு',
      dashboard: 'என் பலகை',
      admin: 'நிர்வாக பிரிவு',
      analytics: 'பகுப்பாய்வு',
      login: 'உள்நுழைக',
      register: 'பதிவு செய்க',
      logout: 'வெளியேறு',
    },
    modeBanner: {
      demoTitle: 'உள்ளூர் டெமோ சேமிப்பகம் செயல்பாட்டில் உள்ளது',
      demoSubtitle:
        'Supabase சூழல் மாறிகள் அமைக்கப்படாததால் உள்ளூர் சேமிப்பகம் மற்றும் விதி-அடிப்படையிலான/சேவையக AI மதிப்பீடு பயன்படுத்தப்படுகிறது.',
      supabaseTitle: 'Supabase PostgreSQL + Auth + RLS உடன் இணைக்கப்பட்டுள்ளது',
      unconfiguredTitle: 'அமைப்பு தேவை: Supabase மாறிகள் அல்லது டெமோ பயன்முறையை இயக்கவும்.',
    },
    hero: {
      eyebrow: 'ஸ்மார்ட் சிட்டி பொது உள்கட்டமைப்பு மேலாண்மை',
      title: 'குடிமக்கள் புகார்களை முன்னுரிமைப்படுத்தப்பட்ட நகராட்சி நடவடிக்கையாக மாற்றுங்கள்.',
      subtitle:
        'CivicLens AI, Gemini பகுப்பாய்வு, வெளிப்படையான முன்னுரிமை மதிப்பெண், இரட்டைப் புகார் கண்டறிதல் மற்றும் தமிழ்-ஆங்கில நிலை கண்காணிப்பை ஒருங்கிணைக்கிறது.',
      primaryCta: 'புதிய புகார் பதிவு செய்க',
      secondaryCta: 'புகார்களைப் பார்க்கவும்',
      statReports: 'மொத்த புகார்கள்',
      statResolved: 'தீர்க்கப்பட்டவை',
      statAvgPriority: 'சராசரி முன்னுரிமை',
      statCriticalOpen: 'அவசர நிலுவைகள்',
    },
    workflow: {
      heading: 'முழுமையான புகார் தீர்வு செயல்முறை',
      subheading:
        'ஒவ்வொரு புகாரும் சரிபார்ப்பு, AI வகைப்பாடு, இடஞ்சார்ந்த இரட்டைப் புகார் ஆய்வு மற்றும் அதிகாரப்பூர்வ ஒதுக்கீடு வழியாகச் செல்கிறது.',
      steps: [
        {
          title: '1. புகைப்படம் & இடத்துடன் புகார்',
          detail: 'சரிபார்க்கப்பட்ட முகவரி, GPS ஆயத்தொலைவுகள் மற்றும் சுருக்கப்பட்ட புகைப்படம்.',
        },
        {
          title: '2. AI வகைப்பாடு & தீவிர விளக்கம்',
          detail: 'Gemini JSON (அல்லது மாற்று விதி இயந்திரம்) அபாயத்தை விளக்குகிறது.',
        },
        {
          title: '3. இரட்டைப் புகார் & முன்னுரிமை',
          detail: 'Haversine தூரம் + உரை ஒற்றுமை இரட்டைப் புகார்களைக் கண்டறிகிறது.',
        },
        {
          title: '4. நிர்வாக சரிபார்ப்பு & தீர்வு',
          detail: 'அதிகாரிகள் சரிபார்த்து, துறைகளுக்கு ஒதுக்கி, நிலை மாற்றங்களைப் பதிவு செய்கின்றனர்.',
        },
      ],
    },
    categories: {
      potholes: 'சாலைக் குழிகள்',
      garbage: 'குப்பை & சுகாதாரம்',
      water_leakage: 'குடிநீர் கசிவு',
      damaged_streetlights: 'பழுதடைந்த தெருவிளக்குகள்',
      drainage: 'வடிகால் & வெள்ளம்',
      road_damage: 'சாலை சேதம்',
      other: 'பிற நகராட்சி புகார்கள்',
    },
    severities: {
      low: 'குறைந்த தீவிரம்',
      medium: 'நடுத்தர தீவிரம்',
      high: 'அதிக தீவிரம்',
      critical: 'மிக அவசரம்',
    },
    statuses: {
      submitted: 'சமர்ப்பிக்கப்பட்டது',
      verified: 'சரிபார்க்கப்பட்டது',
      assigned: 'ஒதுக்கப்பட்டது',
      in_progress: 'பணி நடைபெறுகிறது',
      resolved: 'தீர்க்கப்பட்டது',
      rejected: 'நிராகரிக்கப்பட்டது',
    },
    reportForm: {
      heading: 'நகராட்சி உள்கட்டமைப்பு புகார் பதிவு',
      subheading:
        'தெளிவான விவரங்கள் மற்றும் ஆயத்தொலைவுகளை உள்ளிடவும். AI மதிப்பீடு பொறியாளர்களுக்கு உதவுகிறது.',
      titleLabel: 'புகார் தலைப்பு',
      titlePlaceholder: 'எ.கா., அரசு மருத்துவமனை பேருந்து நிறுத்தம் அருகே ஆழமான குழி',
      categoryLabel: 'புகார் வகை',
      descriptionLabel: 'விரிவான விளக்கம்',
      descriptionPlaceholder:
        'அபாயம், எத்தனை நாட்களாக உள்ளது, போக்குவரத்து பாதிப்பு மற்றும் அருகிலுள்ள அடையாளங்களை எழுதவும்...',
      locationLabel: 'தெரு முகவரி / அடையாளம்',
      locationPlaceholder: 'எ.கா., அண்ணா சாலை சந்திப்பு, மெட்ரோ நுழைவாயில் B எதிரில்',
      wardLabel: 'வார்டு / மண்டலம்',
      latitudeLabel: 'அட்சரேகை (Latitude)',
      longitudeLabel: 'தீர்க்கரேகை (Longitude)',
      useCurrentLocation: 'தற்போதைய GPS இடம்',
      photoLabel: 'ஆதாரப் புகைப்படம் (விருப்பம்)',
      photoHint: 'JPEG, PNG, அல்லது WebP (அதிகபட்சம் 5 MB). பதிவேற்றும்போது சரிபார்க்கப்படும்.',
      photoAltLabel: 'புகைப்பட மாற்று உரை (Accessibility Alt Text)',
      photoAltPlaceholder: 'எ.கா., இடதுபுற சாலையில் நீர் தேங்கிய பெரிய குழி',
      previewAiButton: 'AI மதிப்பீடு & இரட்டைப் புகார் சோதனை',
      submitButton: 'அதிகாரப்பூர்வ புகாரை சமர்ப்பி',
      submitting: 'சமர்ப்பிக்கிறது & பகுப்பாய்வு செய்கிறது...',
      duplicateWarningTitle: 'அருகில் ஒரே மாதிரியான புகார்கள் கண்டறியப்பட்டன',
      duplicateWarningBody:
        '400 மீட்டர் சுற்றளவில் ஒத்த திறந்த புகார்கள் உள்ளன. சமர்ப்பிக்கும் முன் சரிபார்க்கவும்.',
    },
    explorer: {
      heading: 'பொதுப் புகார் கண்காணிப்பு',
      subheading: 'நகராட்சி புகார்களைத் தேடவும், வடிகட்டவும் மற்றும் உறுதிப்படுத்தவும்.',
      searchPlaceholder: 'தலைப்பு, தெரு, வார்டு அல்லது குறியீடு மூலம் தேடுக...',
      allCategories: 'அனைத்து வகைகள்',
      allSeverities: 'அனைத்து தீவிரங்கள்',
      allStatuses: 'அனைத்து நிலைகள்',
      sortByPriority: 'அதிக முன்னுரிமை',
      sortByNewest: 'புதியவை முதலில்',
      sortByOldest: 'பழையவை முதலில்',
      sortByUpvotes: 'அதிக ஆதரவு',
      emptyTitle: 'பொருத்தமான புகார்கள் இல்லை',
      emptyBody: 'தேடல் சொற்கள் அல்லது வடிகட்டிகளை மாற்றி மீண்டும் முயற்சிக்கவும்.',
      upvote: 'ஆதரவு அளி',
      viewDetails: 'விவரம் காண்க',
    },
    detail: {
      backToExplore: 'புகார் பட்டியலுக்குத் திரும்பு',
      aiTriageHeading: 'AI வகைப்பாடு & தீவிர மதிப்பீடு',
      priorityBreakdownHeading: 'வெளிப்படையான முன்னுரிமை சூத்திரம்',
      recommendationsHeading: 'பரிந்துரைக்கப்பட்ட நகராட்சி நடவடிக்கைகள்',
      historyHeading: 'தணிக்கை நிலை வரலாறு',
      limitationsHeading: 'AI வரம்புகள் & வெளிப்படைத்தன்மை',
      duplicateNotice: 'தொடர்புடைய / இரட்டைப் புகாராக இணைக்கப்பட்டது',
      assignedDept: 'ஒதுக்கப்பட்ட துறை',
      wardLabel: 'வார்டு / மண்டலம்',
      coordinatesLabel: 'ஆயத்தொலைவுகள்',
    },
    admin: {
      heading: 'நகராட்சி நிர்வாக சரிபார்ப்புப் பலகை',
      subheading:
        'புகார்களைச் சரிபார்க்கவும், இரட்டைப் புகார்களை இணைக்கவும், துறைகளுக்கு ஒதுக்கவும்.',
      verifyAndAssign: 'சரிபார்த்து நிலையை மாற்றவும்',
      updateStatus: 'நிலை',
      departmentLabel: 'ஒதுக்கப்பட்ட துறை',
      assigneeLabel: 'பணிக்குழு / அதிகாரி',
      noteLabel: 'அதிகாரப்பூர்வ குறிப்பு',
      saveDecision: 'மாற்றத்தைச் சேமி',
      unauthorizedTitle: 'நிர்வாக அனுமதி தேவை',
      unauthorizedBody:
        'நிர்வாகப் பொறுப்பு கொண்ட பயனர்கள் மட்டுமே புகார் நிலைகளை மாற்ற முடியும்.',
    },
    analytics: {
      heading: 'நகராட்சி தீர்வு பகுப்பாய்வு',
      subheading: 'சேமிக்கப்பட்ட உண்மையான புகார் தரவுகளிலிருந்து நேரடியாக கணக்கிடப்பட்டது.',
      totalReports: 'மொத்த புகார்கள்',
      resolutionRate: 'தீர்வு விகிதம்',
      avgResolutionHours: 'சராசரி தீர்வு நேரம்',
      duplicateClusters: 'இரட்டைப் புகார்கள்',
      byCategoryHeading: 'வகை வாரியான புகார்கள்',
      bySeverityHeading: 'தீவிர நிலைப் பகிர்வு',
      byStatusHeading: 'செயல்முறை நிலை',
      byWardHeading: 'வார்டு வாரியான சுமை',
    },
    common: {
      loading: 'தரவு ஏற்றப்படுகிறது...',
      errorPrefix: 'பிழை:',
      previous: 'முந்தையது',
      next: 'அடுத்தது',
      pageOf: 'பக்கம்',
      priorityScore: 'முன்னுரிமை மதிப்பெண்',
      confidence: 'நம்பகத்தன்மை',
      geminiLabel: 'Gemini AI',
      fallbackLabel: 'விதி-அடிப்படை மாற்று',
      skipToContent: 'முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்',
    },
  },
};
