/**
 * Parse the DBHS course catalog markdown into `courses` rows.
 * Dev-only, one-shot: emits /tmp/courses.json for inspection + SQL insertion.
 *   node scripts/parse-catalog.mjs <catalog.md>
 */
import { readFileSync } from 'node:fs';

const md = readFileSync(process.argv[2], 'utf8');

// Department heading → canonical subject_area (shared with graduation_requirements).
const DEPT_AREA = {
  ART: 'Visual & Performing Arts',
  'BUSINESS & TECHNOLOGY': 'Career/Technical Elective',
  'CAREER EDUCATION ELECTIVES': 'Career/Technical Elective',
  DANCE: 'Visual & Performing Arts',
  DRAMA: 'Visual & Performing Arts',
  ENGLISH: 'English',
  MATHEMATICS: 'Mathematics',
  MUSIC: 'Visual & Performing Arts',
  'PATHWAYS COMMUNICATIONS ACADEMY': 'Other Elective',
  'PHYSICAL EDUCATION': 'Physical Education',
  SCIENCE: 'Science',
  'SOCIAL SCIENCE': 'History/Social Science',
  'STUDENT SUPPORT': 'Student Support',
  'WORLD LANGUAGES': 'World Language',
};

function parseGrades(s) {
  const txt = s.replace(/–|—/g, '-').trim();
  const m = txt.match(/(\d+)\s*-\s*(\d+)/);
  if (m) {
    const out = [];
    for (let g = +m[1]; g <= +m[2]; g++) out.push(g);
    return out;
  }
  const one = txt.match(/\d+/);
  return one ? [+one[0]] : null;
}

function parseCredits(s) {
  // '10', '5', '5/10' (semester/year) → store the year value (10) where offered, else 5.
  if (/\b10\b/.test(s)) return 10;
  if (/\b5\b/.test(s)) return 5;
  return 10;
}

const lines = md.split('\n');
let dept = null;
const byName = new Map();

for (const line of lines) {
  const h = line.match(/^##\s+(.+)$/);
  if (h) {
    dept = h[1].trim();
    continue;
  }
  if (!line.startsWith('|') || !dept || !DEPT_AREA[dept]) continue;
  const cells = line.split('|').map((c) => c.trim());
  // | Course | Grades | Credits | Term | UC / A–G | Brahma Tech | Prerequisite |
  if (cells.length < 8) continue;
  const [, name, grades, credits, , uc, brahma] = cells;
  if (!name || name === 'Course' || /^-+$/.test(name)) continue;

  let subjectArea = DEPT_AREA[dept];
  if (/^Health$/i.test(name)) subjectArea = 'Health';

  const row = {
    name,
    subject_area: subjectArea,
    credits: parseCredits(credits),
    satisfies_uc: /UC\/CSU/i.test(uc),
    satisfies_brahma_tech: brahma !== '—' && /year|brahma|yes/i.test(brahma),
    grade_levels: parseGrades(grades),
  };
  // Dedupe cross-listed courses by name (first occurrence wins).
  if (!byName.has(name)) byName.set(name, row);
}

const rows = [...byName.values()];
process.stdout.write(JSON.stringify(rows, null, 2));
console.error(
  `${rows.length} courses · UC: ${rows.filter((r) => r.satisfies_uc).length} · BrahmaTech: ${rows.filter((r) => r.satisfies_brahma_tech).length}`,
);
