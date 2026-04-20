/**
 * Generate a UUID v4
 */
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate sequential folio like CP-0001
 */
export function generateFolio(existingRecords = []) {
  const nums = existingRecords
    .map(r => {
      const match = r.folio && r.folio.match(/CP-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `CP-${String(next).padStart(4, '0')}`;
}

/**
 * Generate sequential damage/follow-up ticket like TK-0001
 */
export function generateDamageTicket(existingDamages = []) {
  const nums = existingDamages
    .map(d => {
      const match = d.ticket && d.ticket.match(/TK-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `TK-${String(next).padStart(4, '0')}`;
}

/**
 * Calculate time use between two HH:MM strings (same or next day)
 */
export function calcTimeUse(startTime, endTime) {
  if (!startTime || !endTime) return { hours: 0, minutes: 0, total_minutes: 0 };

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;

  // If end is before start, assume next day
  if (endTotal < startTotal) {
    endTotal += 24 * 60;
  }

  const diffMin = endTotal - startTotal;
  return {
    hours: Math.floor(diffMin / 60),
    minutes: diffMin % 60,
    total_minutes: diffMin
  };
}

/**
 * Check if a delivery is late (> MAX_USE_HOURS)
 */
export function calcDelay(horaRetiro, horaDevolucion, maxHours = 3) {
  const { total_minutes } = calcTimeUse(horaRetiro, horaDevolucion);
  const maxMinutes = maxHours * 60;
  const isLate = total_minutes > maxMinutes;
  const delayMinutes = isLate ? total_minutes - maxMinutes : 0;
  return {
    isLate,
    delayMinutes,
    delayHours: Math.floor(delayMinutes / 60),
    delayMins: delayMinutes % 60
  };
}

/**
 * Format a date or ISO string as DD/MM/YYYY HH:mm
 */
export function formatDateTime(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/**
 * Format date only as DD/MM/YYYY
 */
export function formatDate(date) {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  if (isNaN(d.getTime())) return date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Get current time as HH:MM
 */
export function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Format typed digits into HH:MM without relying on browser time input UI.
 */
export function formatTimeInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Validate 24-hour HH:MM time strings.
 */
export function isValidTime24(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

/**
 * Check if a license is expired (date string YYYY-MM-DD)
 */
export function isLicenseExpired(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr + 'T00:00:00');
  return exp < today;
}

/**
 * Check if a doc date is expired
 */
export function isDocExpired(dateStr) {
  return isLicenseExpired(dateStr);
}

/**
 * Calculate distance
 */
export function calcDistance(kmSalida, kmRetorno) {
  const s = parseFloat(kmSalida) || 0;
  const r = parseFloat(kmRetorno) || 0;
  return Math.max(0, r - s);
}

/**
 * Compress image via canvas to max 1200px wide, quality 0.7
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate a Chilean license plate (basic)
 */
export function isValidPPU(ppu) {
  if (!ppu) return false;
  return /^[A-Z]{2,4}[-\s]?\d{2,4}$/.test(ppu.toUpperCase().trim());
}

/**
 * Format time duration
 */
export function formatDuration(hours, minutes) {
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
