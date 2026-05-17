import { supabase } from "@/integrations/supabase/client";
import { generateConnectionGuidePDF } from "@/lib/generateConnectionGuide";

interface SendOnboardingParams {
  recipientEmail: string;
  recipientName: string;
  role: "owner" | "educator" | "shelter" | "shelter_employee" | "admin" | string;
  temporaryPassword: string;
  organizationName?: string;
}

/**
 * Génère le PDF de bienvenue, l'uploade dans le bucket `onboarding-pdfs` (privé),
 * crée un signed URL valable 7 jours, et envoie un email transactionnel
 * `admin-credentials` à l'utilisateur.
 *
 * Conçu en best-effort : toute erreur est loguée et renvoyée sans bloquer
 * le flux de création de compte côté UI.
 */
export async function sendOnboardingEmail(
  params: SendOnboardingParams,
): Promise<{ ok: boolean; error?: string; pdfUrl?: string }> {
  const { recipientEmail, recipientName, role, temporaryPassword, organizationName } = params;

  try {
    // 1. Génération du PDF côté client (jsPDF)
    const doc = generateConnectionGuidePDF({
      name: recipientName,
      email: recipientEmail,
      role,
      tempPassword: temporaryPassword,
    });
    const blob = doc.output("blob");

    // 2. Upload dans le bucket privé
    const safeName = recipientEmail.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const path = `${safeName}/${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("onboarding-pdfs")
      .upload(path, blob, { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;

    // 3. Signed URL (7 jours = 604800s)
    const { data: signed, error: signErr } = await supabase.storage
      .from("onboarding-pdfs")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr) throw signErr;
    const pdfUrl = signed?.signedUrl;

    // 4. Envoi de l'email transactionnel (identifiants inline + lien PDF)
    const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-credentials",
        recipientEmail,
        idempotencyKey: `admin-credentials-${recipientEmail}-${Date.now()}`,
        templateData: {
          name: recipientName,
          role,
          loginEmail: recipientEmail,
          temporaryPassword,
          pdfUrl,
          organizationName,
        },
      },
    });
    if (mailErr) throw mailErr;

    return { ok: true, pdfUrl };
  } catch (err: any) {
    console.error("[sendOnboardingEmail] failed", err);
    return { ok: false, error: err?.message || "Envoi email impossible" };
  }
}
