import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const sections = [
  {
    title: 'System Architecture',
    description: 'Frontend/Backend boundaries, runtime lifecycle, and data flow.',
    to: '/docs/architecture',
  },
  {
    title: 'Operational Runbook',
    description: 'Release process, signing requirements, and Vercel hosting guidance.',
    to: '/docs/operations',
  },
  {
    title: 'Exhaustive Reference',
    description: 'Generated inventory and function index covering tracked source files.',
    to: '/docs/reference/source-inventory',
  },
];

export default function Home(): JSX.Element {
  return (
    <Layout
      title="Local Player Documentation"
      description="Technical documentation for Local Player desktop app"
    >
      <main className={styles.main}>
        <section className={styles.hero}>
          <Heading as="h1" className={styles.title}>
            Local Player Documentation
          </Heading>
          <p className={styles.subtitle}>
            Full technical reference for the Tauri + React desktop audio player, including architecture,
            command surfaces, data contracts, release operations, and roadmap separation.
          </p>
          <div className={styles.actions}>
            <Link className="button button--primary button--lg" to="/docs/overview">
              Open Documentation
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/reference/function-index">
              View Function Index
            </Link>
          </div>
        </section>

        <section className={styles.grid}>
          {sections.map((section) => (
            <Link key={section.title} className={styles.card} to={section.to}>
              <Heading as="h2" className={styles.cardTitle}>
                {section.title}
              </Heading>
              <p>{section.description}</p>
            </Link>
          ))}
        </section>
      </main>
    </Layout>
  );
}
