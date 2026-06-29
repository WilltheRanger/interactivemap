import { motion } from 'framer-motion';
import { ChevronRight, ExternalLink, Mail } from 'lucide-react';
import { Card } from '../../components';
import { fadeUpItem, staggerContainer } from '../../lib/motion';
import { LINK_SECTIONS, TEACHER_EMAILS, gmailComposeUrl } from './links.data';
import './Links.css';

/**
 * Links: a directory of external school resources (Aeries, Classroom, the school site, …) plus a
 * teacher-email section whose rows open a pre-addressed Gmail compose window. Replaces the old
 * hall-pass Log tab. Every destination is external, so rows are plain anchors that open in a new tab;
 * the content lives in links.data.ts.
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
                    <span className="link-row__icon" aria-hidden="true">
                      <Icon size={20} />
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

        <motion.section className="links-section" variants={fadeUpItem}>
          <h2 className="links-section__title">Teacher emails</h2>
          <Card className="links-card">
            {TEACHER_EMAILS.map((teacher) => (
              <a
                key={teacher.email}
                className="link-row"
                href={gmailComposeUrl(teacher.email)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Email ${teacher.name} in Gmail (opens in a new tab)`}
              >
                <span className="link-row__icon" aria-hidden="true">
                  <Mail size={20} />
                </span>
                <span className="link-row__text">
                  <span className="link-row__label">{teacher.name}</span>
                  <span className="link-row__desc">{teacher.email}</span>
                </span>
                <ChevronRight className="link-row__chevron" size={16} aria-hidden="true" />
              </a>
            ))}
          </Card>
        </motion.section>
      </motion.div>
    </section>
  );
}
