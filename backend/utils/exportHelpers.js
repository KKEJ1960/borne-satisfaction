import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const NOTE_LABELS = {
  0: "-",
  1: "Pas satisfaisant",
  2: "Satisfaisant",
  3: "Très satisfaisant",
  4: "Mention spéciale",
};

const NOTE_COLORS = {
  1: "B91C1C",
  2: "C2410C",
  3: "A16207",
  4: "15803D",
};

const DEPT_ORDER = ["Accueil", "Chambres", "Restaurants", "Loisirs", "Propreté", "Global"];
const SATISFACTION_DEPTS = DEPT_ORDER.filter((d) => d !== "Global");

function parseCommentaire(commentaire) {
  if (!commentaire) return { detail: "", reponses: [] };
  try {
    const parsed = JSON.parse(commentaire);
    if (parsed && typeof parsed === "object") {
      return {
        detail: parsed.detail || "",
        reponses: Array.isArray(parsed.reponses) ? parsed.reponses : [],
      };
    }
  } catch {
    /* texte brut */
  }
  return { detail: String(commentaire), reponses: [] };
}

function formatReponsesDetail(reponses) {
  if (!reponses?.length) return "";
  return reponses
    .map((r) => `${r.question || "?"} -> ${NOTE_LABELS[r.note] || r.note}`)
    .join(" | ");
}

function formatDateFr(d) {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleString("fr-FR");
}

function formatDateFile() {
  return new Date().toISOString().slice(0, 10);
}

function periodLabel(meta) {
  const parts = [];
  if (meta?.dateDebut) parts.push(`du ${meta.dateDebut}`);
  if (meta?.dateFin) parts.push(`au ${meta.dateFin}`);
  if (!parts.length) return "Toute période";
  return parts.join(" ");
}

export function computeStats(rows) {
  const notes = rows.filter((a) => a.note > 0);
  const clients = new Set(rows.map((a) => a.client_id).filter(Boolean));
  const comments = rows.filter((a) => {
    const { detail, reponses } = parseCommentaire(a.commentaire);
    return (detail || (!reponses.length ? a.commentaire : "") || "").trim();
  });
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const parDept = {};

  for (const a of notes) {
    if (!parDept[a.departement]) parDept[a.departement] = { total: 0, count: 0 };
    parDept[a.departement].total += a.note;
    parDept[a.departement].count += 1;
    if (distribution[a.note] != null) distribution[a.note] += 1;
  }

  const moyennes = {};
  for (const [dept, v] of Object.entries(parDept)) {
    moyennes[dept] = (v.total / v.count).toFixed(2);
  }

  const noteMoyenne = notes.length
    ? (notes.reduce((s, a) => s + a.note, 0) / notes.length).toFixed(2)
    : "0.00";

  const sortedDeptAverages = Object.entries(moyennes)
    .map(([dept, avg]) => ({
      dept,
      avg: Number(avg),
      count: parDept[dept]?.count || 0,
    }))
    .sort((a, b) => a.avg - b.avg);

  const bestDept = [...sortedDeptAverages].reverse()[0] || null;
  const weakDept = sortedDeptAverages[0] || null;
  const mentionSpeciale = notes.length ? Math.round((distribution[4] / notes.length) * 100) : 0;
  const insatisfaction = notes.length ? Math.round((distribution[1] / notes.length) * 100) : 0;

  return {
    notes,
    parDept,
    moyennes,
    noteMoyenne,
    total: rows.length,
    totalNotes: notes.length,
    clientsUniques: clients.size,
    commentaires: comments.length,
    distribution,
    sortedDeptAverages,
    bestDept,
    weakDept,
    mentionSpeciale,
    insatisfaction,
  };
}

export function generateCSV(rows) {
  const header =
    "Date;Client;Téléphone;Chambre;Catégorie;Note chiffrée;Appréciation;Détail des réponses;Commentaire\n";
  const lines = rows.map((a) => {
    const { detail, reponses } = parseCommentaire(a.commentaire);
    const client = `${a.prenom || ""} ${a.nom || ""}`.trim();
    const noteLabel = a.note > 0 ? NOTE_LABELS[a.note] || a.note : "Commentaire global";
    const cols = [
      formatDateFr(a.date),
      client,
      a.telephone || "",
      a.numero_chambre || "",
      a.departement || "",
      a.note > 0 ? `${a.note}/4` : "",
      noteLabel,
      formatReponsesDetail(reponses),
      detail || (reponses.length ? "" : a.commentaire || ""),
    ];
    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";");
  });
  return "\uFEFF" + header + lines.join("\n");
}

export async function generateExcel(rows, meta = {}) {
  const stats = computeStats(rows);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Borne Satisfaction - Hôtel Président";

  const recap = wb.addWorksheet("Rapport");
  recap.columns = [
    { header: "Indicateur", key: "k", width: 34 },
    { header: "Valeur", key: "v", width: 42 },
    { header: "Lecture", key: "read", width: 55 },
  ];

  recap.addRow({ k: "Hôtel Président - Yamoussoukro", v: "", read: "" });
  recap.addRow({ k: "Période", v: periodLabel(meta), read: "Filtres appliqués depuis le dashboard admin." });
  recap.addRow({ k: "Total avis", v: stats.total });
  recap.addRow({ k: "Évaluations notées", v: stats.totalNotes });
  recap.addRow({ k: "Clients uniques", v: stats.clientsUniques });
  recap.addRow({ k: "Commentaires", v: stats.commentaires });
  recap.addRow({
    k: "Note moyenne globale",
    v: `${stats.noteMoyenne} / 4`,
    read: "Plus la note est proche de 4, meilleure est la satisfaction.",
  });
  recap.addRow({ k: "Mentions spéciales", v: `${stats.mentionSpeciale}%` });
  recap.addRow({ k: "Insatisfaction", v: `${stats.insatisfaction}%` });
  if (stats.bestDept) {
    recap.addRow({
      k: "Point fort",
      v: `${stats.bestDept.dept} (${stats.bestDept.avg.toFixed(2)}/4)`,
    });
  }
  if (stats.weakDept) {
    recap.addRow({
      k: "Point à surveiller",
      v: `${stats.weakDept.dept} (${stats.weakDept.avg.toFixed(2)}/4)`,
    });
  }

  recap.addRow({ k: "", v: "" });
  recap.addRow({ k: "Moyenne par catégorie", v: "Nombre d'avis", read: "Barre de lecture" });
  for (const dept of DEPT_ORDER) {
    if (stats.moyennes[dept] != null) {
      const avg = Number(stats.moyennes[dept]);
      const filled = Math.round(avg * 5);
      recap.addRow({
        k: dept,
        v: `${stats.moyennes[dept]} / 4 (${stats.parDept[dept]?.count || 0})`,
        read: `${"█".repeat(filled)}${"░".repeat(Math.max(0, 20 - filled))}`,
      });
    }
  }

  recap.addRow({ k: "", v: "" });
  recap.addRow({ k: "Répartition des notes", v: "Nombre", read: "Part dans les évaluations notées" });
  for (const note of [4, 3, 2, 1]) {
    const count = stats.distribution[note] || 0;
    const pct = stats.totalNotes ? Math.round((count / stats.totalNotes) * 100) : 0;
    recap.addRow({ k: NOTE_LABELS[note], v: count, read: `${pct}%` });
  }

  recap.getRow(1).font = { bold: true, size: 14 };
  recap.getRow(1).height = 24;
  recap.eachRow((row, rowNumber) => {
    if (rowNumber === 1 || rowNumber === 13 || rowNumber === 20) {
      row.font = { bold: true };
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };
    }
    row.alignment = { vertical: "top", wrapText: true };
  });

  for (const dept of DEPT_ORDER) {
    const deptRows = rows.filter((r) => r.departement === dept);
    if (!deptRows.length) continue;
    const safeName = dept.slice(0, 31);
    const ws = wb.addWorksheet(safeName);
    ws.columns = [
      { header: "Date", key: "date", width: 18 },
      { header: "Client", key: "client", width: 22 },
      { header: "Téléphone", key: "tel", width: 14 },
      { header: "Chambre", key: "chambre", width: 10 },
      { header: "Note", key: "note", width: 20 },
      { header: "Question", key: "question", width: 46 },
      { header: "Réponse", key: "reponse", width: 22 },
      { header: "Commentaire", key: "commentaire", width: 36 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };

    for (const a of deptRows) {
      const { detail, reponses } = parseCommentaire(a.commentaire);
      const client = `${a.prenom || ""} ${a.nom || ""}`.trim();
      const noteLabel = a.note > 0 ? `${NOTE_LABELS[a.note]} (${a.note}/4)` : "Commentaire global";
      if (reponses.length) {
        for (const r of reponses) {
          ws.addRow({
            date: formatDateFr(a.date),
            client,
            tel: a.telephone || "",
            chambre: a.numero_chambre || "",
            note: noteLabel,
            question: r.question || "",
            reponse: NOTE_LABELS[r.note] || r.note,
            commentaire: detail,
          });
        }
      } else {
        ws.addRow({
          date: formatDateFr(a.date),
          client,
          tel: a.telephone || "",
          chambre: a.numero_chambre || "",
          note: noteLabel,
          question: "",
          reponse: "",
          commentaire: detail || a.commentaire || "",
        });
      }
    }
    ws.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, filename: `rapport_${formatDateFile()}.xlsx` };
}

function drawMetricCard(doc, x, y, w, h, title, value, subtitle = "") {
  doc.roundedRect(x, y, w, h, 8).fillAndStroke("#f8fafc", "#dbeafe");
  doc.fillColor("#64748b").fontSize(8).text(title, x + 10, y + 9, { width: w - 20 });
  doc.fillColor("#071b36").fontSize(18).text(String(value), x + 10, y + 23, { width: w - 20 });
  if (subtitle) doc.fillColor("#64748b").fontSize(7).text(subtitle, x + 10, y + 47, { width: w - 20 });
}

function drawBarChart(doc, stats, x, y, w) {
  doc.fillColor("#071b36").fontSize(14).text("Performance par catégorie", x, y);
  const chartY = y + 28;
  const labelW = 95;
  const barW = w - labelW - 55;
  const rowH = 24;
  const rows = SATISFACTION_DEPTS.filter((dept) => stats.moyennes[dept] != null);
  if (!rows.length) {
    doc.fillColor("#64748b").fontSize(9).text("Aucune évaluation notée sur cette période.", x, chartY);
    return chartY + 20;
  }
  rows.forEach((dept, i) => {
    const yy = chartY + i * rowH;
    const avg = Number(stats.moyennes[dept]);
    const filled = Math.max(2, (avg / 4) * barW);
    doc.fillColor("#334155").fontSize(9).text(dept, x, yy + 3, { width: labelW });
    doc.roundedRect(x + labelW, yy, barW, 14, 4).fill("#e2e8f0");
    doc.roundedRect(x + labelW, yy, filled, 14, 4).fill(avg < 2 ? "#B91C1C" : avg < 3 ? "#C2410C" : "#15803D");
    doc.fillColor("#071b36").fontSize(9).text(`${avg.toFixed(2)}/4`, x + labelW + barW + 8, yy + 2);
  });
  return chartY + rows.length * rowH + 6;
}

function drawPieSlice(doc, cx, cy, radius, start, end, color) {
  const steps = Math.max(8, Math.ceil((end - start) / 8));
  doc.moveTo(cx, cy);
  for (let i = 0; i <= steps; i += 1) {
    const angle = ((start + ((end - start) * i) / steps) - 90) * (Math.PI / 180);
    doc.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  doc.closePath().fill(color);
}

function drawDistributionChart(doc, stats, x, y, w) {
  doc.fillColor("#071b36").fontSize(14).text("Répartition des notes", x, y);
  const cx = x + 72;
  const cy = y + 85;
  const radius = 52;
  const total = stats.totalNotes || 0;
  if (!total) {
    doc.fillColor("#64748b").fontSize(9).text("Aucune note à afficher.", x, y + 28);
    return y + 55;
  }

  let start = 0;
  for (const note of [4, 3, 2, 1]) {
    const count = stats.distribution[note] || 0;
    if (!count) continue;
    const end = start + (count / total) * 360;
    drawPieSlice(doc, cx, cy, radius, start, end, `#${NOTE_COLORS[note]}`);
    start = end;
  }
  doc.circle(cx, cy, 25).fill("#ffffff");
  doc.fillColor("#071b36").fontSize(14).text(`${stats.noteMoyenne}`, cx - 17, cy - 9, {
    width: 34,
    align: "center",
  });
  doc.fillColor("#64748b").fontSize(7).text("/4", cx - 17, cy + 8, {
    width: 34,
    align: "center",
  });

  const legendX = x + 155;
  [4, 3, 2, 1].forEach((note, i) => {
    const yy = y + 34 + i * 22;
    const count = stats.distribution[note] || 0;
    const pct = total ? Math.round((count / total) * 100) : 0;
    doc.rect(legendX, yy, 10, 10).fill(`#${NOTE_COLORS[note]}`);
    doc.fillColor("#334155").fontSize(8).text(`${NOTE_LABELS[note]} : ${count} (${pct}%)`, legendX + 16, yy - 1, {
      width: w - 170,
    });
  });
  return y + 150;
}

function drawAttentionSection(doc, rows, x, y, w) {
  const lowRows = rows.filter((a) => a.note > 0 && a.note <= 2).slice(0, 5);
  doc.fillColor("#071b36").fontSize(14).text("Points d'attention", x, y);
  if (!lowRows.length) {
    doc.fillColor("#15803D").fontSize(9).text("Aucun avis noté 1 ou 2 dans cette sélection.", x, y + 24);
    return y + 45;
  }

  let yy = y + 24;
  lowRows.forEach((a) => {
    const { detail, reponses } = parseCommentaire(a.commentaire);
    const problem = reponses.find((r) => Number(r.note) <= 2);
    const text = problem?.question || detail || a.commentaire || "Avis à vérifier";
    doc.fillColor("#B91C1C").fontSize(8).text(`${a.departement} - ${NOTE_LABELS[a.note]} (${a.note}/4)`, x, yy);
    yy += 11;
    doc.fillColor("#334155").fontSize(8).text(text.slice(0, 150), x + 10, yy, { width: w - 10 });
    yy += 24;
  });
  return yy;
}

export async function generatePDF(rows, meta = {}) {
  const stats = computeStats(rows);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () =>
      resolve({
        buffer: Buffer.concat(chunks),
        filename: `rapport_${formatDateFile()}.pdf`,
      })
    );
    doc.on("error", reject);

    doc.fillColor("#071b36").fontSize(20).text("Hôtel Président", { align: "center" });
    doc.fontSize(12).fillColor("#334155").text("Yamoussoukro - Rapport de satisfaction", {
      align: "center",
    });
    doc.moveDown();
    doc.fontSize(10).text(`Période analysée : ${periodLabel(meta)}`, { align: "left" });
    doc.moveDown(0.7);

    const startY = doc.y;
    drawMetricCard(doc, 50, startY, 115, 66, "Total avis", stats.total, "lignes exportées");
    drawMetricCard(doc, 175, startY, 115, 66, "Moyenne", `${stats.noteMoyenne}/4`, "hors commentaires globaux");
    drawMetricCard(doc, 300, startY, 115, 66, "Clients", stats.clientsUniques, "clients uniques");
    drawMetricCard(doc, 425, startY, 115, 66, "Insatisfaction", `${stats.insatisfaction}%`, "notes 1/4");

    let y = startY + 92;
    y = drawBarChart(doc, stats, 50, y, 490);
    y += 12;
    y = drawDistributionChart(doc, stats, 50, y, 490);

    if (y > 650) {
      doc.addPage();
      y = 50;
    }

    doc.fillColor("#071b36").fontSize(14).text("Lecture rapide", 50, y);
    y += 22;
    const insights = [
      stats.bestDept ? `Point fort : ${stats.bestDept.dept} avec ${stats.bestDept.avg.toFixed(2)}/4.` : null,
      stats.weakDept ? `Priorité de suivi : ${stats.weakDept.dept} avec ${stats.weakDept.avg.toFixed(2)}/4.` : null,
      `${stats.mentionSpeciale}% des évaluations sont des mentions spéciales.`,
      `${stats.commentaires} avis contiennent un commentaire exploitable.`,
    ].filter(Boolean);
    insights.forEach((text) => {
      doc.circle(56, y + 5, 2).fill("#3B82F6");
      doc.fillColor("#334155").fontSize(9).text(text, 66, y, { width: 460 });
      y += 16;
    });

    y += 8;
    y = drawAttentionSection(doc, rows, 50, y, 490);

    if (y > 650) {
      doc.addPage();
      y = 50;
    } else {
      y += 12;
    }

    doc.fontSize(14).fillColor("#071b36").text("Commentaires positifs récents", 50, y);
    y += 20;
    const positifs = rows
      .filter((a) => a.note === 4)
      .map((a) => {
        const { detail } = parseCommentaire(a.commentaire);
        return {
          text: detail || `${a.prenom} ${a.nom} - ${a.departement}`,
        };
      })
      .filter((x) => x.text?.trim())
      .slice(0, 5);

    if (!positifs.length) {
      doc.fontSize(9).fillColor("#64748b").text("Aucun commentaire note 4 sur cette période.", 50, y);
    } else {
      positifs.forEach((p, i) => {
        doc
          .fontSize(9)
          .fillColor("#334155")
          .text(`${i + 1}. ${p.text.slice(0, 200)}${p.text.length > 200 ? "..." : ""}`, 50, y, {
            width: 490,
          });
        y += 26;
      });
    }

    doc.end();
  });
}

export function csvFilename() {
  return `avis_${formatDateFile()}.csv`;
}
