import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

const NOTE_LABELS = {
  0: "-",
  1: "Pas satisfaisant",
  2: "Satisfaisant",
  3: "Très satisfaisant",
  4: "Mention spéciale",
};
const NOTE_EMOJIS = { 1: "😞", 2: "😐", 3: "😄", 4: "🤩" };
const NOTE_COLORS_HEX = { 1: "B91C1C", 2: "C2410C", 3: "A16207", 4: "15803D" };
const NOTE_COLORS_ARGB = { 1: "FFB91C1C", 2: "FFC2410C", 3: "FFA16207", 4: "FF15803D" };

const DEPT_ORDER = [
  "Accueil", "Chambres", "Le Bandama Petit Déjeuner", "Le Panoramique",
  "L'Alocodrome", "Loisirs et Divertissements", "Cadre Général", "Tourisme Affaires", "Global",
];
const SATISFACTION_DEPTS = DEPT_ORDER.filter((d) => d !== "Global");

const TYPE_LABELS = { loisirs: "Loisirs / Personnel", affaires: "Affaires / Professionnel" };

// ── Parsers ─────────────────────────────────────────────────────────────────

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
  } catch { /* texte brut */ }
  return { detail: String(commentaire), reponses: [] };
}

function formatReponsesDetail(reponses) {
  if (!reponses?.length) return "";
  return reponses
    .map((r) => `${r.question || "?"} → ${NOTE_LABELS[r.note] || r.note}`)
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
  if (meta?.dateFin)   parts.push(`au ${meta.dateFin}`);
  if (!parts.length) return "Toute période";
  return parts.join(" ");
}

function clientFullName(a) {
  return `${a.prenom || ""} ${a.nom || ""}`.trim();
}

// ── Stats ────────────────────────────────────────────────────────────────────

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
    .map(([dept, avg]) => ({ dept, avg: Number(avg), count: parDept[dept]?.count || 0 }))
    .sort((a, b) => a.avg - b.avg);

  const bestDept = [...sortedDeptAverages].reverse()[0] || null;
  const weakDept = sortedDeptAverages[0] || null;
  const mentionSpeciale = notes.length ? Math.round((distribution[4] / notes.length) * 100) : 0;
  const insatisfaction  = notes.length ? Math.round((distribution[1] / notes.length) * 100) : 0;

  // ── Analyse critique par département ──────────────────────────────────────
  const critiqueParDept = {};
  for (const dept of SATISFACTION_DEPTS) {
    const deptRows     = rows.filter((r) => r.departement === dept && r.note > 0);
    const critiquesRows = deptRows.filter((r) => r.note <= 2);

    // Questions les plus problématiques
    const questionsMap = {};
    for (const a of critiquesRows) {
      const { reponses } = parseCommentaire(a.commentaire);
      const lowRep = reponses.filter((r) => r.note != null && Number(r.note) <= 2);
      const targets = lowRep.length ? lowRep : [{ question: "Note globale faible", note: a.note }];
      for (const r of targets) {
        const q = r.question || "Critique générale";
        if (!questionsMap[q]) questionsMap[q] = { count: 0, notes: [] };
        questionsMap[q].count++;
        questionsMap[q].notes.push(Number(r.note));
      }
    }

    critiqueParDept[dept] = {
      total: deptRows.length,
      critiques: critiquesRows.length,
      pctCritique: deptRows.length
        ? Math.round((critiquesRows.length / deptRows.length) * 100)
        : 0,
      questionsProblematiques: Object.entries(questionsMap)
        .map(([q, v]) => ({
          question: q,
          count: v.count,
          avgNote: (v.notes.reduce((s, n) => s + n, 0) / v.notes.length).toFixed(1),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      clientsCritiques: critiquesRows.map((a) => {
        const { detail } = parseCommentaire(a.commentaire);
        return {
          nom: clientFullName(a),
          email: a.email || "",
          telephone: a.telephone || "",
          note: a.note,
          date: a.date,
          commentaire: detail || "",
        };
      }),
    };
  }

  // ── Liste clients uniques ─────────────────────────────────────────────────
  const clientsMap = {};
  for (const a of rows) {
    const key = a.client_id;
    if (!clientsMap[key]) {
      clientsMap[key] = {
        id: a.client_id,
        nom: a.nom || "",
        prenom: a.prenom || "",
        email: a.email || "",
        telephone: a.telephone || "",
        numero_chambre: a.numero_chambre || "",
        type_sejour: a.type_sejour || "loisirs",
        firstDate: a.date,
        notes: [],
        categories: [],
      };
    }
    if (a.note > 0) clientsMap[key].notes.push(a.note);
    if (a.departement && a.departement !== "Global")
      clientsMap[key].categories.push(a.departement);
  }

  const clientsList = Object.values(clientsMap)
    .map((c) => ({
      ...c,
      noteMoyenne: c.notes.length
        ? (c.notes.reduce((s, n) => s + n, 0) / c.notes.length).toFixed(2)
        : null,
    }))
    .sort((a, b) => new Date(b.firstDate) - new Date(a.firstDate));

  return {
    notes, parDept, moyennes, noteMoyenne,
    total: rows.length, totalNotes: notes.length,
    clientsUniques: clients.size, commentaires: comments.length,
    distribution, sortedDeptAverages, bestDept, weakDept,
    mentionSpeciale, insatisfaction,
    critiqueParDept, clientsList,
  };
}

// ── CSV ──────────────────────────────────────────────────────────────────────

export function generateCSV(rows, meta = {}) {
  const hotelLine = meta.hotelNom ? `Hôtel;${meta.hotelNom}\n` : "";
  const header =
    "Date;Client;Email;Téléphone;Chambre;Type de séjour;Catégorie;Note chiffrée;Appréciation;Détail des réponses;Points à améliorer\n";
  const lines = rows.map((a) => {
    const { detail, reponses } = parseCommentaire(a.commentaire);
    const noteLabel  = a.note > 0 ? NOTE_LABELS[a.note] || a.note : "Commentaire global";
    const typeLabel  = TYPE_LABELS[a.type_sejour] || a.type_sejour || "Loisirs";
    const ameliorer  = reponses
      .filter((r) => r.note != null && Number(r.note) <= 2)
      .map((r) => `${r.question}: ${NOTE_LABELS[r.note] || r.note}`)
      .join(" | ") || detail || "";
    const cols = [
      formatDateFr(a.date),
      clientFullName(a),
      a.email || "",
      a.telephone || "",
      a.numero_chambre || "",
      typeLabel,
      a.departement || "",
      a.note > 0 ? `${a.note}/4` : "",
      noteLabel,
      formatReponsesDetail(reponses),
      ameliorer,
    ];
    return cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";");
  });
  return "﻿" + hotelLine + header + lines.join("\n");
}

// ── Excel ────────────────────────────────────────────────────────────────────

function excelHeader(ws, color = "FFEAF2FF") {
  ws.getRow(1).font = { bold: true, color: { argb: "FF071b36" } };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  ws.getRow(1).height = 20;
}

function addSectionTitle(ws, text, colspan = 1) {
  const row = ws.addRow([text]);
  ws.mergeCells(row.number, 1, row.number, colspan);
  row.font = { bold: true, size: 11, color: { argb: "FF071b36" } };
  row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };
  row.height = 18;
  return row;
}

export async function generateExcel(rows, meta = {}) {
  const stats = computeStats(rows);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Borne Satisfaction - Hôtel Président";

  // ══════════════════════════════════════════════════════
  // Feuille 1 — Rapport de synthèse
  // ══════════════════════════════════════════════════════
  const recap = wb.addWorksheet("Rapport");
  recap.columns = [
    { header: "Indicateur",   key: "k",    width: 36 },
    { header: "Valeur",       key: "v",    width: 28 },
    { header: "Lecture / commentaire", key: "read", width: 56 },
  ];
  excelHeader(recap);

  const hotelNom = meta.hotelNom || "Hôtel";
  recap.addRow({ k: `${hotelNom} — Rapport de satisfaction`, v: "", read: "" });
  recap.getRow(2).font = { bold: true, size: 14, color: { argb: "FF071b36" } };
  recap.getRow(2).height = 26;

  recap.addRow({ k: "Période analysée", v: periodLabel(meta), read: "" });
  recap.addRow({ k: "Généré le", v: new Date().toLocaleString("fr-FR"), read: "" });
  recap.addRow({});

  addSectionTitle(recap, "▌ INDICATEURS CLÉS", 3);
  recap.addRow({ k: "Total avis exportés",    v: stats.total,           read: "Toutes catégories confondues" });
  recap.addRow({ k: "Évaluations notées",      v: stats.totalNotes,      read: "Hors commentaires globaux (note 0)" });
  recap.addRow({ k: "Clients uniques",         v: stats.clientsUniques,  read: "" });
  recap.addRow({ k: "Avis avec commentaire",   v: stats.commentaires,    read: "" });
  recap.addRow({ k: "Note moyenne globale",    v: `${stats.noteMoyenne} / 4`, read: "Plus la note est proche de 4, meilleure est la satisfaction" });
  recap.addRow({ k: "Mentions spéciales (4/4)", v: `${stats.mentionSpeciale}%`, read: "Part des évaluations les plus positives" });
  recap.addRow({ k: "Taux d'insatisfaction",  v: `${stats.insatisfaction}%`,   read: "Part des notes à 1/4 — nécessitent attention immédiate" });
  if (stats.bestDept) recap.addRow({ k: "🏆 Point fort",      v: `${stats.bestDept.dept}`, read: `Moyenne : ${stats.bestDept.avg.toFixed(2)}/4` });
  if (stats.weakDept) recap.addRow({ k: "⚠️  Point à améliorer", v: `${stats.weakDept.dept}`, read: `Moyenne : ${stats.weakDept.avg.toFixed(2)}/4` });
  recap.addRow({});

  addSectionTitle(recap, "▌ PERFORMANCE PAR CATÉGORIE", 3);
  const perfHeaderRow = recap.addRow({ k: "Catégorie", v: "Note moy. / Nb avis", read: "Critiques (note ≤ 2) / % d'insatisfaction" });
  perfHeaderRow.font = { bold: true, italic: true };
  for (const dept of DEPT_ORDER) {
    if (!stats.moyennes[dept]) continue;
    const avg      = Number(stats.moyennes[dept]);
    const count    = stats.parDept[dept]?.count || 0;
    const crit     = stats.critiqueParDept[dept];
    const critInfo = crit
      ? `${crit.critiques} critique(s) — ${crit.pctCritique}% d'insatisfaction`
      : "—";
    const row = recap.addRow({ k: dept, v: `${avg.toFixed(2)}/4 (${count} avis)`, read: critInfo });
    const noteKey = avg >= 3.5 ? 4 : avg >= 2.5 ? 3 : avg >= 1.5 ? 2 : 1;
    row.getCell("k").font = { bold: true };
    row.getCell("v").font = { color: { argb: NOTE_COLORS_ARGB[noteKey] || "FF000000" }, bold: true };
    if (crit?.pctCritique >= 30) {
      row.getCell("read").font = { color: { argb: "FFB91C1C" }, bold: true };
    }
  }
  recap.addRow({});

  addSectionTitle(recap, "▌ RÉPARTITION DES NOTES", 3);
  recap.addRow({ k: "Note", v: "Nombre", read: "Part (%)" });
  for (const note of [4, 3, 2, 1]) {
    const count = stats.distribution[note] || 0;
    const pct   = stats.totalNotes ? Math.round((count / stats.totalNotes) * 100) : 0;
    const row   = recap.addRow({ k: `${NOTE_EMOJIS[note]} ${NOTE_LABELS[note]}`, v: count, read: `${pct}%` });
    row.getCell("v").font = { color: { argb: NOTE_COLORS_ARGB[note] } };
  }

  recap.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  // ══════════════════════════════════════════════════════
  // Feuille 2 — Analyse critique
  // ══════════════════════════════════════════════════════
  const critique = wb.addWorksheet("Analyse Critique");
  critique.columns = [
    { header: "Catégorie",             key: "cat",    width: 30 },
    { header: "Nb avis",               key: "total",  width: 10 },
    { header: "Nb critiques (≤ 2/4)", key: "crit",   width: 18 },
    { header: "% insatisfaction",      key: "pct",    width: 18 },
    { header: "Note moy. catégorie",   key: "avg",    width: 20 },
    { header: "Question la + critiquée",  key: "q1",  width: 52 },
    { header: "Nb fois signalée",      key: "q1c",   width: 16 },
    { header: "Note moy. sur cette question", key: "q1n", width: 28 },
    { header: "Clients insatisfaits (nom · email)", key: "clients", width: 50 },
  ];
  excelHeader(critique, "FFFFF0F0");

  critique.addRow([
    "Hôtel Président — Points à améliorer par catégorie", "", "", "", "", "", "", "", ""
  ]);
  critique.getRow(2).font = { bold: true, size: 13 };
  critique.getRow(2).height = 22;
  critique.addRow({});

  for (const dept of SATISFACTION_DEPTS) {
    const crit = stats.critiqueParDept[dept];
    if (!crit || crit.total === 0) continue;
    const avg   = stats.moyennes[dept] ? Number(stats.moyennes[dept]) : null;
    const topQ  = crit.questionsProblematiques[0];
    const clientStr = crit.clientsCritiques
      .slice(0, 6)
      .map((c) => `${c.nom}${c.email ? ` (${c.email})` : ""}`)
      .join(", ");
    const row = critique.addRow({
      cat:     dept,
      total:   crit.total,
      crit:    crit.critiques,
      pct:     `${crit.pctCritique}%`,
      avg:     avg != null ? `${avg.toFixed(2)}/4` : "—",
      q1:      topQ?.question || "—",
      q1c:     topQ?.count ?? "—",
      q1n:     topQ?.avgNote ? `${topQ.avgNote}/4` : "—",
      clients: clientStr || "—",
    });
    if (crit.pctCritique >= 30) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF0F0" } };
      });
      row.getCell("pct").font = { color: { argb: "FFB91C1C" }, bold: true };
    } else if (crit.pctCritique >= 10) {
      row.getCell("pct").font = { color: { argb: "FFC2410C" }, bold: true };
    }
    row.getCell("cat").font = { bold: true };
    row.alignment = { vertical: "top", wrapText: true };
    row.height = Math.max(20, Math.ceil(clientStr.length / 50) * 16 + 4);
  }

  critique.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  // ══════════════════════════════════════════════════════
  // Feuille 3 — Liste des clients
  // ══════════════════════════════════════════════════════
  const clientSheet = wb.addWorksheet("Clients");
  clientSheet.columns = [
    { header: "Date (dernier avis)", key: "date",     width: 20 },
    { header: "Prénom",              key: "prenom",   width: 16 },
    { header: "Nom",                 key: "nom",      width: 16 },
    { header: "Email",               key: "email",    width: 28 },
    { header: "Téléphone",           key: "tel",      width: 16 },
    { header: "Chambre",             key: "chambre",  width: 10 },
    { header: "Type de séjour",      key: "type",     width: 24 },
    { header: "Note moy. client",    key: "avg",      width: 16 },
    { header: "Catégories évaluées", key: "cats",     width: 50 },
  ];
  excelHeader(clientSheet, "FFE0F2FE");

  clientSheet.addRow([`${hotelNom} — Liste complète des clients`]);
  clientSheet.getRow(2).font = { bold: true, size: 13 };
  clientSheet.getRow(2).height = 22;
  clientSheet.addRow({});

  for (const c of stats.clientsList) {
    const avg     = c.noteMoyenne ? Number(c.noteMoyenne) : null;
    const noteKey = avg ? (avg >= 3.5 ? 4 : avg >= 2.5 ? 3 : avg >= 1.5 ? 2 : 1) : null;
    const row = clientSheet.addRow({
      date:    formatDateFr(c.firstDate),
      prenom:  c.prenom,
      nom:     c.nom,
      email:   c.email,
      tel:     c.telephone,
      chambre: c.numero_chambre,
      type:    TYPE_LABELS[c.type_sejour] || c.type_sejour,
      avg:     avg ? `${avg.toFixed(2)}/4` : "—",
      cats:    [...new Set(c.categories)].join(", "),
    });
    if (noteKey) {
      row.getCell("avg").font = { color: { argb: NOTE_COLORS_ARGB[noteKey] }, bold: true };
    }
    if (c.type_sejour === "affaires") {
      row.getCell("type").font = { color: { argb: "FF071b36" }, bold: true };
    }
    row.alignment = { vertical: "top", wrapText: true };
  }

  clientSheet.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });

  // ══════════════════════════════════════════════════════
  // Feuilles par catégorie (détail des avis)
  // ══════════════════════════════════════════════════════
  for (const dept of DEPT_ORDER) {
    const deptRows = rows.filter((r) => r.departement === dept);
    if (!deptRows.length) continue;
    const ws = wb.addWorksheet(dept.slice(0, 31));
    ws.columns = [
      { header: "Date",          key: "date",    width: 18 },
      { header: "Prénom",        key: "prenom",  width: 14 },
      { header: "Nom",           key: "nom",     width: 14 },
      { header: "Email",         key: "email",   width: 28 },
      { header: "Téléphone",     key: "tel",     width: 14 },
      { header: "Chambre",       key: "chambre", width: 10 },
      { header: "Type séjour",   key: "type",    width: 22 },
      { header: "Note globale",  key: "note",    width: 22 },
      { header: "Question",      key: "question",width: 48 },
      { header: "Réponse",       key: "reponse", width: 22 },
      { header: "À améliorer",   key: "amelio",  width: 38 },
      { header: "Commentaire",   key: "comment", width: 38 },
    ];
    excelHeader(ws, "FFEAF2FF");

    for (const a of deptRows) {
      const { detail, reponses } = parseCommentaire(a.commentaire);
      const noteLabel = a.note > 0 ? `${NOTE_LABELS[a.note]} (${a.note}/4)` : "Commentaire global";
      const typeLabel = TYPE_LABELS[a.type_sejour] || a.type_sejour || "";
      const amelio    = reponses
        .filter((r) => r.note != null && Number(r.note) <= 2)
        .map((r) => `${r.question}: ${NOTE_LABELS[r.note] || r.note}`)
        .join(" | ");

      if (reponses.length) {
        for (const r of reponses) {
          const row = ws.addRow({
            date:     formatDateFr(a.date),
            prenom:   a.prenom || "",
            nom:      a.nom || "",
            email:    a.email || "",
            tel:      a.telephone || "",
            chambre:  a.numero_chambre || "",
            type:     typeLabel,
            note:     noteLabel,
            question: r.question || "",
            reponse:  NOTE_LABELS[r.note] || r.note || "",
            amelio:   amelio,
            comment:  detail,
          });
          if (r.note != null && Number(r.note) <= 2) {
            row.getCell("reponse").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF0F0" } };
            row.getCell("reponse").font = { color: { argb: NOTE_COLORS_ARGB[r.note] || "FFB91C1C" }, bold: true };
          } else if (r.note === 4) {
            row.getCell("reponse").font = { color: { argb: "FF15803D" }, bold: true };
          }
        }
      } else {
        ws.addRow({
          date:    formatDateFr(a.date),
          prenom:  a.prenom || "",
          nom:     a.nom || "",
          email:   a.email || "",
          tel:     a.telephone || "",
          chambre: a.numero_chambre || "",
          type:    typeLabel,
          note:    noteLabel,
          question: "",
          reponse:  "",
          amelio:   "",
          comment:  detail || a.commentaire || "",
        });
      }
    }

    ws.eachRow((row) => { row.alignment = { vertical: "top", wrapText: true }; });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer, filename: `rapport_${formatDateFile()}.xlsx` };
}

// ── PDF ──────────────────────────────────────────────────────────────────────

const PDF_NAVY  = "#071b36";
const PDF_GOLD  = "#c9a84c";
const PDF_SLATE = "#334155";
const PDF_MUTED = "#64748b";
const PDF_RED   = "#B91C1C";
const PDF_GREEN = "#15803D";
const PDF_BG    = "#f8fafc";

function drawMetricCard(doc, x, y, w, h, title, value, subtitle = "", valueColor = PDF_NAVY) {
  doc.roundedRect(x, y, w, h, 8).fillAndStroke("#f8fafc", "#dbeafe");
  doc.fillColor(PDF_MUTED).fontSize(8).text(title, x + 10, y + 9, { width: w - 20 });
  doc.fillColor(valueColor).fontSize(17).text(String(value), x + 10, y + 22, { width: w - 20 });
  if (subtitle) doc.fillColor(PDF_MUTED).fontSize(7).text(subtitle, x + 10, y + 46, { width: w - 20 });
}

function drawBarChart(doc, stats, x, y, w) {
  doc.fillColor(PDF_NAVY).fontSize(13).text("Performance par catégorie", x, y);
  const chartY = y + 26;
  const labelW = 105;
  const barW   = w - labelW - 55;
  const rowH   = 22;
  const depts  = SATISFACTION_DEPTS.filter((d) => stats.moyennes[d] != null);
  if (!depts.length) {
    doc.fillColor(PDF_MUTED).fontSize(9).text("Aucune évaluation notée.", x, chartY);
    return chartY + 20;
  }
  depts.forEach((dept, i) => {
    const yy     = chartY + i * rowH;
    const avg    = Number(stats.moyennes[dept]);
    const filled = Math.max(2, (avg / 4) * barW);
    const color  = avg < 2 ? PDF_RED : avg < 3 ? "#C2410C" : avg < 3.5 ? "#A16207" : PDF_GREEN;
    const crit   = stats.critiqueParDept[dept];

    doc.fillColor(PDF_SLATE).fontSize(8).text(dept, x, yy + 3, { width: labelW, ellipsis: true });
    doc.roundedRect(x + labelW, yy + 1, barW, 12, 3).fill("#e2e8f0");
    doc.roundedRect(x + labelW, yy + 1, filled, 12, 3).fill(color);
    doc.fillColor(PDF_NAVY).fontSize(8).text(`${avg.toFixed(2)}/4`, x + labelW + barW + 6, yy + 2);

    if (crit?.critiques > 0) {
      doc.fillColor(PDF_RED).fontSize(7).text(
        `⚠ ${crit.critiques} critique(s)`,
        x + labelW + barW + 6, yy + 12,
        { width: 55 }
      );
    }
  });
  return chartY + depts.length * rowH + 10;
}

function drawDistributionChart(doc, stats, x, y, w) {
  doc.fillColor(PDF_NAVY).fontSize(13).text("Répartition des notes", x, y);
  const cx     = x + 70;
  const cy     = y + 82;
  const radius = 50;
  const total  = stats.totalNotes || 0;
  if (!total) {
    doc.fillColor(PDF_MUTED).fontSize(9).text("Aucune note à afficher.", x, y + 26);
    return y + 55;
  }

  function pieSlice(startAngle, endAngle, color) {
    const steps = Math.max(8, Math.ceil((endAngle - startAngle) / 8));
    doc.moveTo(cx, cy);
    for (let i = 0; i <= steps; i++) {
      const angle = ((startAngle + ((endAngle - startAngle) * i) / steps) - 90) * (Math.PI / 180);
      doc.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    doc.closePath().fill(color);
  }

  let start = 0;
  for (const note of [4, 3, 2, 1]) {
    const count = stats.distribution[note] || 0;
    if (!count) continue;
    const end = start + (count / total) * 360;
    pieSlice(start, end, `#${NOTE_COLORS_HEX[note]}`);
    start = end;
  }
  doc.circle(cx, cy, 24).fill("#ffffff");
  doc.fillColor(PDF_NAVY).fontSize(13).text(`${stats.noteMoyenne}`, cx - 16, cy - 10, { width: 32, align: "center" });
  doc.fillColor(PDF_MUTED).fontSize(7).text("/4", cx - 16, cy + 7, { width: 32, align: "center" });

  const legendX = x + 152;
  [4, 3, 2, 1].forEach((note, i) => {
    const yy    = y + 32 + i * 22;
    const count = stats.distribution[note] || 0;
    const pct   = total ? Math.round((count / total) * 100) : 0;
    doc.rect(legendX, yy, 10, 10).fill(`#${NOTE_COLORS_HEX[note]}`);
    doc.fillColor(PDF_SLATE).fontSize(8).text(
      `${NOTE_EMOJIS[note]} ${NOTE_LABELS[note]} — ${count} (${pct}%)`,
      legendX + 14, yy,
      { width: w - 165 }
    );
  });
  return y + 148;
}

function drawCritiqueSection(doc, stats, x, y, w, pageH) {
  doc.fillColor(PDF_NAVY).fontSize(13).text("Points à améliorer — Analyse par catégorie", x, y);
  y += 24;

  const depts = SATISFACTION_DEPTS.filter((d) => {
    const c = stats.critiqueParDept[d];
    return c && c.critiques > 0;
  });

  if (!depts.length) {
    doc.fillColor(PDF_GREEN).fontSize(9).text("Aucune évaluation négative sur cette période. Excellent !", x, y);
    return y + 30;
  }

  for (const dept of depts) {
    const crit = stats.critiqueParDept[dept];
    const avg  = stats.moyennes[dept] ? Number(stats.moyennes[dept]) : null;
    const color = avg < 2 ? PDF_RED : avg < 3 ? "#C2410C" : "#A16207";

    if (y > pageH - 100) {
      doc.addPage();
      y = 50;
    }

    // Titre catégorie
    doc.roundedRect(x, y, w, 20, 4).fill(PDF_BG);
    doc.fillColor(color).fontSize(10).text(
      `${dept}  —  ${crit.critiques} critique(s) sur ${crit.total} avis (${crit.pctCritique}%)`,
      x + 8, y + 4, { width: w - 50 }
    );
    if (avg != null) {
      doc.fillColor(color).fontSize(10).text(`Moy. ${avg.toFixed(2)}/4`, x + w - 65, y + 4, { width: 60, align: "right" });
    }
    y += 24;

    // Questions problématiques
    if (crit.questionsProblematiques.length) {
      doc.fillColor(PDF_MUTED).fontSize(8).text("Questions les plus signalées :", x + 6, y);
      y += 13;
      for (const q of crit.questionsProblematiques.slice(0, 3)) {
        doc.circle(x + 12, y + 4, 2).fill(PDF_RED);
        doc.fillColor(PDF_SLATE).fontSize(8).text(
          `${q.question.slice(0, 90)} — signalée ${q.count}×, note moy. ${q.avgNote}/4`,
          x + 18, y, { width: w - 22 }
        );
        y += 14;
      }
    }

    // Clients insatisfaits
    if (crit.clientsCritiques.length) {
      doc.fillColor(PDF_MUTED).fontSize(8).text("Clients ayant signalé un problème :", x + 6, y);
      y += 13;
      for (const c of crit.clientsCritiques.slice(0, 4)) {
        const meta = [
          c.email ? c.email : null,
          c.telephone ? c.telephone : null,
          `Note : ${c.note}/4`,
          c.commentaire ? `"${c.commentaire.slice(0, 60)}${c.commentaire.length > 60 ? "…" : ""}"` : null,
        ].filter(Boolean).join(" · ");
        doc.fillColor(PDF_RED).fontSize(8).text(`• ${c.nom}`, x + 12, y, { continued: true });
        doc.fillColor(PDF_SLATE).fontSize(8).text(`  ${meta}`, { width: w - 20 });
        y += 13;
      }
    }
    y += 10;
  }
  return y;
}

export async function generatePDF(rows, meta = {}) {
  const stats = computeStats(rows);
  const PAGE_W = 595 - 100;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), filename: `rapport_${formatDateFile()}.pdf` }));
    doc.on("error", reject);

    // ── Page 1 : En-tête + KPIs ───────────────────────────────────────────
    const hotelNom = meta.hotelNom || "Hôtel";
    doc.fillColor(PDF_NAVY).fontSize(22).text(hotelNom, { align: "center" });
    doc.fillColor(PDF_GOLD).fontSize(11).text("Rapport de satisfaction client", { align: "center" });
    doc.moveDown(0.3);
    doc.fillColor(PDF_MUTED).fontSize(9)
      .text(`Période : ${periodLabel(meta)}   ·   Généré le ${new Date().toLocaleString("fr-FR")}`, { align: "center" });
    doc.moveDown(0.8);

    const kpiY = doc.y;
    const kpiW = 115;
    drawMetricCard(doc, 50,  kpiY, kpiW, 62, "Total avis",    stats.total,           "exportés",            PDF_NAVY);
    drawMetricCard(doc, 175, kpiY, kpiW, 62, "Note moyenne",  `${stats.noteMoyenne}/4`, "hors commentaires",  stats.noteMoyenne >= 3 ? PDF_GREEN : PDF_RED);
    drawMetricCard(doc, 300, kpiY, kpiW, 62, "Clients",       stats.clientsUniques,  "uniques",             PDF_NAVY);
    drawMetricCard(doc, 425, kpiY, kpiW, 62, "Insatisfaction",`${stats.insatisfaction}%`, "notes 1/4", stats.insatisfaction > 20 ? PDF_RED : "#A16207");

    let y = kpiY + 84;

    // ── Graphique barres ───────────────────────────────────────────────────
    y = drawBarChart(doc, stats, 50, y, PAGE_W);
    y += 14;

    if (y > 580) { doc.addPage(); y = 50; }

    // ── Graphique camembert ────────────────────────────────────────────────
    y = drawDistributionChart(doc, stats, 50, y, PAGE_W);
    y += 14;

    // ── Lecture rapide ─────────────────────────────────────────────────────
    if (y > 580) { doc.addPage(); y = 50; }
    doc.fillColor(PDF_NAVY).fontSize(13).text("Lecture rapide", 50, y);
    y += 20;
    const insights = [
      stats.bestDept ? `Point fort : ${stats.bestDept.dept} — note moyenne ${stats.bestDept.avg.toFixed(2)}/4.` : null,
      stats.weakDept ? `Priorité de suivi : ${stats.weakDept.dept} — note moyenne ${stats.weakDept.avg.toFixed(2)}/4.` : null,
      `${stats.mentionSpeciale}% des évaluations sont des "Mentions spéciales" (4/4).`,
      `${stats.commentaires} avis contiennent un commentaire exploitable.`,
      `${stats.clientsUniques} clients uniques ont soumis un avis sur la période.`,
    ].filter(Boolean);
    insights.forEach((text) => {
      doc.circle(56, y + 4, 2).fill(PDF_GOLD);
      doc.fillColor(PDF_SLATE).fontSize(9).text(text, 64, y, { width: PAGE_W - 14 });
      y += 15;
    });
    y += 10;

    // ── Page 2+ : Points à améliorer par catégorie ────────────────────────
    if (y > 560) { doc.addPage(); y = 50; }
    else y += 4;

    y = drawCritiqueSection(doc, stats, 50, y, PAGE_W, 750);
    y += 14;

    // ── Commentaires positifs récents ─────────────────────────────────────
    if (y > 640) { doc.addPage(); y = 50; }
    doc.fillColor(PDF_NAVY).fontSize(13).text("Commentaires positifs récents", 50, y);
    y += 18;

    const positifs = rows
      .filter((a) => a.note === 4)
      .map((a) => {
        const { detail } = parseCommentaire(a.commentaire);
        return {
          text:    detail || "",
          client:  clientFullName(a),
          email:   a.email || "",
          dept:    a.departement,
        };
      })
      .filter((x) => x.text.trim())
      .slice(0, 6);

    if (!positifs.length) {
      doc.fillColor(PDF_MUTED).fontSize(9).text("Aucun commentaire note 4 avec texte sur cette période.", 50, y);
    } else {
      positifs.forEach((p, i) => {
        if (y > 720) { doc.addPage(); y = 50; }
        doc.fillColor(PDF_GREEN).fontSize(9).text(`${i + 1}. `, 50, y, { continued: true });
        doc.fillColor(PDF_SLATE).fontSize(9).text(
          `${p.text.slice(0, 180)}${p.text.length > 180 ? "…" : ""}`,
          { width: PAGE_W - 20 }
        );
        y += 12;
        const clientMeta = [p.client, p.email, p.dept].filter(Boolean).join(" · ");
        doc.fillColor(PDF_MUTED).fontSize(8).text(`    — ${clientMeta}`, 50, y, { width: PAGE_W });
        y += 18;
      });
    }

    doc.end();
  });
}

// ── Utilitaires export ───────────────────────────────────────────────────────

export function csvFilename() {
  return `avis_${formatDateFile()}.csv`;
}
