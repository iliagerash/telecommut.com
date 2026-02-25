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
    subject: "Verify your email",
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
      `<p>Use this link to reset your <strong>${payload.appName}</strong> password:</p>`,
      `<p><a href="${payload.actionUrl}">Reset password</a></p>`,
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

export type ApplyTemplatePayload = {
  senderName: string;
  senderEmail: string;
  jobId: string;
  message: string;
};

export function applyTemplate(payload: ApplyTemplatePayload): MailTemplate {
  return {
    subject: `Job application for #${payload.jobId} from ${payload.senderName}`,
    text: [
      `Name: ${payload.senderName}`,
      `Email: ${payload.senderEmail}`,
      `Job ID: ${payload.jobId}`,
      ``,
      payload.message,
    ].join("\n"),
    html: [
      `<p><strong>Name:</strong> ${payload.senderName}</p>`,
      `<p><strong>Email:</strong> ${payload.senderEmail}</p>`,
      `<p><strong>Job ID:</strong> ${payload.jobId}</p>`,
      `<p>${payload.message.replaceAll("\n", "<br />")}</p>`,
    ].join(""),
  };
}
