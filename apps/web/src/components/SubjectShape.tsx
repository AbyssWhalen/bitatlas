import type { Subject } from '@408os/domain';

const SHAPES: Record<Subject, React.ReactNode> = {
  'data-structures': <polygon points="6,1 11.5,11 0.5,11" />,
  'computer-organization': <rect x="1.5" y="1.5" width="9" height="9" />,
  'operating-systems': <circle cx="6" cy="6" r="5" />,
  'computer-networks': <polygon points="6,0.5 11.5,6 6,11.5 0.5,6" />,
};

/** Subjects are told apart by shape, not colour. Drawn rather than typed so all four share one optical size. */
export function SubjectShape({ subject }: { subject: Subject }) {
  return <svg className="subject-shape" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">{SHAPES[subject]}</svg>;
}
