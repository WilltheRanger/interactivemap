import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Card } from '../../components';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { LINK_SECTIONS } from './links.data';
import { StaffDirectory } from './StaffDirectory';
import './Links.css';

/**
 * Links: a directory of external school resources (Aeries, Classroom, the school site, …) plus a
 * searchable teacher/staff section whose rows open a pre-addressed Gmail compose. Replaces the old
 * hall-pass Log tab. Every destination is external, so tool rows are anchors that open in a new tab;
 * the content lives in links.data.ts and teacherDirectory.ts.
 */
export function LinksScreen() {
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
        {LINK_SECTIONS.map((section) => (
          <motion.section className="links-section" key={section.title} variants={fadeUpItem}>
            <h2 className="links-section__title">{section.title}</h2>
            <Card className="links-card">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    className="link-row"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.label} (opens in a new tab)`}
                  >
                    <span className="link-row__tile" style={{ backgroundColor: item.tint }}>
                      {item.logo ? (
                        <img className="link-row__logo" src={item.logo} alt="" />
                      ) : (
                        <Icon size={20} aria-hidden="true" />
                      )}
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
        ))}

        <motion.div variants={fadeUpItem}>
          <StaffDirectory />
        </motion.div>
      </motion.div>
    </section>
  );
}
