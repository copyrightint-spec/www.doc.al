import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationCode(
  email: string,
  code: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "doc.al <noreply@doc.al>",
      to: email,
      subject: "Kodi i verifikimit - doc.al",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">doc.al - Verifikim</h2>
          <p>Kodi juaj i verifikimit eshte:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Ky kod skadon pas 5 minutash.</p>
        </div>
      `,
    });
    return true;
  } catch {
    console.error("Failed to send verification email");
    return false;
  }
}

export async function sendSigningInvitation(
  email: string,
  signerName: string,
  documentTitle: string,
  signingUrl: string,
  requesterName: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: "doc.al <noreply@doc.al>",
      to: email,
      subject: `Kerkese per nenshkrim: ${documentTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">doc.al - Kerkese Nenshkrimi</h2>
          <p>Pershendetje ${signerName},</p>
          <p><strong>${requesterName}</strong> ju ka derguar dokumentin <strong>"${documentTitle}"</strong> per nenshkrim.</p>
          <a href="${signingUrl}" style="display: inline-block; background: #1a1a2e; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 20px 0;">
            Nenshkruaj Dokumentin
          </a>
          <p style="color: #666; font-size: 14px;">Nese nuk e prisni kete email, mund ta injoroni.</p>
        </div>
      `,
    });
    return true;
  } catch {
    console.error("Failed to send signing invitation");
    return false;
  }
}
