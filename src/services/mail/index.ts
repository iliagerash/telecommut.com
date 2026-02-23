export { sendMailgunMessage } from "@/services/mail/mailgun";
export {
  applyTemplate,
  contactTemplate,
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "@/services/mail/templates";
export type {
  ApplyTemplatePayload,
  AuthTemplatePayload,
  ContactTemplatePayload,
  MailTemplate,
} from "@/services/mail/templates";
