import jsPDF from "jspdf";

const BRAND: [number, number, number] = [249, 115, 22]; // #F97316
const DARK: [number, number, number] = [26, 26, 46];
const GRAY: [number, number, number] = [102, 102, 102];
const LIGHT_BG: [number, number, number] = [255, 247, 237];
const WHITE: [number, number, number] = [255, 255, 255];
const CARD_BG: [number, number, number] = [30, 32, 48];
const INPUT_BG: [number, number, number] = [40, 42, 58];
const BLUE_BTN: [number, number, number] = [59, 130, 246];
const BORDER: [number, number, number] = [60, 62, 78];

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  educator: "Éducateur canin",
  shelter: "Refuge / Structure",
  shelter_employee: "Employé de refuge",
  admin: "Administrateur",
};

const ROLE_DESTINATIONS: Record<string, string> = {
  owner: "votre tableau de bord personnel avec vos chiens et vos programmes d'entraînement.",
  educator: "votre espace éducateur avec vos clients, vos cours et votre agenda.",
  shelter: "votre tableau de bord refuge avec vos animaux, vos employés et vos statistiques.",
  shelter_employee: "votre espace employé avec les animaux et les tâches de votre refuge.",
  admin: "le panneau d'administration DogWork.",
};

interface GuideParams {
  name: string;
  email: string;
  role: string;
  tempPassword: string;
}

// ─── Drawing helpers ───────────────────────────────────────────

function drawPhoneMockup(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Phone frame
  doc.setFillColor(20, 20, 30);
  doc.roundedRect(x, y, w, h, 4, 4, "F");
  doc.setDrawColor(80, 80, 100);
  doc.setLineWidth(0.5);
  doc.roundedRect(x, y, w, h, 4, 4, "S");
  // Notch
  const notchW = w * 0.3;
  doc.setFillColor(20, 20, 30);
  doc.roundedRect(x + (w - notchW) / 2, y, notchW, 2.5, 1, 1, "F");
}

function drawInputField(doc: jsPDF, x: number, y: number, w: number, label: string, placeholder: string) {
  doc.setFontSize(5.5);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "normal");
  doc.text(label, x, y);
  doc.setFillColor(...INPUT_BG);
  doc.roundedRect(x, y + 1, w, 7, 1.5, 1.5, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y + 1, w, 7, 1.5, 1.5, "S");
  doc.setFontSize(5);
  doc.setTextColor(120, 120, 140);
  doc.text(placeholder, x + 7, y + 5.5);
  // Icon placeholder
  doc.setFillColor(80, 80, 100);
  doc.circle(x + 3.5, y + 4.5, 1.5, "F");
}

function drawButton(doc: jsPDF, x: number, y: number, w: number, h: number, text: string, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  doc.setFontSize(5.5);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(text, x + w / 2, y + h / 2 + 1.5, { align: "center" });
}

function drawLoginScreen(doc: jsPDF, cx: number, y: number, isEmployee: boolean) {
  const phoneW = 50;
  const phoneH = 85;
  const px = cx - phoneW / 2;

  drawPhoneMockup(doc, px, y, phoneW, phoneH);

  const inner = px + 4;
  const innerW = phoneW - 8;
  let iy = y + 8;

  // Logo
  doc.setFillColor(...BRAND);
  doc.circle(cx, iy + 3, 3, "F");
  doc.setFontSize(4);
  doc.setTextColor(...WHITE);
  doc.text("🐕", cx - 1.5, iy + 4);
  iy += 8;

  // Title
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("DogWork", cx, iy, { align: "center" });
  iy += 4;
  doc.setFontSize(4.5);
  doc.setTextColor(140, 140, 160);
  doc.setFont("helvetica", "normal");
  doc.text("L'éducation canine intelligente", cx, iy, { align: "center" });
  iy += 6;

  // Card
  doc.setFillColor(...CARD_BG);
  const cardH = isEmployee ? 40 : 45;
  doc.roundedRect(inner, iy, innerW, cardH, 2, 2, "F");

  const ci = inner + 3;
  const ciW = innerW - 6;
  let cy2 = iy + 4;

  // Card title
  doc.setFontSize(6);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(isEmployee ? "Accès Employé" : "Connexion", ci, cy2);
  cy2 += 3;
  doc.setFontSize(4);
  doc.setTextColor(140, 140, 160);
  doc.setFont("helvetica", "normal");
  doc.text(isEmployee ? "Connectez-vous avec votre PIN" : "Entrez vos identifiants", ci, cy2);
  cy2 += 5;

  // Email
  drawInputField(doc, ci, cy2, ciW, "Email", "votre@email.com");
  cy2 += 12;

  // Password / PIN
  drawInputField(doc, ci, cy2, ciW, isEmployee ? "Code PIN" : "Mot de passe", isEmployee ? "123456" : "••••••••");
  cy2 += 12;

  // Button
  drawButton(doc, ci, cy2, ciW, 7, isEmployee ? "Connexion Employé" : "Se connecter", BLUE_BTN);

  if (!isEmployee) {
    // Links under card
    const ly = iy + cardH + 4;
    doc.setFontSize(4);
    doc.setTextColor(...BRAND);
    doc.text("Accès Employé refuge", cx, ly, { align: "center" });
    doc.text("Mot de passe oublié ?", cx, ly + 4, { align: "center" });
  } else {
    const ly = iy + cardH + 4;
    doc.setFontSize(4);
    doc.setTextColor(...BRAND);
    doc.text("← Retour à la connexion", cx, ly, { align: "center" });
    doc.setTextColor(120, 120, 140);
    doc.text("Le code PIN est fourni par votre refuge", cx, ly + 4, { align: "center" });
  }
}

function drawPasswordChangeScreen(doc: jsPDF, cx: number, y: number) {
  const phoneW = 50;
  const phoneH = 70;
  const px = cx - phoneW / 2;

  drawPhoneMockup(doc, px, y, phoneW, phoneH);

  const inner = px + 4;
  const innerW = phoneW - 8;
  let iy = y + 8;

  doc.setFillColor(...BRAND);
  doc.circle(cx, iy + 3, 3, "F");
  iy += 10;

  doc.setFontSize(6);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("Changement de", cx, iy, { align: "center" });
  iy += 4;
  doc.text("mot de passe", cx, iy, { align: "center" });
  iy += 6;

  doc.setFillColor(...CARD_BG);
  doc.roundedRect(inner, iy, innerW, 32, 2, 2, "F");

  const ci = inner + 3;
  const ciW = innerW - 6;
  let cy2 = iy + 5;

  drawInputField(doc, ci, cy2, ciW, "Nouveau mot de passe", "Min. 8 caractères");
  cy2 += 12;
  drawInputField(doc, ci, cy2, ciW, "Confirmer", "Retapez le mot de passe");
  cy2 += 12;
  drawButton(doc, ci, cy2, ciW, 7, "Valider", BLUE_BTN);
}

// ─── Annotation arrow helper ──────────────────────────────────

function drawAnnotation(doc: jsPDF, x: number, y: number, text: string, arrowToX: number, arrowToY: number) {
  doc.setFillColor(255, 240, 220);
  const tw = doc.getTextWidth(text) + 6;
  doc.roundedRect(x - tw / 2, y - 4, tw, 7, 1.5, 1.5, "F");
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.3);
  doc.roundedRect(x - tw / 2, y - 4, tw, 7, 1.5, 1.5, "S");
  doc.setFontSize(5.5);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.text(text, x, y, { align: "center" });
  // Arrow line
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.4);
  doc.line(x, y + 3, arrowToX, arrowToY);
}

// ─── Main PDF generator ───────────────────────────────────────

export function generateConnectionGuidePDF({ name, email, role, tempPassword }: GuideParams): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  const isEmployee = role === "shelter_employee";
  let y = 25;

  // ═══════════════ PAGE 1 ═══════════════

  // ── Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...DARK);
  doc.text("DogWork", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(13);
  doc.setTextColor(...BRAND);
  doc.text("Guide de connexion", pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(11);
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(name, pageW / 2, y, { align: "center" });
  y += 4;

  // Role badge
  const roleLabel = ROLE_LABELS[role] || role;
  const badgeW = doc.getTextWidth(roleLabel) + 12;
  doc.setFillColor(...BRAND);
  doc.roundedRect(pageW / 2 - badgeW / 2, y - 3, badgeW, 7, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(roleLabel, pageW / 2, y + 1.5, { align: "center" });
  y += 10;

  // Line
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Credentials box
  doc.setFillColor(...BRAND);
  doc.roundedRect(margin, y, contentW, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.setFont("helvetica", "bold");
  doc.text("Vos identifiants de connexion", pageW / 2, y + 5.5, { align: "center" });
  y += 8;

  doc.setFillColor(...LIGHT_BG);
  const credH = isEmployee ? 38 : 30;
  doc.roundedRect(margin, y, contentW, credH, 0, 0, "F");
  doc.setDrawColor(...BRAND);
  doc.roundedRect(margin, y - 8, contentW, credH + 8, 2, 2, "S");

  doc.setFontSize(11);
  doc.setTextColor(...DARK);
  doc.setFont("courier", "bold");
  doc.text(`Email :  ${email}`, pageW / 2, y + 10, { align: "center" });

  if (isEmployee) {
    doc.text(`Code PIN :  ${tempPassword}`, pageW / 2, y + 20, { align: "center" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Ce code PIN est défini par votre administrateur de refuge.", pageW / 2, y + 29, { align: "center" });
    doc.text("Contactez-le si vous souhaitez le modifier.", pageW / 2, y + 34, { align: "center" });
  } else {
    doc.text(`Mot de passe temporaire :  ${tempPassword}`, pageW / 2, y + 20, { align: "center" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("Ce mot de passe est temporaire. Vous devrez le changer lors de votre première connexion.", pageW / 2, y + 28, { align: "center" });
  }
  y += credH + 6;

  // ── Visual: Login screen mockup with annotations
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text("Aperçu de l'écran de connexion", margin, y);
  y += 6;

  const screenCx = pageW / 2;
  drawLoginScreen(doc, screenCx, y, isEmployee);

  // Annotations
  if (isEmployee) {
    drawAnnotation(doc, margin + 12, y + 30, "1. Votre email", screenCx - 18, y + 36);
    drawAnnotation(doc, pageW - margin - 12, y + 42, "2. Votre PIN", screenCx + 18, y + 48);
    drawAnnotation(doc, pageW - margin - 8, y + 58, "3. Cliquer ici", screenCx + 18, y + 60);
  } else {
    drawAnnotation(doc, margin + 12, y + 32, "1. Votre email", screenCx - 18, y + 38);
    drawAnnotation(doc, pageW - margin - 12, y + 44, "2. Votre mot de passe", screenCx + 18, y + 50);
    drawAnnotation(doc, pageW - margin - 8, y + 58, "3. Cliquer ici", screenCx + 18, y + 60);
  }

  y += 95;

  // ═══════════════ PAGE 2 ═══════════════
  doc.addPage();
  y = 25;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...DARK);
  doc.text("Étapes de connexion détaillées", margin, y);
  y += 10;

  // Steps differ by role
  const steps = isEmployee
    ? [
        {
          num: "1",
          title: "Accéder à DogWork",
          body: "Ouvrez votre navigateur et rendez-vous sur :\nhttps://dogwork.lovable.app",
        },
        {
          num: "2",
          title: "Ouvrir le mode Employé",
          body: "Sur la page de connexion, cliquez sur le lien\n« Accès Employé refuge » situé sous le bouton\nde connexion principal.",
        },
        {
          num: "3",
          title: "Saisir vos identifiants",
          body: `Le formulaire passe en mode "Accès Employé".\n\nEntrez votre email : ${email}\nEntrez votre code PIN à 6 chiffres : ${tempPassword}\n\nPuis cliquez sur « Connexion Employé ».`,
        },
        {
          num: "4",
          title: "Accéder à votre espace",
          body: `Vous êtes redirigé vers ${ROLE_DESTINATIONS[role]}`,
        },
      ]
    : [
        {
          num: "1",
          title: "Accéder à DogWork",
          body: "Ouvrez votre navigateur et rendez-vous sur :\nhttps://dogwork.lovable.app",
        },
        {
          num: "2",
          title: "Se connecter",
          body: "Sur la page d'accueil, cliquez sur le bouton\n« Connexion » en haut à droite.",
        },
        {
          num: "3",
          title: "Saisir vos identifiants",
          body: `Entrez votre adresse email : ${email}\nEntrez le mot de passe temporaire : ${tempPassword}\nPuis cliquez sur « Se connecter ».`,
        },
        {
          num: "4",
          title: "Changer votre mot de passe",
          body: "Vous serez automatiquement redirigé vers une page\nde changement de mot de passe.\nChoisissez un mot de passe personnel d'au moins\n8 caractères. Confirmez-le, puis validez.",
        },
        {
          num: "5",
          title: "Accéder à votre espace",
          body: `Une fois le mot de passe défini, vous accédez\ndirectement à ${ROLE_DESTINATIONS[role]}`,
        },
      ];

  for (const step of steps) {
    const lines = step.body.split("\n");
    const stepH = 12 + lines.length * 5;

    if (y + stepH > 270) {
      doc.addPage();
      y = 20;
    }

    // Number circle
    doc.setFillColor(...BRAND);
    doc.circle(margin + 5, y + 5, 4, "F");
    doc.setFontSize(10);
    doc.setTextColor(...WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(step.num, margin + 5, y + 7, { align: "center" });

    // Title
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text(step.title, margin + 13, y + 6.5);

    // Body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 80);
    lines.forEach((line, i) => {
      doc.text(line, margin + 13, y + 13 + i * 5);
    });

    // Separator line
    y += stepH + 4;
    if (step.num !== steps[steps.length - 1].num) {
      doc.setDrawColor(220, 220, 230);
      doc.setLineWidth(0.2);
      doc.line(margin + 5, y - 2, pageW - margin, y - 2);
    }
  }

  // ── Visual: Password change screen (only for non-employees)
  if (!isEmployee) {
    if (y + 85 > 270) {
      doc.addPage();
      y = 20;
    }
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.text("Aperçu — Changement de mot de passe (Étape 4)", margin, y);
    y += 6;

    drawPasswordChangeScreen(doc, pageW / 2, y);
    drawAnnotation(doc, margin + 14, y + 30, "Nouveau mot de passe", screenCx - 18, y + 36);
    drawAnnotation(doc, pageW - margin - 10, y + 42, "Confirmer", screenCx + 18, y + 48);
    drawAnnotation(doc, pageW - margin - 8, y + 56, "Valider", screenCx + 18, y + 58);
    y += 75;
  }

  // ═══════════════ LAST PAGE: Security + Footer ═══════════════
  if (y + 50 > 270) {
    doc.addPage();
    y = 20;
  }
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text("Sécurité", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const secItems = isEmployee
    ? [
        "• Ne partagez jamais votre code PIN.",
        "• En cas de problème, contactez l'administrateur de votre refuge.",
        "• En cas de problème persistant, contactez le support DogWork.",
      ]
    : [
        "• Ne partagez jamais votre mot de passe.",
        "• En cas d'oubli, utilisez « Mot de passe oublié » sur la page de connexion.",
        "• En cas de problème, contactez le support DogWork.",
      ];
  for (const item of secItems) {
    doc.text(item, margin, y);
    y += 6;
  }

  // Footer
  y += 8;
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("DogWork@Home by Teba — Support : teba.gaetan@gmail.com", pageW / 2, y, { align: "center" });

  return doc;
}
