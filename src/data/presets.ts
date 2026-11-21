import {
  BuiltInSectionId,
  CVDocumentState,
  MarginPreset,
  SectorMode,
  ThemePreset,
} from '../types/cv';

export interface SectorConfig {
  id: SectorMode;
  label: string;
  shortLabel: string;
  description: string;
  headline: string;
  objective: string;
  sectionOrder: BuiltInSectionId[];
}

export const SECTOR_CONFIGS: Record<SectorMode, SectorConfig> = {
  universal: {
    id: 'universal',
    label: 'Universal / All-Sector Mode',
    shortLabel: 'Universal',
    description:
      'Balanced, authoritative structure suited for corporate, commercial, NGO, administrative, and technical submissions.',
    headline: 'Administrative, Digital Operations & Web Solutions Specialist',
    objective:
      'To contribute to a forward-looking organization by combining rapid bilingual (Bangla & English) documentation, high-accuracy record management, modern digital & web workflow capabilities, and disciplined operational execution to deliver measurable organizational efficiency.',
    sectionOrder: [
      'objective',
      'skills',
      'experience',
      'readiness',
      'academic',
      'languages',
      'biodata',
      'addresses',
      'references',
      'enclosures',
      'declaration',
    ],
  },
  corporate: {
    id: 'corporate',
    label: 'Corporate, Admin & Back-Office Mode',
    shortLabel: 'Corporate & Admin',
    description:
      'Prioritizes bilingual typing speed, office productivity, record-keeping accuracy, work readiness, and complete official bio-data.',
    headline: 'Executive Administration, Documentation & Back-Office Coordinator',
    objective:
      'Seeking a responsible Administrative, Documentation, or Back-Office role where verified bilingual typing proficiency (Bangla & English), structured spreadsheet reporting, meticulous file governance, and dependable work readiness can strengthen daily corporate operations.',
    sectionOrder: [
      'objective',
      'skills',
      'readiness',
      'academic',
      'experience',
      'languages',
      'biodata',
      'addresses',
      'references',
      'enclosures',
      'declaration',
    ],
  },
  tech: {
    id: 'tech',
    label: 'Web, Tech & Digital Design Mode',
    shortLabel: 'Web & Tech',
    description:
      'Elevates deployed web projects, technical stack, digital design capabilities, and live portfolio links to the top.',
    headline: 'Frontend Web Developer, UI Systems & Digital Workflow Designer',
    objective:
      'To leverage practical expertise in responsive web application development, clean UI/UX presentation, modern AI-assisted workflows, and structured data systems to build reliable, user-focused digital products and scalable web experiences.',
    sectionOrder: [
      'objective',
      'experience',
      'skills',
      'academic',
      'languages',
      'readiness',
      'references',
      'biodata',
      'addresses',
      'enclosures',
      'declaration',
    ],
  },
  operations: {
    id: 'operations',
    label: 'Operations, Field & Logistics Mode',
    shortLabel: 'Operations & Field',
    description:
      'Highlights shift flexibility, relocation readiness, operational coordination, schedule discipline, and field execution.',
    headline: 'Operations Coordinator, Field Logistics & Schedule Operations Executive',
    objective:
      'Dedicated and adaptable operations professional ready for multi-shift schedules, inter-district travel, and structured field coordination. Committed to maintaining accurate dispatch logs, vendor/team alignment, and strict procedural compliance under deadline pressure.',
    sectionOrder: [
      'objective',
      'readiness',
      'experience',
      'skills',
      'languages',
      'academic',
      'biodata',
      'addresses',
      'references',
      'enclosures',
      'declaration',
    ],
  },
  international: {
    id: 'international',
    label: 'International / Remote Minimalist Mode',
    shortLabel: 'International / Remote',
    description:
      'Automatically omits local bio-data fields (NID, Birth Reg, Parents, Religion, Marital Status) while foregrounding projects, stack, and remote readiness.',
    headline: 'Remote Digital Operations, Frontend & Technical Support Specialist',
    objective:
      'Results-driven remote specialist equipped with a dedicated high-speed workstation, fluent English communication, modern web and productivity tooling, and proven asynchronous project delivery across cross-functional teams.',
    sectionOrder: [
      'objective',
      'experience',
      'skills',
      'readiness',
      'academic',
      'languages',
      'references',
      'declaration',
      'biodata',
      'addresses',
      'enclosures',
    ],
  },
};

export interface ThemeConfig {
  id: ThemePreset;
  label: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  heading: string;
  text: string;
  muted: string;
  border: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  stripeBg: string;
}

export const THEME_CONFIGS: Record<ThemePreset, ThemeConfig> = {
  executive_navy: {
    id: 'executive_navy',
    label: 'Executive Navy',
    accent: '#1E3A5F',
    accentSoft: '#F1F5F9',
    accentBorder: '#CBD5E1',
    heading: '#0F172A',
    text: '#1E293B',
    muted: '#475569',
    border: '#CBD5E1',
    tableHeaderBg: '#1E3A5F',
    tableHeaderText: '#FFFFFF',
    stripeBg: '#F8FAFC',
  },
  classic_charcoal: {
    id: 'classic_charcoal',
    label: 'Classic Charcoal',
    accent: '#27272A',
    accentSoft: '#F4F4F5',
    accentBorder: '#D4D4D8',
    heading: '#18181B',
    text: '#27272A',
    muted: '#52525B',
    border: '#D4D4D8',
    tableHeaderBg: '#27272A',
    tableHeaderText: '#FFFFFF',
    stripeBg: '#FAFAFA',
  },
  royal_slate: {
    id: 'royal_slate',
    label: 'Royal Slate',
    accent: '#0F4C5C',
    accentSoft: '#F0F7F9',
    accentBorder: '#BDD5DC',
    heading: '#0B2530',
    text: '#1E293B',
    muted: '#475569',
    border: '#CBD5E1',
    tableHeaderBg: '#0F4C5C',
    tableHeaderText: '#FFFFFF',
    stripeBg: '#F8FAFB',
  },
  minimal_monochrome: {
    id: 'minimal_monochrome',
    label: 'Minimal Monochrome',
    accent: '#111827',
    accentSoft: '#F9FAFB',
    accentBorder: '#E5E7EB',
    heading: '#000000',
    text: '#111827',
    muted: '#4B5563',
    border: '#D1D5DB',
    tableHeaderBg: '#F3F4F6',
    tableHeaderText: '#111827',
    stripeBg: '#F9FAFB',
  },
};

export interface MarginConfig {
  id: MarginPreset;
  label: string;
  topMm: number;
  bottomMm: number;
  leftMm: number;
  rightMm: number;
}

export const MARGIN_CONFIGS: Record<MarginPreset, MarginConfig> = {
  normal: {
    id: 'normal',
    label: 'Normal (13mm)',
    topMm: 12,
    bottomMm: 12,
    leftMm: 14,
    rightMm: 14,
  },
  compact: {
    id: 'compact',
    label: 'Compact (9mm)',
    topMm: 9,
    bottomMm: 9,
    leftMm: 10,
    rightMm: 10,
  },
  wide: {
    id: 'wide',
    label: 'Wide (18mm)',
    topMm: 17,
    bottomMm: 17,
    leftMm: 19,
    rightMm: 19,
  },
};

export const SECTION_TITLES: Record<BuiltInSectionId, string> = {
  objective: 'Career Objective & Executive Summary',
  skills: 'Core Skills & Verified Capabilities',
  experience: 'Practical Experience, Projects & Responsibilities',
  readiness: 'Work Readiness, Logistics & Background Assurance',
  academic: 'Academic Qualification',
  languages: 'Language Proficiency Matrix',
  biodata: 'Personal & Official Bio-Data',
  addresses: 'Address Details',
  references: 'References',
  enclosures: 'Supporting Documents & Enclosures',
  declaration: 'Authenticity Declaration & Signature',
};

export const SAMPLE_PORTRAIT_URL =
  '/src/assets/images/sample_passport_portrait_1795245907027.jpg';

export function createSampleProfile(): CVDocumentState {
  return {
    sector: 'universal',
    theme: 'executive_navy',
    margin: 'normal',
    fontScale: 100,
    fontStyle: 'sans',
    sectionOrder: [...SECTOR_CONFIGS.universal.sectionOrder],
    header: {
      fullNameEn: { enabled: true, value: 'Tariqul Islam Tanvir' },
      fullNameBn: { enabled: true, value: 'তারিকুল ইসলাম তানভীর' },
      headline: {
        enabled: true,
        value: SECTOR_CONFIGS.universal.headline,
      },
      primaryMobile: { enabled: true, value: '+880 1712-458930' },
      altMobile: { enabled: true, value: '+880 1911-884210' },
      email: { enabled: true, value: 'tariqul.tanvir.pro@example.com' },
      portfolioUrl: { enabled: true, value: 'https://github.com/tariqul-dev' },
      secondaryUrl: { enabled: true, value: 'https://linkedin.com/in/tariqul-tanvir' },
      cityCountry: { enabled: true, value: 'Dhaka, Bangladesh' },
      customFields: [],
    },
    photo: {
      enabled: true,
      dataUrl: SAMPLE_PORTRAIT_URL,
      zoom: 1,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      aspect: '35x45',
    },
    objective: {
      enabled: true,
      value: SECTOR_CONFIGS.universal.objective,
    },
    skills: {
      enabled: true,
      typingSpeedEnabled: true,
      banglaWpm: '38 WPM (Bijoy & Avro Unicode)',
      englishWpm: '58 WPM (98% Verified Accuracy)',
      officeTools: {
        enabled: true,
        value:
          'Microsoft Word, Excel (Pivot Tables, VLOOKUP, Reporting), PowerPoint, Google Workspace, PDF Archiving & Ledger Structuring',
      },
      webTechTools: {
        enabled: true,
        value:
          'HTML5, CSS3, Tailwind CSS, TypeScript, React, REST API Integration, Git & GitHub Workflow',
      },
      designTools: {
        enabled: true,
        value:
          'Figma UI Prototyping, Canva Corporate Collateral, Print-Ready Layout Composition, High-DPI Document Formatting',
      },
      aiWorkflow: {
        enabled: true,
        value:
          'Structured Prompt Engineering, Rapid Document Synthesis, Automated Spreadsheet Auditing & Research Acceleration',
      },
      coordinationOps: {
        enabled: true,
        value:
          'Vendor & Client Follow-Up, Shift Roster Scheduling, Inventory Log Verification, Cross-Department Dispatch Tracking',
      },
      workEthicSoft: {
        enabled: true,
        value:
          'Strict Confidentiality, Deadline Accountability, Analytical Problem Solving, Calm Execution Under Pressure',
      },
      customFields: [],
    },
    experience: {
      enabled: true,
      items: [
        {
          id: 'proj-1',
          enabled: true,
          title: 'Administrative & Digital Records Coordinator',
          badge: 'Full-Time Operations',
          organization: 'Crescent Commercial Services Ltd., Dhaka',
          duration: 'Jan 2024 – Present',
          bullets: [
            'Digitized and indexed 3,400+ client files and vendor invoices into structured Excel and cloud registers, reducing retrieval time by 60%.',
            'Prepared bilingual (Bangla & English) formal correspondence, tender summaries, and weekly executive briefing decks.',
            'Coordinated daily dispatch schedules across 14 field personnel with zero unlogged delivery discrepancies.',
          ],
        },
        {
          id: 'proj-2',
          enabled: true,
          title: 'Client Portal & Invoice Tracking Web App',
          badge: 'Deployed Web Project',
          organization: 'Independent Technical Build (React / TypeScript)',
          duration: 'Aug 2023 – Dec 2023',
          bullets: [
            'Architected a responsive web dashboard for tracking client purchase orders, payment milestones, and printable A4 receipts.',
            'Implemented client-side search, CSV/PDF export, and keyboard-first form entry for rapid back-office data input.',
          ],
        },
        {
          id: 'proj-3',
          enabled: true,
          title: 'Data Entry & Document Quality Associate',
          badge: 'Contract / Project',
          organization: 'Metro Logistics & Supply Hub',
          duration: 'Mar 2022 – Jul 2023',
          bullets: [
            'Maintained high-volume daily manifest logs at 55+ WPM with rigorous cross-verification against physical challan copies.',
            'Standardized scanned archive naming conventions and multi-page PDF evidence binders for quarterly audits.',
          ],
        },
      ],
    },
    readiness: {
      enabled: true,
      preferredSectors: {
        enabled: true,
        value:
          'Corporate Administration, IT / Web Operations, Back-Office Management, Logistics Coordination',
      },
      employmentType: {
        enabled: true,
        value: 'Full-Time / Permanent (Open to Long-Term Contractual)',
      },
      workMode: {
        enabled: true,
        value: 'On-Site, Hybrid, or Remote',
      },
      shiftFlexibility: {
        enabled: true,
        value: 'Flexible across Day, Evening, Rotational & Weekend Shifts',
      },
      joiningAvailability: {
        enabled: true,
        value: 'Immediate Joining Available (0–7 Days Notice)',
      },
      relocationTravel: {
        enabled: true,
        value: 'Willing to relocate anywhere in Bangladesh or travel for official duties',
      },
      workstationInternet: {
        enabled: true,
        value: 'Dedicated Laptop, Dual-Monitor Setup, UPS Backup & 100 Mbps Fiber Broadband',
      },
      expectedSalary: {
        enabled: true,
        value: 'Negotiable (Commensurate with Role Scope & Organization Policy)',
      },
      legalConductRecord: {
        enabled: true,
        value: 'Clean Personal, Academic & Employment Record (Zero Legal or Disciplinary Issues)',
      },
      customFields: [],
    },
    academic: {
      enabled: true,
      columns: {
        examTitle: true,
        group: true,
        majorSubjects: false,
        institution: true,
        board: true,
        rollNo: true,
        regNo: false,
        passingYear: true,
        result: true,
      },
      rows: [
        {
          id: 'edu-1',
          enabled: true,
          examTitle: 'B.Sc. (Hons.) in Computer Science & Engineering',
          group: 'Science & Engineering',
          majorSubjects: 'Software Engineering, Database Systems, Web Architecture',
          institution: 'Dhaka City University',
          board: 'University Grants Commission',
          rollNo: '204189',
          regNo: '190045821',
          passingYear: '2023',
          result: 'CGPA 3.68 / 4.00',
        },
        {
          id: 'edu-2',
          enabled: true,
          examTitle: 'Higher Secondary Certificate (H.S.C.)',
          group: 'Science',
          majorSubjects: 'Physics, Chemistry, Higher Mathematics, ICT',
          institution: 'Notre Dame College, Dhaka',
          board: 'Dhaka Board',
          rollNo: '118492',
          regNo: '1610884312',
          passingYear: '2019',
          result: 'GPA 5.00 / 5.00',
        },
        {
          id: 'edu-3',
          enabled: true,
          examTitle: 'Secondary School Certificate (S.S.C.)',
          group: 'Science',
          majorSubjects: 'General Science, Mathematics, English, ICT',
          institution: 'Motijheel Government Boys’ High School',
          board: 'Dhaka Board',
          rollNo: '104921',
          regNo: '1410773190',
          passingYear: '2017',
          result: 'GPA 5.00 / 5.00',
        },
      ],
    },
    languages: {
      enabled: true,
      rows: [
        {
          id: 'lang-1',
          enabled: true,
          language: 'Bengali (Native)',
          reading: 'Native / Fluent',
          writing: 'Native / Formal',
          speaking: 'Native / Fluent',
          listening: 'Native / Fluent',
          typing: '38 WPM (Unicode / Bijoy)',
        },
        {
          id: 'lang-2',
          enabled: true,
          language: 'English',
          reading: 'Fluent',
          writing: 'Professional',
          speaking: 'Fluent',
          listening: 'Fluent',
          typing: '58 WPM (98% Acc.)',
        },
      ],
    },
    biodata: {
      enabled: true,
      fatherName: {
        enabled: true,
        en: 'Md. Shafiqul Islam',
        bn: 'মোঃ শফিকুল ইসলাম',
      },
      fatherOccupation: {
        enabled: true,
        value: 'Senior Accounts Officer (Retired)',
      },
      motherName: {
        enabled: true,
        en: 'Mrs. Taslima Begum',
        bn: 'মিসেস তাসলিমা বেগম',
      },
      motherOccupation: {
        enabled: true,
        value: 'Homemaker',
      },
      dateOfBirth: { enabled: true, value: '2001-05-14' },
      age: { enabled: true, autoCalculate: true, manualValue: '25 Years' },
      nidNumber: { enabled: true, value: '554 892 1047' },
      birthRegNumber: { enabled: false, value: '20012610948012345' },
      passportNumber: { enabled: false, value: 'A04892134' },
      drivingLicense: { enabled: false, value: 'DK-0492817L0002' },
      nationality: { enabled: true, value: 'Bangladeshi (by Birth)' },
      religion: { enabled: true, value: 'Islam' },
      gender: { enabled: true, value: 'Male' },
      maritalStatus: { enabled: true, value: 'Unmarried' },
      bloodGroup: { enabled: true, value: 'O+ (Positive)' },
      height: { enabled: true, value: '5 ft 8 in (173 cm)' },
      emergencyContactPerson: {
        enabled: true,
        value: 'Md. Shafiqul Islam (Father)',
      },
      emergencyContactMobile: { enabled: true, value: '+880 1711-339204' },
      customFields: [],
    },
    addresses: {
      enabled: true,
      present: {
        enabled: true,
        careOf: 'Md. Shafiqul Islam',
        villageRoad: 'House 24, Road 06, Block C, Banasree',
        wardUnion: 'Ward 03',
        postOffice: 'Rampura',
        postCode: '1219',
        upazila: 'Rampura',
        district: 'Dhaka',
        division: 'Dhaka',
      },
      permanent: {
        enabled: true,
        careOf: 'Md. Shafiqul Islam',
        villageRoad: 'Village: Charigram, House 12',
        wardUnion: 'Charigram Union',
        postOffice: 'Singair',
        postCode: '1820',
        upazila: 'Singair',
        district: 'Manikganj',
        division: 'Dhaka',
      },
      customFields: [],
    },
    references: {
      enabled: true,
      items: [
        {
          id: 'ref-1',
          enabled: true,
          name: 'Mahmudul Hasan Chowdhury',
          designation: 'Assistant Vice President, Operations',
          organization: 'Crescent Commercial Services Ltd.',
          phone: '+880 1819-224019',
          email: 'm.chowdhury@crescent-example.com',
        },
        {
          id: 'ref-2',
          enabled: true,
          name: 'Dr. Farhana Rahman',
          designation: 'Associate Professor, Dept. of CSE',
          organization: 'Dhaka City University',
          phone: '+880 1715-604912',
          email: 'farhana.cse@dcu-example.edu',
        },
      ],
      customFields: [],
    },
    enclosures: {
      enabled: true,
      items: [
        { id: 'enc-1', enabled: true, label: 'Attested Copy of National ID (NID) Card' },
        {
          id: 'enc-2',
          enabled: true,
          label: 'Copies of Academic Certificates & Marksheets (S.S.C, H.S.C, B.Sc.)',
        },
        {
          id: 'enc-3',
          enabled: true,
          label: '2 Copies of Recent Passport-Size Color Photographs',
        },
        {
          id: 'enc-4',
          enabled: true,
          label: 'Experience & Character Certificates (Available Upon Request)',
        },
      ],
    },
    declaration: {
      enabled: true,
      statementEnabled: true,
      statement:
        'I hereby solemnly declare that all information, academic records, skills, and particulars furnished in this Curriculum Vitae and Bio-Data are true, complete, and accurate to the best of my knowledge and belief.',
      date: { enabled: true, value: '20 November 2026' },
      signatureEnabled: true,
      signatureMode: 'typed',
      signatureImageUrl: '',
      typedSignature: 'Tariqul Islam Tanvir',
      applicantNameOverride: '',
    },
    customSections: [],
    attachments: [],
  };
}

export function createEmptyProfile(): CVDocumentState {
  return {
    sector: 'universal',
    theme: 'executive_navy',
    margin: 'normal',
    fontScale: 100,
    fontStyle: 'sans',
    sectionOrder: [...SECTOR_CONFIGS.universal.sectionOrder],
    header: {
      fullNameEn: { enabled: true, value: '' },
      fullNameBn: { enabled: false, value: '' },
      headline: { enabled: true, value: '' },
      primaryMobile: { enabled: true, value: '' },
      altMobile: { enabled: false, value: '' },
      email: { enabled: true, value: '' },
      portfolioUrl: { enabled: false, value: '' },
      secondaryUrl: { enabled: false, value: '' },
      cityCountry: { enabled: true, value: '' },
      customFields: [],
    },
    photo: {
      enabled: false,
      dataUrl: '',
      zoom: 1,
      panX: 0,
      panY: 0,
      brightness: 100,
      contrast: 100,
      aspect: '35x45',
    },
    objective: {
      enabled: true,
      value: '',
    },
    skills: {
      enabled: true,
      typingSpeedEnabled: false,
      banglaWpm: '',
      englishWpm: '',
      officeTools: { enabled: true, value: '' },
      webTechTools: { enabled: false, value: '' },
      designTools: { enabled: false, value: '' },
      aiWorkflow: { enabled: false, value: '' },
      coordinationOps: { enabled: false, value: '' },
      workEthicSoft: { enabled: true, value: '' },
      customFields: [],
    },
    experience: {
      enabled: true,
      items: [],
    },
    readiness: {
      enabled: false,
      preferredSectors: { enabled: false, value: '' },
      employmentType: { enabled: false, value: '' },
      workMode: { enabled: false, value: '' },
      shiftFlexibility: { enabled: false, value: '' },
      joiningAvailability: { enabled: false, value: '' },
      relocationTravel: { enabled: false, value: '' },
      workstationInternet: { enabled: false, value: '' },
      expectedSalary: { enabled: false, value: '' },
      legalConductRecord: { enabled: false, value: '' },
      customFields: [],
    },
    academic: {
      enabled: true,
      columns: {
        examTitle: true,
        group: true,
        majorSubjects: false,
        institution: true,
        board: true,
        rollNo: true,
        regNo: false,
        passingYear: true,
        result: true,
      },
      rows: [],
    },
    languages: {
      enabled: true,
      rows: [],
    },
    biodata: {
      enabled: false,
      fatherName: { enabled: true, en: '', bn: '' },
      fatherOccupation: { enabled: false, value: '' },
      motherName: { enabled: true, en: '', bn: '' },
      motherOccupation: { enabled: false, value: '' },
      dateOfBirth: { enabled: true, value: '' },
      age: { enabled: false, autoCalculate: true, manualValue: '' },
      nidNumber: { enabled: true, value: '' },
      birthRegNumber: { enabled: false, value: '' },
      passportNumber: { enabled: false, value: '' },
      drivingLicense: { enabled: false, value: '' },
      nationality: { enabled: true, value: '' },
      religion: { enabled: false, value: '' },
      gender: { enabled: false, value: '' },
      maritalStatus: { enabled: false, value: '' },
      bloodGroup: { enabled: false, value: '' },
      height: { enabled: false, value: '' },
      emergencyContactPerson: { enabled: false, value: '' },
      emergencyContactMobile: { enabled: false, value: '' },
      customFields: [],
    },
    addresses: {
      enabled: false,
      present: {
        enabled: true,
        careOf: '',
        villageRoad: '',
        wardUnion: '',
        postOffice: '',
        postCode: '',
        upazila: '',
        district: '',
        division: '',
      },
      permanent: {
        enabled: true,
        careOf: '',
        villageRoad: '',
        wardUnion: '',
        postOffice: '',
        postCode: '',
        upazila: '',
        district: '',
        division: '',
      },
      customFields: [],
    },
    references: {
      enabled: false,
      items: [],
      customFields: [],
    },
    enclosures: {
      enabled: false,
      items: [],
    },
    declaration: {
      enabled: true,
      statementEnabled: true,
      statement:
        'I hereby declare that the information provided above is true and accurate to the best of my knowledge.',
      date: { enabled: true, value: '' },
      signatureEnabled: true,
      signatureMode: 'typed',
      signatureImageUrl: '',
      typedSignature: '',
      applicantNameOverride: '',
    },
    customSections: [],
    attachments: [],
  };
}

export function applySectorAdaptation(
  prev: CVDocumentState,
  sector: SectorMode
): CVDocumentState {
  const cfg = SECTOR_CONFIGS[sector];

  // Preserve custom section IDs at their relative order or appended if new
  const existingCustomIds = prev.sectionOrder.filter((id) => id.startsWith('custom_'));
  const nextOrder = [...cfg.sectionOrder, ...existingCustomIds];

  const isPresetHeadline =
    !prev.header.headline.value.trim() ||
    Object.values(SECTOR_CONFIGS).some(
      (s) => s.headline === prev.header.headline.value.trim()
    );
  const isPresetObjective =
    !prev.objective.value.trim() ||
    Object.values(SECTOR_CONFIGS).some(
      (s) => s.objective === prev.objective.value.trim()
    );

  // If switching to international, uncheck local bio-data fields by default
  // while preserving all entered values for manual re-checking
  const isIntl = sector === 'international';

  return {
    ...prev,
    sector,
    sectionOrder: nextOrder,
    header: {
      ...prev.header,
      headline: {
        ...prev.header.headline,
        value: isPresetHeadline ? cfg.headline : prev.header.headline.value,
      },
      fullNameBn: {
        ...prev.header.fullNameBn,
        enabled: isIntl ? false : prev.header.fullNameBn.enabled,
      },
    },
    objective: {
      ...prev.objective,
      value: isPresetObjective ? cfg.objective : prev.objective.value,
    },
    biodata: {
      ...prev.biodata,
      enabled: !isIntl,
      fatherName: { ...prev.biodata.fatherName, enabled: !isIntl },
      fatherOccupation: { ...prev.biodata.fatherOccupation, enabled: !isIntl },
      motherName: { ...prev.biodata.motherName, enabled: !isIntl },
      motherOccupation: { ...prev.biodata.motherOccupation, enabled: !isIntl },
      nidNumber: { ...prev.biodata.nidNumber, enabled: !isIntl },
      birthRegNumber: { ...prev.biodata.birthRegNumber, enabled: false },
      religion: { ...prev.biodata.religion, enabled: !isIntl },
      maritalStatus: { ...prev.biodata.maritalStatus, enabled: !isIntl },
    },
    addresses: {
      ...prev.addresses,
      enabled: !isIntl,
    },
    enclosures: {
      ...prev.enclosures,
      enabled: !isIntl,
    },
  };
}
