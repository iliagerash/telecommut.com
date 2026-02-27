export type AuthTemplatePayload = {
  appName: string;
  actionUrl: string;
  recipientEmail: string;
};

export type MailTemplate = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function verifyEmailTemplate(payload: AuthTemplatePayload): MailTemplate {
  const safeAppName = escapeHtml(payload.appName);
  const safeActionUrl = escapeHtml(payload.actionUrl);

  return {
    subject: "Verify your email",
    text: [
      `Hi,`,
      ``,
      `Please verify your email address for ${payload.appName}.`,
      `Open this link:`,
      payload.actionUrl,
      ``,
      `If you did not request this, you can ignore this message.`,
    ].join("\n"),
    html: [
      `<p>Hi,</p>`,
      `<p>Please verify your email address for <strong>${safeAppName}</strong>.</p>`,
      `<p><a href="${safeActionUrl}" target="_blank" rel="noopener noreferrer">Verify email</a></p>`,
      `<p>If the button does not work, copy and paste this URL into your browser:</p>`,
      `<p><code>${safeActionUrl}</code></p>`,
      `<p>If you did not request this, you can ignore this message.</p>`,
    ].join(""),
  };
}

export function resetPasswordTemplate(payload: AuthTemplatePayload): MailTemplate {
  const safeAppName = escapeHtml(payload.appName);
  const safeActionUrl = escapeHtml(payload.actionUrl);

  return {
    subject: "Reset your password",
    text: [
      `Hi,`,
      ``,
      `Use this link to reset your ${payload.appName} password:`,
      `${payload.actionUrl}`,
      ``,
      `If you did not request this, you can ignore this message.`,
    ].join("\n"),
    html: [
      `<p>Hi,</p>`,
      `<p>Use this link to reset your <strong>${safeAppName}</strong> password:</p>`,
      `<p><a href="${safeActionUrl}" target="_blank" rel="noopener noreferrer">Reset password</a></p>`,
      `<p>If the button does not work, copy and paste this URL into your browser:</p>`,
      `<p><code>${safeActionUrl}</code></p>`,
      `<p>If you did not request this, you can ignore this message.</p>`,
    ].join(""),
  };
}

export type ContactTemplatePayload = {
  senderName: string;
  senderEmail: string;
  message: string;
};

export function contactTemplate(payload: ContactTemplatePayload): MailTemplate {
  return {
    subject: `Contact request from ${payload.senderName}`,
    text: [
      `Name: ${payload.senderName}`,
      `Email: ${payload.senderEmail}`,
      ``,
      payload.message,
    ].join("\n"),
    html: [
      `<p><strong>Name:</strong> ${payload.senderName}</p>`,
      `<p><strong>Email:</strong> ${payload.senderEmail}</p>`,
      `<p>${payload.message.replaceAll("\n", "<br />")}</p>`,
    ].join(""),
  };
}
