import {
  BookOpen,
  ClipboardCheck,
  FileText,
  FolderOpen,
  GraduationCap,
  School,
  type LucideIcon,
} from 'lucide-react';

/** One external resource, rendered as a tappable card row. Opens in a new tab. */
export interface LinkItem {
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
}

export interface LinkSection {
  title: string;
  items: LinkItem[];
}

/**
 * The student-facing link directory. Plain reference data — edit a row's url/label here, or add a new
 * section, and it shows up. URLs are the real DBHS / WVUSD destinations (the school site + Aeries were
 * verified; Google/College Board use their canonical entry points).
 */
export const LINK_SECTIONS: LinkSection[] = [
  {
    title: 'School tools',
    items: [
      {
        label: 'Aeries',
        description: 'Grades & attendance',
        href: 'https://walnutvalleyusd.aeries.net/student/',
        icon: GraduationCap,
      },
      {
        label: 'Google Classroom',
        description: 'Assignments & class streams',
        href: 'https://classroom.google.com',
        icon: BookOpen,
      },
      {
        label: 'Google Drive',
        description: 'Your school files',
        href: 'https://drive.google.com',
        icon: FolderOpen,
      },
      {
        label: 'Diamond Bar High School',
        description: 'Official school website',
        href: 'https://dbhs.wvusd.org/',
        icon: School,
      },
      {
        label: 'Course Descriptions',
        description: 'Course catalog (PDF)',
        href: 'https://4.files.edl.io/5605/05/26/26/224404-8067a323-ef30-4c2f-8e96-37c9720689dd.pdf',
        icon: FileText,
      },
      {
        label: 'College Board',
        description: 'AP, SAT & score reports',
        href: 'https://www.collegeboard.org',
        icon: ClipboardCheck,
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

export interface TeacherEmail {
  name: string;
  email: string;
}

/**
 * Teacher email directory — each row opens a Gmail compose window addressed to that teacher
 * (gmailComposeUrl). Placeholder until the real roster lands; replace with { name, email } rows.
 */
export const TEACHER_EMAILS: TeacherEmail[] = [
  { name: 'Example Teacher (placeholder)', email: 'teacher.name@wvusd.org' },
];
