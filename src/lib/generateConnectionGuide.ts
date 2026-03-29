import jsPDF from "jspdf";

const BRAND_COLOR: [number, number, number] = [249, 115, 22]; // #F97316
const DARK: [number, number, number] = [26, 26, 46];
const GRAY: [number, number, number] = [102, 102, 102];
const LIGHT_BG: [number, number, number] = [255, 247, 237];

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  educator: "Éducateur canin",
  shelter: "Refuge / Structure",
  shelter_employee: "Employé de refuge",
  admin: "Administrateur",
};

interface GuideParams {
  name: string;
  email: string;
  role: string;
  tempPassword: string;
}

export function generateConnectionGuidePDF({ name, email, role, tempPassword }: GuideParams): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 25;
  const contentW = pageW - margin * 2;
  let y = 30;

  // ── Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...DARK);
  doc.text("DogWork", pageW / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(14);
  doc.setTextColor(...BRAND_COLOR);
  doc.text(`Guide de connexion — ${name}`, pageW / 2, y, { align: "center" });
  y += 6;

  // Line
  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  // Role
  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text("Rôle : ", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(ROLE_LABELS[role] || role, margin + doc.getTextWidth("Rôle : "), y);
  y += 10;

  // ── Credentials box
  const boxH = 32;
  doc.setFillColor(...BRAND_COLOR);
  doc.roundedRect(margin, y, contentW, 9, 2, 2, "F");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Vos identifiants de connexion", pageW / 2, y + 6.5, { align: "center" });
  y += 9;

  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, contentW, boxH, 0, 0, "F");
  doc.setDrawColor(...BRAND_COLOR);
  doc.roundedRect(margin, y - 9, contentW, boxH + 9, 2, 2, "S");

  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.setFont("courier", "bold");
  doc.text(`Email :  ${email}`, pageW / 2, y + 11, { align: "center" });
  doc.text(`Mot de passe temporaire :  ${tempPassword}`, pageW / 2, y + 23, { align: "center" });
  y += boxH + 6;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text("Ce mot de passe est temporaire. Vous devrez le changer lors de votre première connexion.", margin, y);
  y += 12;

  // ── Steps
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text("Étapes de connexion", margin, y);
  y += 8;

  const steps = [
    { title: "Étape 1 — Accéder à DogWork", body: "Ouvrez votre navigateur et rendez-vous sur :\nhttps://dogwork.lovable.app" },
    { title: "Étape 2 — Se connecter", body: "Sur la page d'accueil, cliquez sur le bouton « Connexion »\nen haut à droite." },
    { title: "Étape 3 — Saisir vos identifiants", body: `Entrez votre adresse email : ${email}\nEntrez le mot de passe temporaire : ${tempPassword}\nPuis cliquez sur « Se connecter ».` },
    { title: "Étape 4 — Changer votre mot de passe", body: "Vous serez automatiquement redirigé vers une page\nde changement de mot de passe.\nChoisissez un mot de passe personnel d'au moins 8 caractères.\nConfirmez-le, puis validez." },
    { title: "Étape 5 — Accéder à votre espace", body: `Une fois le mot de passe défini, vous accédez directement\nà votre tableau de bord ${ROLE_LABELS[role] || role}.` },
  ];

  for (const step of steps) {
    const lines = step.body.split("\n");
    const stepH = 10 + lines.length * 5.5;

    if (y + stepH > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, stepH, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(step.title, margin + 4, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    lines.forEach((line, i) => {
      doc.text(line, margin + 8, y + 12 + i * 5.5);
    });

    y += stepH + 4;
  }

  // ── Security
  if (y + 30 > 270) { doc.addPage(); y = 20; }
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text("Sécurité", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const secItems = [
    "• Ne partagez jamais votre mot de passe.",
    "• En cas d'oubli, utilisez « Mot de passe oublié » sur la page de connexion.",
    "• En cas de problème, contactez le support DogWork.",
  ];
  for (const item of secItems) {
    doc.text(item, margin, y);
    y += 6;
  }

  // ── Footer
  y += 8;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("DogWork@Home by Teba — Support : teba.gaetan@gmail.com", pageW / 2, y, { align: "center" });

  return doc;
}
