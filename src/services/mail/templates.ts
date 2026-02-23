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

export function verifyEmailTemplate(payload: AuthTemplatePayload): MailTemplate {
  return {
    subject: `${payload.appName}: verify your email`,
    text: [
      `Hi,`,
      ``,
      `Please verify your email address for ${payload.appName}.`,
      `Open this link: ${payload.actionUrl}`,
      ``,
      `If you did not request this, you can ignore this message.`,
    ].join("\n"),
    html: [
      `<p>Hi,</p>`,
      `<p>Please verify your email address for <strong>${payload.appName}</strong>.</p>`,
      `<p><a href="${payload.actionUrl}">Verify email</a></p>`,
      `<p>If you did not request this, you can ignore this message.</p>`,
    ].join(""),
  };
}

export function resetPasswordTemplate(payload: AuthTemplatePayload): MailTemplate {
  return {
    subject: `${payload.appName}: reset your password`,
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
      `<p>Use this link to reset your <strong>${payload.appName}</strong> password:</p>`,
      `<p><a href="${payload.actionUrl}">Reset password</a></p>`,
      `<p>If you did not request this, you can ignore this message.</p>`,
    ].join(""),
  };
}
