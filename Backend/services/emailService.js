// Purpose: Backend service helpers for email workflows.
import axios from "axios";
import nodemailer from "nodemailer";
import { frontendUrl } from "../config.js";

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const hasSmtpConfig = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let smtpTransporter;

const getSmtpTransporter = () => {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return smtpTransporter;
};

export const buildFrontendLink = (path) => `${trimTrailingSlash(frontendUrl)}${path}`;

export const sendEmail = async ({ to, subject, text }) => {
  if (hasSmtpConfig()) {
    await getSmtpTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return;
  }

  if (process.env.EMAIL_WEBHOOK_URL) {
    await axios.post(process.env.EMAIL_WEBHOOK_URL, { to, subject, text });
    return;
  }

  console.log(`[email-dev] To: ${to}`);
  console.log(`[email-dev] Subject: ${subject}`);
  console.log(`[email-dev] ${text}`);
};
