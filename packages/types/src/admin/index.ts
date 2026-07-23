// ─── EmailTemplate ────────────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  /** Stable identifier, e.g. "invitation", "approval_notification" */
  key: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  /** Variable placeholder names available in the template */
  variables: string[];
  updatedBy: string; // user ID
  updatedAt: Date;
}
