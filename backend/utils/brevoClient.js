/**
 * Client minimal pour l'API Brevo (ex-Sendinblue) — email + SMS transactionnels.
 * Utilise fetch natif (Node 18+), aucune dépendance supplémentaire.
 * Doc : https://developers.brevo.com/reference/sendtransacemail  et  /sendtransacsms
 */

const BREVO_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";
const BREVO_SMS_URL = "https://api.brevo.com/v3/transactionalSMS/sms";

function getApiKey() {
  const key = process.env.BREVO_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "BREVO_API_KEY manquant dans backend/.env — créez un compte sur brevo.com et générez une clé API v3."
    );
  }
  return key;
}

/** Envoie un email transactionnel via Brevo. */
export async function sendEmail({ to, toName, subject, html }) {
  const apiKey = getApiKey();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "Hôtel";

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL manquant dans backend/.env.");
  }

  const res = await fetch(BREVO_EMAIL_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to, name: toName || undefined }],
      subject,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Échec envoi email (HTTP ${res.status})`);
  }

  return res.json();
}

/** Envoie un SMS transactionnel via Brevo. Le numéro doit être au format international (+225...). */
export async function sendSms({ to, content }) {
  const apiKey = getApiKey();
  const sender = process.env.BREVO_SMS_SENDER?.trim();

  if (!sender) {
    throw new Error("BREVO_SMS_SENDER manquant dans backend/.env.");
  }

  const res = await fetch(BREVO_SMS_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      recipient: to,
      content,
      type: "transactional",
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Échec envoi SMS (HTTP ${res.status})`);
  }

  return res.json();
}
