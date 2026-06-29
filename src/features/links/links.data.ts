import {
  BookOpen,
  ClipboardList,
  FileText,
  FolderOpen,
  GraduationCap,
  School,
  type LucideIcon,
} from 'lucide-react';

/** One external resource, rendered as a tappable card row with a brand-tinted icon tile. */
export interface LinkItem {
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  /** Brand colour for the icon tile (a recognisable, offline stand-in for each site's logo). */
  tint: string;
  /** Optional bundled logo image (public/ path). Shown instead of the glyph when set. */
  logo?: string;
}

export interface LinkSection {
  title: string;
  items: LinkItem[];
}

/**
 * The student-facing link directory. Plain reference data — edit a row, or add a section, and it shows
 * up. URLs are the real DBHS / WVUSD destinations (the school site + Aeries were verified; Google and
 * College Board use their canonical entry points). Icons are brand-tinted tiles rather than fetched
 * logos, so the PWA stays fully offline with no third-party requests.
 */
export const LINK_SECTIONS: LinkSection[] = [
  {
    title: 'School tools',
    items: [
      {
        label: 'Aeries',
        description: 'Grades & attendance',
        href: 'https://walnutvalleyusd.aeries.net/student/',
        icon: ClipboardList,
        tint: '#0b8390',
      },
      {
        label: 'Google Classroom',
        description: 'Assignments & class streams',
        href: 'https://classroom.google.com',
        icon: BookOpen,
        tint: '#1e8e3e',
      },
      {
        label: 'Google Drive',
        description: 'Your school files',
        href: 'https://drive.google.com',
        icon: FolderOpen,
        tint: '#1a73e8',
      },
      {
        label: 'Diamond Bar High School',
        description: 'Official school website',
        href: 'https://dbhs.wvusd.org/',
        icon: School,
        tint: '#582c83',
      },
      {
        label: 'Course Descriptions',
        description: 'Course catalog (PDF)',
        href: 'https://4.files.edl.io/5605/05/26/26/224404-8067a323-ef30-4c2f-8e96-37c9720689dd.pdf',
        icon: FileText,
        tint: '#c0392b',
      },
      {
        label: 'College Board',
        description: 'AP, SAT & score reports',
        href: 'https://www.collegeboard.org',
        icon: GraduationCap,
        tint: '#0a2a66',
      },
    ],
  },
  // Coming once you send the links: ParentSquare, Athletics, Clubs directory, Wellness resources.
  // Add them as new { title, items } sections above this line.
];

/** Gmail compose deep link to a recipient — opens a new, pre-addressed Gmail message. */
export function gmailComposeUrl(email: string): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
}
