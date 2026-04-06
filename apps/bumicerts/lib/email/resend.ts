import { Resend } from "resend";
import { serverEnv as env } from "@/lib/env/server";

export const resend = new Resend(env.RESEND_API_KEY);

export const getInviteEmailConfig = () => {
  const from = "noreply@gainforest.id";
  const subject = "Your Bumicerts Invite Code";

  return { from, subject };
};

export const getVerificationEmailConfig = () => {
  const from = "noreply@gainforest.id";
  const subject = "Your Bumicerts Verification Code";

  return { from, subject };
};
