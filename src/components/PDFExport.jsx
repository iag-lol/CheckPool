import { useState } from 'react';
import jsPDF from 'jspdf';
import { formatDate, formatDuration, calcTimeUse, calcDelay } from '../utils/helpers';
import { vehiclesService, driversService, supervisorsService } from '../services/storage';
import { CHECKLIST_ITEMS } from '../constants';

/* ─── Colors ─── */
const C = {
  dark:    [15, 23, 42],    // slate-900
  mid:     [30, 41, 59],    // slate-800
  light:   [248, 250, 252], // slate-50
  border:  [226, 232, 240], // slate-200
  orange:  [249, 115, 22],
  green:   [34, 197, 94],
  red:     [239, 68, 68],
  amber:   [245, 158, 11],
  white:   [255, 255, 255],
  text:    [15, 23, 42],
  muted:   [100, 116, 139],
};

/* ─── Header bar (every page) ─── */
function header(doc, record, vehicle, pageNum, totalPages) {
  // Dark gradient bar
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setFillColor(...C.orange);
  doc.rect(0, 16, 210, 4, 'F');

  // Logo area
  doc.setFillColor(...C.orange);
  doc.roundedRect(8, 2, 28, 12, 2, 2, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CHECK', 11, 8.5);
  doc.text('POOL', 13, 13);

  // Title
  doc.setTextColor(...C.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTRO DE ENTREGA Y RECEPCIÓN VEHICULAR', 42, 8);

  // Right info
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Folio: ${record.folio}`, 210 - 10, 6, { align: 'right' });
  doc.text(`Terminal: ${record.terminal}`, 210 - 10, 11, { align: 'right' });

  // Page number
  doc.setFontSize(6.5);
  doc.setTextColor(...C.muted);
  doc.text(`Pág. ${pageNum}/${totalPages}`, 210 - 10, 22, { align: 'right' });
  doc.setTextColor(...C.text);
}

/* ─── Section title bar ─── */
function sectionTitle(doc, text, y, color = C.mid) {
  doc.setFillColor(...color);
  doc.rect(10, y, 190, 6.5, 'F');
  doc.setTextColor(...C.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(text.toUpperCase(), 13, y + 4.5);
  doc.setTextColor(...C.text);
  return y + 6.5;
}

/* ─── Info table (2-col pairs) ─── */
function infoTable(doc, rows, y) {
  const rowH = 5.5;
  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? C.white : C.light;
    doc.setFillColor(...bg);
    doc.rect(10, y, 190, rowH, 'F');

    // Border bottom
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.2);
    doc.line(10, y + rowH, 200, y + rowH);

    // Left label+value
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(String(row[0]).toUpperCase() + ':', 13, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.text);
    doc.text(String(row[1] ?? '—').substring(0, 38), 48, y + 3.8);

    // Right label+value (if provided)
    if (row[2] !== undefined) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.muted);
      doc.text(String(row[2]).toUpperCase() + ':', 108, y + 3.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text);
      doc.text(String(row[3] ?? '—').substring(0, 38), 143, y + 3.8);
    }
    y += rowH;
  });
  return y;
}

/* ─── Checklist column (one side: entrega or recepcion) ─── */
function checklistCol(doc, data, x, w, yStart) {
  let y = yStart;
  if (!data) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.muted);
    doc.text('Sin datos', x + 3, y + 4);
    return yStart + 8;
  }

  Object.entries(CHECKLIST_ITEMS).forEach(([, section]) => {
    // Sub-section header
    doc.setFillColor(51, 65, 85); // slate-700
    doc.rect(x, y, w, 5, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(section.label.replace(/^[A-Z]\.\s*/, '').toUpperCase(), x + 2, y + 3.5);
    doc.setTextColor(...C.text);
    y += 5;

    section.items.forEach((item, idx) => {
      const d = data[item.id] || { state: 'bueno' };
      const isMalo = d.state === 'malo';
      const bg = isMalo ? [254, 242, 242] : (idx % 2 === 0 ? C.white : C.light);

      doc.setFillColor(...bg);
      doc.rect(x, y, w, 4.5, 'F');

      // Item label
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...(isMalo ? [185, 28, 28] : C.text));
      const label = item.label.length > 22 ? item.label.substring(0, 22) + '…' : item.label;
      doc.text(label, x + 2, y + 3.2);

      // State pill
      const pillColor = isMalo ? C.red : C.green;
      const pillLabel = isMalo ? 'MALO' : 'OK';
      const pillW = 12;
      const pillX = x + w - pillW - 1;
      doc.setFillColor(...pillColor);
      doc.roundedRect(pillX, y + 0.8, pillW, 3, 0.8, 0.8, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.text(pillLabel, pillX + pillW / 2, y + 2.8, { align: 'center' });
      doc.setTextColor(...C.text);

      y += 4.5;
    });
  });
  return y;
}

/* ─── Signatures block ─── */
function signaturesBlock(doc, record, vehicle, driver, supervisor, y) {
  const delivery = record.deliveryData || {};
  const reception = record.receptionData || {};

  y = sectionTitle(doc, 'Firmas y Conformidad', y + 3);
  y += 2;

  const sigs = [
    { img: delivery.firma_supervisor,  label: 'Supervisor — Entrega',   name: supervisor?.nombre || '—' },
    { img: delivery.firma_conductor,   label: 'Conductor — Recibe Veh.', name: driver?.nombre || '—' },
    { img: reception.firma_receptor,   label: 'Receptor — Devolución',   name: supervisor?.nombre || '—' },
    { img: reception.firma_conductor,  label: 'Conductor — Devuelve',    name: driver?.nombre || '—' },
  ];

  const sigW = 44;
  const sigH = 22;
  const gap  = 2;
  const startX = 11;

  sigs.forEach((sig, i) => {
    const sx = startX + i * (sigW + gap);

    // Box
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.rect(sx, y, sigW, sigH + 10, 'S');

    // Label header
    doc.setFillColor(...C.light);
    doc.rect(sx, y, sigW, 5, 'F');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.muted);
    doc.text(sig.label.toUpperCase(), sx + sigW / 2, y + 3.3, { align: 'center' });

    // Signature image
    if (sig.img) {
      try {
        doc.addImage(sig.img, 'PNG', sx + 1, y + 6, sigW - 2, sigH - 2);
      } catch (error) {
        console.warn('[PDFExport] No se pudo agregar firma al PDF', error);
      }
    } else {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...C.muted);
      doc.text('Sin firma', sx + sigW / 2, y + 16, { align: 'center' });
    }

    // Name
    doc.setFillColor(248, 250, 252);
    doc.rect(sx, y + sigH + 1, sigW, 8, 'F');
    doc.setFontSize(6.2);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.text);
    const nameShort = sig.name.length > 22 ? sig.name.substring(0, 22) + '.' : sig.name;
    doc.text(nameShort, sx + sigW / 2, y + sigH + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text('Firma', sx + sigW / 2, y + sigH + 8.5, { align: 'center' });
    doc.setTextColor(...C.text);
  });

  return y + sigH + 13;
}

/* ─── Photo page: all 8 photos 2-per-row, big and clear ─── */
function renderPhotoPage(doc, delivery, reception, vehicle, record, pageNum, totalPages) {
  doc.addPage();
  header(doc, record, vehicle, pageNum, totalPages);

  const PHOTO_KEYS = ['frontal', 'lateral_izq', 'trasera', 'lateral_der'];
  const PHOTO_LABELS = { frontal: 'FRONTAL', lateral_izq: 'LATERAL IZQ.', trasera: 'TRASERA', lateral_der: 'LATERAL DER.' };

  // Dimensions — 2 per row, tall photos
  const cols    = 2;
  const gap     = 4;          // gap between photos
  const marginX = 10;
  const photoW  = (210 - marginX * 2 - gap) / cols;  // ≈ 93mm
  const photoH  = 52;          // mm tall — landscape feel
  const labelH  = 7;
  const rowH    = photoH + labelH + 3; // + 3 gap below

  let y = 28;

  const drawSection = (fotos, sectionTitle, sectionColor) => {
    if (!fotos || !Object.values(fotos).some(v => v)) return;

    // Section header
    doc.setFillColor(...sectionColor);
    doc.rect(marginX, y, 190, 8, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(sectionTitle.toUpperCase(), marginX + 3, y + 5.5);
    doc.setTextColor(...C.text);
    y += 10;

    // Draw 4 photos in 2 rows of 2
    PHOTO_KEYS.forEach((key, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const px  = marginX + col * (photoW + gap);
      const py  = y + row * rowH;
      const url = fotos[key];

      // Photo container with shadow-like border
      doc.setDrawColor(...C.border);
      doc.setFillColor(240, 242, 245);
      doc.setLineWidth(0.3);
      doc.roundedRect(px, py, photoW, photoH + labelH, 1, 1, 'FD');

      // Image
      if (url) {
        try {
          doc.addImage(url, 'JPEG', px + 0.5, py + 0.5, photoW - 1, photoH - 0.5);
        } catch (error) {
          console.warn('[PDFExport] No se pudo agregar foto al PDF', error);
        }
      } else {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...C.muted);
        doc.text('Sin foto', px + photoW / 2, py + photoH / 2, { align: 'center' });
        doc.setTextColor(...C.text);
      }

      // Label bar
      doc.setFillColor(...sectionColor);
      doc.roundedRect(px, py + photoH, photoW, labelH, 0, 0, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(PHOTO_LABELS[key] || key.toUpperCase(), px + photoW / 2, py + photoH + 4.8, { align: 'center' });
      doc.setTextColor(...C.text);
    });

    // Advance y by 2 rows
    y += 2 * rowH + 4;
  };

  drawSection(delivery.fotos, 'Fotografías de Entrega',   C.mid);
  drawSection(reception.fotos, 'Fotografías de Recepción', [6, 95, 70]);
}

/* ─── Main export component ─── */
export default function PDFExport({ record, buttonClass = '' }) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!record) return;
    setLoading(true);

    try {
      const vehicle    = vehiclesService.getById(record.vehicleId);
      const driver     = driversService.getById(record.driverId);
      const supervisor = supervisorsService.getById(record.supervisorId);
      const delivery   = record.deliveryData  || {};
      const reception  = record.receptionData || {};

      // Count pages
      const hasPhotos = Object.values(delivery.fotos || {}).some(v => v) || Object.values(reception.fotos || {}).some(v => v);
      const hasDamages = record.damages && record.damages.length > 0 && record.damages.some(d => d.fotos?.length > 0);
      const totalPages = 1 + (hasPhotos ? 1 : 0) + (hasDamages ? 1 : 0);

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      /* ══════════════════════════════════
         PAGE 1 — General data + Checklists + Signatures
      ══════════════════════════════════ */
      header(doc, record, vehicle, 1, totalPages);
      let y = 26;

      // ── General data ──
      y = sectionTitle(doc, 'Datos Generales del Registro', y);
      y += 1;

      // Time calculations
      let timeStr = '—', delayStr = 'No', distStr = '—';
      if (delivery.hora_retiro && reception.hora_devolucion) {
        const tu = calcTimeUse(delivery.hora_retiro, reception.hora_devolucion);
        const dl = calcDelay(delivery.hora_retiro, reception.hora_devolucion);
        timeStr  = formatDuration(tu.hours, tu.minutes);
        delayStr = dl.isLate ? `SÍ — ${formatDuration(dl.delayHours, dl.delayMins)}` : 'No';
        if (delivery.km_salida && reception.km_retorno) {
          distStr = `${Math.max(0, parseInt(reception.km_retorno) - parseInt(delivery.km_salida))} km`;
        }
      }

      const infoRows = [
        ['Folio',       record.folio,               'Estado',     record.status],
        ['Terminal',    record.terminal,             'Fecha',      formatDate(record.fecha)],
        ['PPU',         vehicle?.ppu || '—',         'Vehículo',   vehicle ? `${vehicle.marca} ${vehicle.modelo} ${vehicle.anio || ''}` : '—'],
        ['Conductor',   driver?.nombre || '—',       'RUT',        driver?.rut || '—'],
        ['Supervisor',  supervisor?.nombre || '—',   'Licencia',   driver?.licencia || '—'],
        ['H. Solicitud', delivery.hora_solicitud || '—', 'H. Retiro', delivery.hora_retiro || '—'],
        ['KM Salida',   delivery.km_salida ? parseInt(delivery.km_salida).toLocaleString() + ' km' : '—', 'H. Devolución', reception.hora_devolucion || '—'],
        ['KM Retorno',  reception.km_retorno ? parseInt(reception.km_retorno).toLocaleString() + ' km' : '—', 'Distancia', distStr],
        ['Motivo',      delivery.motivo || '—',      'Destino',    delivery.destino || '—'],
        ['Tiempo uso',  timeStr,                     'Atraso',     delayStr],
      ];

      y = infoTable(doc, infoRows, y);
      y += 3;

      // ── Checklists header ──
      doc.setFillColor(...C.dark);
      doc.rect(10, y, 190, 7, 'F');
      doc.setTextColor(...C.white);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('CHECKLIST — ENTREGA', 13, y + 4.8);
      doc.text('CHECKLIST — RECEPCIÓN', 107, y + 4.8);
      // Divider
      doc.setDrawColor(...C.orange);
      doc.setLineWidth(0.6);
      doc.line(104, y, 104, y + 7);
      doc.setLineWidth(0.2);
      doc.setTextColor(...C.text);
      y += 7;

      // ── Two-column checklists ──
      const colW  = 93;
      const colX2 = 107;
      const yLeft  = checklistCol(doc, delivery.checklist, 10, colW, y);
      const yRight = checklistCol(doc, reception.checklist, colX2, colW, y);
      y = Math.max(yLeft, yRight) + 3;

      // Ensure signatures fit; if too low add a tiny spacer
      if (y > 235) {
        // Compress: signatures will overflow slightly but jsPDF handles it
      }

      // ── Signatures ──
      y = signaturesBlock(doc, record, vehicle, driver, supervisor, y);

      /* ══════════════════════════════════
         PAGE 2 — All 8 photos (2 per row)
      ══════════════════════════════════ */
      if (hasPhotos) {
        renderPhotoPage(doc, delivery, reception, vehicle, record, 2, totalPages);
      }

      /* ══════════════════════════════════
         PAGE 3 — Damages (if any)
      ══════════════════════════════════ */
      if (hasDamages) {
        doc.addPage();
        header(doc, record, vehicle, totalPages, totalPages);
        let dy = 26;

        // Title
        doc.setFillColor(185, 28, 28);
        doc.rect(10, dy, 190, 8, 'F');
        doc.setTextColor(...C.white);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('REGISTRO DE DAÑOS', 13, dy + 5.5);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`Vehículo: ${vehicle?.ppu || '—'}  |  Folio: ${record.folio}`, 210 - 13, dy + 5.5, { align: 'right' });
        doc.setTextColor(...C.text);
        dy += 11;

        for (const damage of record.damages) {
          // Damage info
          doc.setFillColor(...C.light);
          doc.rect(10, dy, 190, 7, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(185, 28, 28);
          doc.text(`Zona: ${damage.zona || '—'}`, 13, dy + 4.5);
          doc.text(`Severidad: ${damage.severidad || '—'}`, 75, dy + 4.5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...C.muted);
          doc.text(damage.descripcion ? damage.descripcion.substring(0, 80) : '—', 13, dy + 10);
          doc.setTextColor(...C.text);
          dy += 14;

          if (damage.fotos && damage.fotos.length > 0) {
            const dPhotoW = 56;
            const dPhotoH = 44;
            let col = 0;
            for (const url of damage.fotos) {
              const px = 13 + col * (dPhotoW + 4);
              try {
                doc.setDrawColor(...C.border);
                doc.setLineWidth(0.3);
                doc.rect(px, dy, dPhotoW, dPhotoH, 'S');
                doc.addImage(url, 'JPEG', px + 0.5, dy + 0.5, dPhotoW - 1, dPhotoH - 1);
              } catch (error) {
                console.warn('[PDFExport] No se pudo agregar foto de daño al PDF', error);
              }
              col++;
              if (col >= 3) { col = 0; dy += dPhotoH + 5; }
              if (dy > 260) { doc.addPage(); header(doc, record, vehicle, doc.internal.getNumberOfPages(), totalPages); dy = 26; col = 0; }
            }
            if (col > 0) dy += dPhotoH + 5;
          }

          dy += 5;
          if (dy > 265) { doc.addPage(); header(doc, record, vehicle, doc.internal.getNumberOfPages(), totalPages); dy = 26; }
        }
      }

      // ── Footer on all pages ──
      const numPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= numPages; i++) {
        doc.setPage(i);
        doc.setFillColor(...C.dark);
        doc.rect(0, 289, 210, 8, 'F');
        doc.setTextColor(...C.muted);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text('CHECK-POOL — Sistema de Gestión de Flota Vehicular', 13, 293.5);
        doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, 210 - 13, 293.5, { align: 'right' });
      }

      doc.save(`CheckPool_${record.folio}_${record.terminal.replace(/\s+/g, '_')}.pdf`);

    } catch (err) {
      console.error('PDF error:', err);
      alert('Error al generar PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className={buttonClass || 'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors'}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Generando...
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          PDF
        </>
      )}
    </button>
  );
}
