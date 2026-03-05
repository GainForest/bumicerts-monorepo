import { Resend } from "resend";

// Validated at runtime in each handler; empty string at build time is fine
const resendApiKey = process.env.RESEND_API_KEY ?? "";

export const resend = new Resend(resendApiKey || "placeholder");

export const getInviteEmailConfig = () => {
  const from = "noreply@gainforest.id";
  const subject = "Your Bumicerts Invite Code";

  return { from, subject };
};
