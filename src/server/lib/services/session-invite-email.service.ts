import { sendSparkPostHtmlMail } from './sparkpost-email.service';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Email to an Auth0 user: direct link to the document session.
 */
export async function sendSessionInviteExistingUserEmail(
  env: Env,
  args: { to: string; documentUrl: string },
): Promise<void> {
  const subject = 'You have been invited to a Party-PDF session';
  const html = `<p>You have been invited to collaborate on a document session.</p>
<p><a href="${escapeHtml(args.documentUrl)}">Open the session</a></p>
<p>If the link does not work, copy and paste this URL into your browser:<br/>${escapeHtml(args.documentUrl)}</p>`;

  await sendSparkPostHtmlMail(env, {
    to: args.to,
    subject,
    html,
  });
}

/**
 * Email after pre-provisioning an Auth0 database user: link sets password and redirects to the session.
 */
export async function sendSessionInviteFinishRegistrationEmail(
  env: Env,
  args: { to: string; finishRegistrationUrl: string; sessionDocumentUrl: string },
): Promise<void> {
  const subject = 'Complete your Party-PDF registration';
  const html = `<p>You have been invited to collaborate on a Party-PDF document session.</p>
<p>An account has been started for this email. Use the link below to choose a password.</p>
<p><a href="${escapeHtml(args.finishRegistrationUrl)}">Set your password (Auth0)</a></p>
<p>If that link does not work, copy and paste this URL into your browser:<br/>${escapeHtml(args.finishRegistrationUrl)}</p>
<p>After your password is set, open the session here (needed if Auth0 does not redirect you automatically):<br/>
<a href="${escapeHtml(args.sessionDocumentUrl)}">Open collaboration session</a></p>
<p>Plain link:<br/>${escapeHtml(args.sessionDocumentUrl)}</p>`;

  await sendSparkPostHtmlMail(env, {
    to: args.to,
    subject,
    html,
  });
}
