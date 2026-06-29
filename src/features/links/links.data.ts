import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  Globe,
  GraduationCap,
  Heart,
  Library,
  Link as LinkGlyph,
  Mail,
  MapPin,
  Megaphone,
  Newspaper,
  School,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { LinkRow } from '../../lib/refData';

/**
 * Icon registry: each link stores an icon KEY (links.icon) that the screen maps to a Lucide glyph.
 * Keeping it a small curated set (rather than all of Lucide) means the admin picks from a dropdown and
 * the bundle only ships these. Add a row here + an entry in ICON_OPTIONS to offer a new icon.
 */
export const ICONS: Record<string, LucideIcon> = {
  'clipboard-list': ClipboardList,
  'clipboard-check': ClipboardCheck,
  'book-open': BookOpen,
  folder: FolderOpen,
  school: School,
  'file-text': FileText,
  'graduation-cap': GraduationCap,
  calendar: CalendarDays,
  users: Users,
  trophy: Trophy,
  heart: Heart,
  mail: Mail,
  globe: Globe,
  library: Library,
  newspaper: Newspaper,
  'map-pin': MapPin,
  megaphone: Megaphone,
  'dollar-sign': DollarSign,
  link: LinkGlyph,
};

export const DEFAULT_ICON = 'link';

/** Resolve a stored icon key to a glyph, falling back to the generic link icon. */
export function iconFor(key: string): LucideIcon {
  return ICONS[key] ?? ICONS[DEFAULT_ICON];
}

/** Admin icon-picker options (key → friendly label). */
export const ICON_OPTIONS: { key: string; label: string }[] = [
  { key: 'clipboard-list', label: 'Clipboard / grades' },
  { key: 'clipboard-check', label: 'Clipboard check' },
  { key: 'book-open', label: 'Book' },
  { key: 'folder', label: 'Folder' },
  { key: 'school', label: 'School' },
  { key: 'file-text', label: 'Document' },
  { key: 'graduation-cap', label: 'Graduation cap' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'users', label: 'People / club' },
  { key: 'trophy', label: 'Trophy / athletics' },
  { key: 'heart', label: 'Heart / wellness' },
  { key: 'mail', label: 'Mail' },
  { key: 'globe', label: 'Globe / website' },
  { key: 'library', label: 'Library' },
  { key: 'newspaper', label: 'News' },
  { key: 'map-pin', label: 'Map pin' },
  { key: 'megaphone', label: 'Megaphone' },
  { key: 'dollar-sign', label: 'Money / finance' },
  { key: 'link', label: 'Generic link' },
];

/** Tint presets for the admin colour picker (the brand-ish palette the seeded links use). */
export const TINT_PRESETS = [
  '#582c83',
  '#0b8390',
  '#1e8e3e',
  '#1a73e8',
  '#c0392b',
  '#0a2a66',
  '#b06a00',
  '#6b7280',
];

/**
 * Static fallback shown when the `links` table is empty or unreachable (e.g. before the 0013 migration
 * runs), so the screen always has content. Mirrors that migration's seed.
 */
export const FALLBACK_LINKS: LinkRow[] = [
  {
    id: 'seed-aeries',
    section: 'School tools',
    label: 'Aeries',
    description: 'Grades & attendance',
    url: 'https://walnutvalleyusd.aeries.net/student/',
    icon: 'clipboard-list',
    tint: '#0b8390',
    sort_order: 10,
    created_at: '',
  },
  {
    id: 'seed-classroom',
    section: 'School tools',
    label: 'Google Classroom',
    description: 'Assignments & class streams',
    url: 'https://classroom.google.com',
    icon: 'book-open',
    tint: '#1e8e3e',
    sort_order: 20,
    created_at: '',
  },
  {
    id: 'seed-drive',
    section: 'School tools',
    label: 'Google Drive',
    description: 'Your school files',
    url: 'https://drive.google.com',
    icon: 'folder',
    tint: '#1a73e8',
    sort_order: 30,
    created_at: '',
  },
  {
    id: 'seed-dbhs',
    section: 'School tools',
    label: 'Diamond Bar High School',
    description: 'Official school website',
    url: 'https://dbhs.wvusd.org/',
    icon: 'school',
    tint: '#582c83',
    sort_order: 40,
    created_at: '',
  },
  {
    id: 'seed-courses',
    section: 'School tools',
    label: 'Course Descriptions',
    description: 'Course catalog (PDF)',
    url: 'https://4.files.edl.io/5605/05/26/26/224404-8067a323-ef30-4c2f-8e96-37c9720689dd.pdf',
    icon: 'file-text',
    tint: '#c0392b',
    sort_order: 50,
    created_at: '',
  },
  {
    id: 'seed-collegeboard',
    section: 'School tools',
    label: 'College Board',
    description: 'AP, SAT & score reports',
    url: 'https://www.collegeboard.org',
    icon: 'graduation-cap',
    tint: '#0a2a66',
    sort_order: 60,
    created_at: '',
  },
];

/** Gmail compose deep link to a recipient — opens a new, pre-addressed Gmail message. */
export function gmailComposeUrl(email: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
}
