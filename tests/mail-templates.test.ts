import { describe, expect, it } from "vitest";

import {
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "../src/services/mail/templates";

const payload = {
  appName: "Telecommut",
  actionUrl: "https://telecommut.example/action",
  recipientEmail: "user@example.com",
};

describe("auth mail templates", () => {
  it("renders verify-email template", () => {
    const template = verifyEmailTemplate(payload);

    expect(template.subject).toMatch(/verify your email/i);
    expect(template.text).toContain(payload.actionUrl);
    expect(template.html).toContain(payload.actionUrl);
  });

  it("renders reset-password template", () => {
    const template = resetPasswordTemplate(payload);

    expect(template.subject).toMatch(/reset your password/i);
    expect(template.text).toContain(payload.actionUrl);
    expect(template.html).toContain(payload.actionUrl);
  });
});
