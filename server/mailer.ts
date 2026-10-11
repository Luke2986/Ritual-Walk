import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function isMailConfigured(): boolean {
  return !!process.env.SMTP_URL && !!process.env.EMAIL_FROM;
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  validMinutes: number,
): Promise<void> {
  transporter ??= nodemailer.createTransport(process.env.SMTP_URL);
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `${code} è il tuo codice Step Ritual`,
    text: [
      `Il tuo codice per reimpostare la password di Step Ritual è: ${code}`,
      "",
      `Scade tra ${validMinutes} minuti.`,
      "Se non l'hai chiesto tu, ignora questa email: la tua password resta la stessa.",
    ].join("\n"),
  });
}
