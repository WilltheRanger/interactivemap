import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Card, Skeleton } from '../../components';
import { useLinks } from '../../data/hooks';
import type { LinkRow } from '../../lib/refData';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { FALLBACK_LINKS, iconFor } from './links.data';
import { StaffDirectory } from './StaffDirectory';
import './Links.css';

/** Group rows into sections, ordered by each section's lowest sort_order (rows already sorted). */
function groupBySection(rows: LinkRow[]): { section: string; items: LinkRow[] }[] {
  const bySection = new Map<string, LinkRow[]>();
  for (const row of rows) {
    const list = bySection.get(row.section) ?? [];
    list.push(row);
    bySection.set(row.section, list);
  }
  return [...bySection.entries()]
    .map(([section, items]) => ({
      section,
      items,
      order: Math.min(...items.map((i) => i.sort_order)),
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ section, items }) => ({ section, items }));
}

/**
 * Links: a directory of external school resources (admin-managed in Supabase, with a static fallback)
 * plus a searchable teacher/staff section whose rows open a pre-addressed Gmail compose. Replaces the
 * old hall-pass Log tab. Tool rows are anchors that open in a new tab.
 */
export function LinksScreen() {
  const links = useLinks();
  // Fall back to the bundled list when the table is unreachable (e.g. before the migration) or empty.
  const rows =
    links.isError || (links.isSuccess && links.data.length === 0)
      ? FALLBACK_LINKS
      : (links.data ?? []);
  const sections = groupBySection(rows);

  return (
    <section className="screen" aria-labelledby="links-title">
      <h1 id="links-title" className="screen__title">
        Links
      </h1>
      <p className="screen__sub">School tools, resources, and teacher contacts.</p>

      <motion.div
        className="screen__body"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {links.isPending ? (
          <div className="links-section" aria-busy="true" role="status" aria-label="Loading links">
            <Skeleton height={64} radius="var(--radius-lg)" />
            <Skeleton height={220} radius="var(--radius-lg)" />
          </div>
        ) : (
          sections.map((section) => (
            <motion.section className="links-section" key={section.section} variants={fadeUpItem}>
              <h2 className="links-section__title">{section.section}</h2>
              <Card className="links-card">
                {section.items.map((item) => {
                  const Icon = iconFor(item.icon);
                  return (
                    <a
                      key={item.id}
                      className="link-row"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${item.label} (opens in a new tab)`}
                    >
                      <span className="link-row__tile" style={{ backgroundColor: item.tint }}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="link-row__text">
                        <span className="link-row__label">{item.label}</span>
                        {item.description && (
                          <span className="link-row__desc">{item.description}</span>
                        )}
                      </span>
                      <ExternalLink className="link-row__chevron" size={16} aria-hidden="true" />
                    </a>
                  );
                })}
              </Card>
            </motion.section>
          ))
        )}

        <motion.div variants={fadeUpItem}>
          <StaffDirectory />
        </motion.div>
      </motion.div>
    </section>
  );
}
