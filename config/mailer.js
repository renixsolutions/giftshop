const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM
} = process.env;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Missing SMTP_* env vars for mailer.');
  }

  const port = parseInt(SMTP_PORT, 10);
  // Gmail app passwords are sometimes entered with spaces (grouped 4-4-4-4).
  // Normalize by removing whitespace so nodemailer/auth gets the real password.
  const normalizedPass = String(SMTP_PASS).replace(/\s+/g, '');
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: false, // for 587
    requireTLS: true,
    auth: {
      user: SMTP_USER,
      pass: normalizedPass
    },
    // Helps Gmail work smoothly
    tls: {
      rejectUnauthorized: false
    }
  });
}

async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();
  const from = SMTP_FROM || SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    text
  });
}

module.exports = {
  sendMail
};

