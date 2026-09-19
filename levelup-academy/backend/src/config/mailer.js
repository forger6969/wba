import nodemailer from 'nodemailer';
import { env } from './env.js';

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  ...(env.SMTP_USER && {
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  }),
});

export async function sendMail({ to, subject, text, html, attachments }) {
  return mailer.sendMail({ from: env.SMTP_FROM, to, subject, text, html, attachments });
}
