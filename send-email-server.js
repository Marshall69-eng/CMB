// Tiny email relay for the birthday site (OPTION B). Needs Node.js 18+.
//
// Setup:   npm init -y && npm i express cors nodemailer
// Env vars (set them where you host this, never in the page):
//   GMAIL_USER          the Gmail address that sends the email
//   GMAIL_APP_PASSWORD  a Google "App password" (Google Account > Security > 2-Step Verification > App passwords)
//   TO_EMAIL            where you want to receive it
//   SITE_ORIGIN         your site's address, e.g. https://yoursite.netlify.app (optional but recommended)
// Run:     node send-email-server.js
// Then put  https://<where-this-runs>/send  in emailEndpoint in index.html.
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");

const { GMAIL_USER, GMAIL_APP_PASSWORD, TO_EMAIL, SITE_ORIGIN, PORT = 3000 } = process.env;
if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !TO_EMAIL) {
  console.error("Set GMAIL_USER, GMAIL_APP_PASSWORD and TO_EMAIL first.");
  process.exit(1);
}

const mailer = nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
const app = express();
app.use(cors({ origin: SITE_ORIGIN || "*" }));
app.use(express.json({ limit: "20kb" }));

let recent = []; // simple spam guard: at most 20 emails per hour in total
app.post("/send", async (req, res) => {
  const now = Date.now();
  recent = recent.filter(t => now - t < 3600e3);
  if (recent.length >= 20) return res.status(429).json({ ok: false });

  const subject = String(req.body.subject || "").slice(0, 120);
  const message = String(req.body.message || "").slice(0, 8000);
  if (!subject || !message) return res.status(400).json({ ok: false });

  try {
    await mailer.sendMail({ from: GMAIL_USER, to: TO_EMAIL, subject, text: message });
    recent.push(now);
    res.json({ ok: true });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => console.log(`Email relay running on port ${PORT}`));
