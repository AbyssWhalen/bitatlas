import type { ReactNode } from 'react';

export type LabExhibitMobileOrder = 'steps-first' | 'canvas-first';

export interface LabExhibitWorkspaceProps {
  /** Optional extra class name(s) on the .lab-exhibit-body grid container. */
  className?: string;
  /** Mobile (<=960px) vertical ordering between steps and canvas. Defaults to 'steps-first'. */
  mobileOrder?: LabExhibitMobileOrder;
  /** Slot 2: Parameter controls, inputs, equations, and summary metrics (follows Day/Night theme). */
  controls: ReactNode;
  /** Optional live current-step status strip (follows theme; sits above canvas on desktop). */
  status?: ReactNode;
  /** Slot 3: Dark visualization canvas (pinned to --canvas and night tokens inside). */
  canvas?: ReactNode;
  /** Slot 4: Step-by-step explanation & transport (StepExplorer or empty state, follows Day/Night theme). */
  steps?: ReactNode;
  /** Optional footer/conclusion block below the canvas. */
  footer?: ReactNode;
}

export interface LabExhibitProps {
  /** Additional page root class names (e.g. "min-heap-lab-page"). Always includes "page lab-exhibit-page". */
  pageClassName?: string;
  /** Quiet Chinese subject label displayed above the page title. */
  subjectLabel: string;
  /** Accessible h1 heading for the lab page. */
  title: string;
  /** Concise subtitle explaining the lab's scope. */
  description: string;
  /** Optional header action (e.g. jump to the linked source question). */
  headerAction?: ReactNode;
  /** Subject and module navigation bars (LabSectionNav + *ModuleTabs). */
  navigation?: ReactNode;
  /** Optional error/status banner rendered below navigation. */
  alert?: ReactNode;
  /** Optional preset/review boundary strip. */
  notice?: ReactNode;
  /** Optional single-line module subheading above the exhibit grid. */
  subheading?: ReactNode;
  /** Mobile (<=960px) vertical ordering between steps and canvas. Defaults to 'steps-first'. */
  mobileOrder?: LabExhibitMobileOrder;
  /** Slot 2: Parameter controls (standalone mode). Omit when using host mode with children. */
  controls?: ReactNode;
  /** Optional live current-step status strip (standalone mode). */
  status?: ReactNode;
  /** Slot 3: Dark visualization canvas (standalone mode). */
  canvas?: ReactNode;
  /** Slot 4: Step-by-step explanation & transport (standalone mode). */
  steps?: ReactNode;
  /** Optional footer/conclusion block below the canvas (standalone mode). */
  footer?: ReactNode;
  /** Host mode body: renders embedded LabExhibitWorkspace panels. */
  children?: ReactNode;
}

export interface LabExhibitNoticeProps {
  icon?: ReactNode;
  label: string;
  badge: string;
  note: string;
  action?: ReactNode;
}

export function LabExhibitNotice({ icon, label, badge, note, action }: LabExhibitNoticeProps) {
  return (
    <div className="lab-exhibit-notice">
      <span className="lab-exhibit-notice-label">
        {icon}
        {label}
      </span>
      <strong className="lab-exhibit-notice-badge">{badge}</strong>
      <small className="lab-exhibit-notice-note">{note}</small>
      {action ? <div className="lab-exhibit-notice-action">{action}</div> : null}
    </div>
  );
}

export function LabExhibitWorkspace({
  className,
  mobileOrder = 'steps-first',
  controls,
  status,
  canvas,
  steps,
  footer,
}: LabExhibitWorkspaceProps) {
  const classes = [
    'lab-exhibit-body',
    steps ? '' : 'no-steps',
    mobileOrder === 'canvas-first' ? 'canvas-first' : '',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="lab-exhibit-controls">{controls}</div>
      {status ? <div className="lab-exhibit-status">{status}</div> : null}
      {canvas ? (
        <div className="lab-exhibit-canvas" data-exhibit-canvas="dark">
          {canvas}
        </div>
      ) : null}
      {steps ? <div className="lab-exhibit-steps">{steps}</div> : null}
      {footer ? <div className="lab-exhibit-footer">{footer}</div> : null}
    </div>
  );
}

export function LabExhibit({
  pageClassName,
  subjectLabel,
  title,
  description,
  headerAction,
  navigation,
  alert,
  notice,
  subheading,
  mobileOrder = 'steps-first',
  controls,
  status,
  canvas,
  steps,
  footer,
  children,
}: LabExhibitProps) {
  const rootClassName = pageClassName
    ? `page lab-exhibit-page ${pageClassName}`
    : 'page lab-exhibit-page';

  return (
    <div className={rootClassName}>
      <header className="lab-exhibit-header">
        <div className="lab-exhibit-header-main">
          <span className="lab-exhibit-kicker">{subjectLabel}</span>
          <h1>{title}</h1>
          <p className="lab-exhibit-description">{description}</p>
        </div>
        {headerAction ? <div className="lab-exhibit-header-action">{headerAction}</div> : null}
      </header>

      {navigation ? <div className="lab-exhibit-nav">{navigation}</div> : null}
      {alert}
      {notice}
      {subheading ? <div className="lab-exhibit-subheading">{subheading}</div> : null}

      {controls !== undefined ? (
        <LabExhibitWorkspace
          mobileOrder={mobileOrder}
          controls={controls}
          status={status}
          canvas={canvas}
          steps={steps}
          footer={footer}
        />
      ) : (
        <div className="lab-exhibit-host-body">{children}</div>
      )}
    </div>
  );
}
