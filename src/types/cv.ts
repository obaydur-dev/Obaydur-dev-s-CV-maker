export type SectorMode =
  | 'universal'
  | 'corporate'
  | 'tech'
  | 'operations'
  | 'international';

export type ThemePreset =
  | 'executive_navy'
  | 'classic_charcoal'
  | 'royal_slate'
  | 'minimal_monochrome';

export type MarginPreset = 'normal' | 'compact' | 'wide';

export type CVFontStyle = 'sans' | 'serif';

export type BuiltInSectionId =
  | 'objective'
  | 'skills'
  | 'experience'
  | 'readiness'
  | 'academic'
  | 'languages'
  | 'biodata'
  | 'addresses'
  | 'references'
  | 'enclosures'
  | 'declaration';

export interface ToggleField {
  enabled: boolean;
  value: string;
}

export interface CustomFieldItem {
  id: string;
  enabled: boolean;
  label: string;
  value: string;
}

export interface PhotoSettings {
  enabled: boolean;
  dataUrl: string;
  zoom: number;
  panX: number;
  panY: number;
  brightness: number;
  contrast: number;
  aspect: '35x45' | '1x1' | '4x5';
}

export interface HeaderData {
  fullNameEn: ToggleField;
  fullNameBn: ToggleField;
  headline: ToggleField;
  primaryMobile: ToggleField;
  altMobile: ToggleField;
  email: ToggleField;
  portfolioUrl: ToggleField;
  secondaryUrl: ToggleField;
  cityCountry: ToggleField;
  customFields: CustomFieldItem[];
}

export interface SkillsSectionData {
  enabled: boolean;
  banglaWpm: string;
  englishWpm: string;
  typingSpeedEnabled: boolean;
  officeTools: ToggleField;
  webTechTools: ToggleField;
  designTools: ToggleField;
  aiWorkflow: ToggleField;
  coordinationOps: ToggleField;
  workEthicSoft: ToggleField;
  customFields: CustomFieldItem[];
}

export interface ProjectCardItem {
  id: string;
  enabled: boolean;
  title: string;
  badge: string;
  organization: string;
  duration: string;
  bullets: string[];
}

export interface ExperienceSectionData {
  enabled: boolean;
  items: ProjectCardItem[];
}

export interface ReadinessSectionData {
  enabled: boolean;
  preferredSectors: ToggleField;
  employmentType: ToggleField;
  workMode: ToggleField;
  shiftFlexibility: ToggleField;
  joiningAvailability: ToggleField;
  relocationTravel: ToggleField;
  workstationInternet: ToggleField;
  expectedSalary: ToggleField;
  legalConductRecord: ToggleField;
  customFields: CustomFieldItem[];
}

export interface AcademicColumnsConfig {
  examTitle: boolean;
  group: boolean;
  majorSubjects: boolean;
  institution: boolean;
  board: boolean;
  rollNo: boolean;
  regNo: boolean;
  passingYear: boolean;
  result: boolean;
}

export interface AcademicRow {
  id: string;
  enabled: boolean;
  examTitle: string;
  group: string;
  majorSubjects: string;
  institution: string;
  board: string;
  rollNo: string;
  regNo: string;
  passingYear: string;
  result: string;
}

export interface AcademicSectionData {
  enabled: boolean;
  columns: AcademicColumnsConfig;
  rows: AcademicRow[];
}

export interface LanguageRow {
  id: string;
  enabled: boolean;
  language: string;
  reading: string;
  writing: string;
  speaking: string;
  listening: string;
  typing: string;
}

export interface LanguagesSectionData {
  enabled: boolean;
  rows: LanguageRow[];
}

export interface BilingualNameField {
  enabled: boolean;
  en: string;
  bn: string;
}

export interface BioDataSectionData {
  enabled: boolean;
  fatherName: BilingualNameField;
  fatherOccupation: ToggleField;
  motherName: BilingualNameField;
  motherOccupation: ToggleField;
  dateOfBirth: ToggleField;
  age: {
    enabled: boolean;
    autoCalculate: boolean;
    manualValue: string;
  };
  nidNumber: ToggleField;
  birthRegNumber: ToggleField;
  passportNumber: ToggleField;
  drivingLicense: ToggleField;
  nationality: ToggleField;
  religion: ToggleField;
  gender: ToggleField;
  maritalStatus: ToggleField;
  bloodGroup: ToggleField;
  height: ToggleField;
  emergencyContactPerson: ToggleField;
  emergencyContactMobile: ToggleField;
  customFields: CustomFieldItem[];
}

export interface AddressBlock {
  enabled: boolean;
  careOf: string;
  villageRoad: string;
  wardUnion: string;
  postOffice: string;
  postCode: string;
  upazila: string;
  district: string;
  division: string;
}

export interface AddressesSectionData {
  enabled: boolean;
  present: AddressBlock;
  permanent: AddressBlock;
  customFields: CustomFieldItem[];
}

export interface ReferenceItem {
  id: string;
  enabled: boolean;
  name: string;
  designation: string;
  organization: string;
  phone: string;
  email: string;
}

export interface ReferencesSectionData {
  enabled: boolean;
  items: ReferenceItem[];
  customFields: CustomFieldItem[];
}

export interface EnclosureItem {
  id: string;
  enabled: boolean;
  label: string;
}

export interface EnclosuresSectionData {
  enabled: boolean;
  items: EnclosureItem[];
}

export interface DeclarationSectionData {
  enabled: boolean;
  statementEnabled?: boolean;
  statement: string;
  date: ToggleField;
  signatureEnabled?: boolean;
  signatureMode: 'image' | 'typed';
  signatureImageUrl: string;
  typedSignature: string;
  applicantNameOverride: string;
}

export interface CustomSection {
  id: string;
  enabled: boolean;
  title: string;
  layout: 'keyvalue' | 'bullets' | 'grid';
  items: CustomFieldItem[];
}

export interface AttachmentItem {
  id: string;
  enabled: boolean;
  title: string;
  layout: 'full' | 'two-up';
  dataUrl: string;
  sourceFileName: string;
  pageLabel?: string;
  width: number;
  height: number;
}

export interface CVDocumentState {
  sector: SectorMode;
  theme: ThemePreset;
  margin: MarginPreset;
  fontScale: number; // 90 to 110
  fontStyle: CVFontStyle;
  sectionOrder: string[]; // BuiltInSectionId | `custom_${id}`
  header: HeaderData;
  photo: PhotoSettings;
  objective: ToggleField;
  skills: SkillsSectionData;
  experience: ExperienceSectionData;
  readiness: ReadinessSectionData;
  academic: AcademicSectionData;
  languages: LanguagesSectionData;
  biodata: BioDataSectionData;
  addresses: AddressesSectionData;
  references: ReferencesSectionData;
  enclosures: EnclosuresSectionData;
  declaration: DeclarationSectionData;
  customSections: CustomSection[];
  attachments: AttachmentItem[];
}
