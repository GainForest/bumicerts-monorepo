import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY env var");
}

export const resend = new Resend(resendApiKey);

export const getInviteEmailConfig = () => {
  const from = "noreply@gainforest.id";
  const subject = "Your Bumicerts Invite Code";

  return { from, subject };
};
