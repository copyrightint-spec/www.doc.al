import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

function baseTemplate(content: string, brandColor = "#dc2626", companyName = "doc.al", companyLogo?: string | null) {
  const logoHtml = companyLogo
    ? `<img src="${companyLogo}" alt="${companyName}" style="height: 48px; object-fit: contain;" />`
    : `<div style="display: inline-flex; align-items: center; gap: 8px;">
        <div style="background: ${brandColor}; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
          ${companyName.charAt(0).toUpperCase()}
        </div>
        <span style="font-size: 20px; font-weight: 700; color: #18181b;">${companyName}</span>
      </div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 24px 32px; border-bottom: 1px solid #f0f0f0;">
                  ${logoHtml}
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 24px 32px; background: #fafafa; border-top: 1px solid #f0f0f0;">
                  <p style="margin: 0; font-size: 11px; color: #a1a1aa; text-align: center;">
                    Siguruar nga <strong>doc.al</strong> - Platforma e Nenshkrimit Elektronik
                  </p>
                  <p style="margin: 4px 0 0; font-size: 11px; color: #a1a1aa; text-align: center;">
                    Nese nuk e prisni kete email, mund ta injoroni.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  try {
    const content = `
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px;">Verifikim</h2>
      <p style="margin: 0 0 20px; color: #52525b; font-size: 15px; line-height: 1.5;">Kodi juaj i verifikimit eshte:</p>
      <div style="background: #fafafa; padding: 20px; text-align: center; border-radius: 12px; margin: 0 0 20px; border: 1px solid #e4e4e7;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #18181b; font-family: monospace;">${code}</span>
      </div>
      <p style="margin: 0; color: #71717a; font-size: 13px;">Ky kod skadon pas 5 minutash.</p>
    `;
    await resend.emails.send({
      from: "doc.al <noreply@doc.al>",
      to: email,
      subject: "Kodi i verifikimit - doc.al",
      html: baseTemplate(content),
    });
    return true;
  } catch {
    console.error("Failed to send verification email");
    return false;
  }
}

export interface ContractEmailDetails {
  contractNumber: string;
  contractTitle: string;
  parties: { fullName: string; role: string; partyNumber: number }[];
  creatorName: string;
  creatorEmail?: string;
}

export async function sendSigningInvitation(
  email: string,
  signerName: string,
  documentTitle: string,
  signingUrl: string,
  requesterName: string,
  options?: {
    companyName?: string;
    companyLogo?: string | null;
    brandColor?: string;
    message?: string;
    expiresAt?: Date;
    contract?: ContractEmailDetails;
  }
): Promise<boolean> {
  try {
    const brandColor = options?.brandColor || "#dc2626";
    const companyName = options?.companyName || "doc.al";
    const expiresText = options?.expiresAt
      ? `<p style="margin: 0; color: #71717a; font-size: 12px; margin-top: 8px;">Skadon me: ${options.expiresAt.toLocaleDateString("sq-AL", { day: "numeric", month: "long", year: "numeric" })}</p>`
      : "";

    const messageText = options?.message
      ? `<div style="background: #fafafa; padding: 12px 16px; border-radius: 8px; margin: 16px 0; border-left: 3px solid ${brandColor};">
          <p style="margin: 0; color: #52525b; font-size: 14px;">${options.message}</p>
        </div>`
      : "";

    // Contract details section
    const c = options?.contract;
    const contractSection = c
      ? `
      <!-- Contract details card -->
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 20px; margin: 20px 0; background: #fafafa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #3f3f46;">
          <tr>
            <td colspan="2" style="padding-bottom: 12px; border-bottom: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #18181b;">${c.contractTitle}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #71717a; font-family: monospace;">${c.contractNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0 4px; font-weight: 600; color: #52525b; width: 120px; vertical-align: top;">Gjeneruar nga:</td>
            <td style="padding: 12px 0 4px;">${c.creatorName}${c.creatorEmail ? ` (${c.creatorEmail})` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #52525b; vertical-align: top;">Palet:</td>
            <td style="padding: 4px 0;">
              ${c.parties.map((p) => `<div style="margin-bottom: 4px;">${p.partyNumber}. <strong>${p.fullName}</strong> — ${p.role}</div>`).join("")}
            </td>
          </tr>
        </table>
      </div>
      `
      : "";

    const content = `
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 20px;">Pershendetje ${signerName},</h2>
      <p style="margin: 0 0 16px; color: #52525b; font-size: 15px; line-height: 1.6;">
        Ju jeni ftuar te nenshkruani nje kontrate. Ju lutem shikoni detajet me poshte dhe klikoni butonin per te vazhduar me nenshkrimin.
      </p>

      ${contractSection}

      ${messageText}

      <!-- Document card -->
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="48" style="vertical-align: top;">
              <div style="width: 40px; height: 40px; background: ${brandColor}15; border-radius: 10px; text-align: center; line-height: 40px; color: ${brandColor}; font-size: 18px;">
                📄
              </div>
            </td>
            <td style="padding-left: 12px;">
              <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 14px;">${documentTitle}</p>
              <p style="margin: 4px 0 0; color: #71717a; font-size: 12px;">Derguar nga: ${requesterName}</p>
              ${expiresText}
            </td>
          </tr>
        </table>
      </div>

      <a href="${signingUrl}" style="display: block; background: ${brandColor}; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; text-align: center; font-weight: 600; font-size: 15px; margin: 24px 0;">
        Nenshkruaj Kontraten
      </a>

      <p style="margin: 16px 0 0; color: #71717a; font-size: 13px; line-height: 1.5;">
        Nese keni pyetje, kontaktoni ${requesterName} ose ekipin tone ne support@doc.al.
      </p>
    `;

    const subjectPrefix = c ? `${c.contractNumber} — ` : "";
    await resend.emails.send({
      from: `${companyName} <noreply@doc.al>`,
      to: email,
      subject: `${subjectPrefix}Kerkese per nenshkrim: ${documentTitle}`,
      html: baseTemplate(content, brandColor, companyName, options?.companyLogo),
    });
    return true;
  } catch {
    console.error("Failed to send signing invitation");
    return false;
  }
}

export async function sendSigningReminder(
  email: string,
  signerName: string,
  documentTitle: string,
  signingUrl: string,
  options?: {
    companyName?: string;
    brandColor?: string;
    contract?: ContractEmailDetails;
  }
): Promise<boolean> {
  try {
    const brandColor = options?.brandColor || "#dc2626";
    const c = options?.contract;

    const contractInfo = c
      ? `
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 14px; margin: 16px 0; background: #fafafa;">
        <p style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #18181b;">${c.contractTitle}</p>
        <p style="margin: 0 0 8px; font-size: 11px; color: #71717a; font-family: monospace;">${c.contractNumber}</p>
        <p style="margin: 0; font-size: 12px; color: #52525b;">Gjeneruar nga: ${c.creatorName}</p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #52525b;">Palet: ${c.parties.map((p) => p.fullName).join(", ")}</p>
      </div>
      `
      : `
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin: 16px 0; background: #fffbeb;">
        <p style="margin: 0; font-weight: 600; color: #18181b; font-size: 14px;">${documentTitle}</p>
      </div>
      `;

    const content = `
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 20px;">Kujtese: Nenshkrim ne pritje</h2>
      <p style="margin: 0 0 16px; color: #52525b; font-size: 15px; line-height: 1.6;">
        Pershendetje ${signerName}, ju keni nje kontrate qe pret nenshkrimin tuaj:
      </p>
      ${contractInfo}
      <a href="${signingUrl}" style="display: block; background: ${brandColor}; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; text-align: center; font-weight: 600; font-size: 15px; margin: 24px 0;">
        Nenshkruaj Tani
      </a>
    `;
    const subjectPrefix = c ? `${c.contractNumber} — ` : "";
    await resend.emails.send({
      from: `${options?.companyName || "doc.al"} <noreply@doc.al>`,
      to: email,
      subject: `${subjectPrefix}Kujtese: ${documentTitle} - pret nenshkrimin tuaj`,
      html: baseTemplate(content, brandColor),
    });
    return true;
  } catch {
    console.error("Failed to send signing reminder");
    return false;
  }
}

export async function sendCertificateRenewalAlert(
  email: string,
  userName: string,
  serialNumber: string,
  subjectDN: string,
  validTo: Date,
  daysRemaining: number
): Promise<boolean> {
  try {
    const urgencyColor = daysRemaining <= 30 ? "#dc2626" : daysRemaining <= 60 ? "#f59e0b" : "#3b82f6";
    const content = `
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 20px;">Certifikata po skadon</h2>
      <p style="margin: 0 0 16px; color: #52525b; font-size: 15px; line-height: 1.6;">
        Pershendetje ${userName},
      </p>
      <div style="border: 2px solid ${urgencyColor}; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; font-weight: 600; color: ${urgencyColor}; font-size: 14px;">
          ${daysRemaining <= 30 ? "⚠️ URGJENT" : daysRemaining <= 60 ? "⚡ Njoftim" : "ℹ️ Kujtese"}:
          Certifikata juaj skadon per ${daysRemaining} dite
        </p>
        <table style="width: 100%; font-size: 13px; color: #52525b;">
          <tr><td style="padding: 4px 0; font-weight: 600;">Nr. Serie:</td><td>${serialNumber}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Subjekti:</td><td>${subjectDN}</td></tr>
          <tr><td style="padding: 4px 0; font-weight: 600;">Skadon:</td><td>${validTo.toLocaleDateString("sq-AL", { day: "numeric", month: "long", year: "numeric" })}</td></tr>
        </table>
      </div>
      <a href="${process.env.NEXTAUTH_URL || "https://www.doc.al"}/dashboard/certificates" style="display: block; background: ${urgencyColor}; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; text-align: center; font-weight: 600; font-size: 14px; margin: 20px 0;">
        Rinovojeni Certifikaten
      </a>
    `;
    await resend.emails.send({
      from: "doc.al <noreply@doc.al>",
      to: email,
      subject: `${daysRemaining <= 30 ? "⚠️ URGJENT: " : ""}Certifikata juaj skadon per ${daysRemaining} dite`,
      html: baseTemplate(content),
    });
    return true;
  } catch {
    console.error("Failed to send certificate renewal alert");
    return false;
  }
}

export async function sendSigningCompleted(
  email: string,
  signerName: string,
  documentTitle: string,
  verifyUrl: string,
  options?: {
    contract?: ContractEmailDetails;
    companyName?: string;
    companyLogo?: string | null;
    brandColor?: string;
  }
): Promise<boolean> {
  try {
    const c = options?.contract;
    const brandColor = options?.brandColor || "#18181b";
    const companyName = options?.companyName || "doc.al";

    const contractInfo = c
      ? `
      <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 16px; margin: 16px 0; background: #fafafa;">
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #3f3f46;">
          <tr>
            <td colspan="2" style="padding-bottom: 10px; border-bottom: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 15px; font-weight: 700; color: #18181b;">${c.contractTitle}</p>
              <p style="margin: 4px 0 0; font-size: 12px; color: #71717a; font-family: monospace;">${c.contractNumber}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0 4px; font-weight: 600; color: #52525b; width: 120px; vertical-align: top;">Gjeneruar nga:</td>
            <td style="padding: 10px 0 4px;">${c.creatorName}${c.creatorEmail ? ` (${c.creatorEmail})` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 600; color: #52525b; vertical-align: top;">Palet:</td>
            <td style="padding: 4px 0;">
              ${c.parties.map((p) => `<div style="margin-bottom: 3px;">${p.partyNumber}. <strong>${p.fullName}</strong> — ${p.role}</div>`).join("")}
            </td>
          </tr>
        </table>
      </div>
      `
      : "";

    const content = `
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 20px;">Kontrata u nenshkrua me sukses!</h2>
      <p style="margin: 0 0 16px; color: #52525b; font-size: 15px; line-height: 1.6;">
        Pershendetje ${signerName}, dokumenti <strong>"${documentTitle}"</strong> eshte nenshkruar me sukses nga te gjithe palet.
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center;">
        <p style="margin: 0; color: #166534; font-weight: 600;">Perfunduar me sukses</p>
        <p style="margin: 8px 0 0; color: #15803d; font-size: 13px;">Nenshkrimi eshte ankoruar ne blockchain</p>
      </div>
      ${contractInfo}
      <a href="${verifyUrl}" style="display: block; background: ${brandColor}; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; text-align: center; font-weight: 600; font-size: 14px; margin: 20px 0;">
        Verifiko Dokumentin
      </a>
      <p style="margin: 0; color: #71717a; font-size: 12px; line-height: 1.5;">
        Nje kopje dixhitale e kontrates se nenshkruar do te ruhet ne llogarine tuaj ne doc.al.
      </p>
    `;
    await resend.emails.send({
      from: `${companyName} <noreply@doc.al>`,
      to: email,
      subject: `${c ? c.contractNumber + " — " : ""}Kontrata "${documentTitle}" u nenshkrua me sukses`,
      html: baseTemplate(content, brandColor, companyName, options?.companyLogo),
    });
    return true;
  } catch {
    console.error("Failed to send signing completed email");
    return false;
  }
}
