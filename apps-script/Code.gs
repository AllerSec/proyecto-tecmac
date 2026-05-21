/**
 * TECMAC - Backend del formulario de contacto.
 *
 * Pega este código en el editor de Google Apps Script
 * (script.google.com -> tu proyecto actual) reemplazando el
 * doPost existente. Después: Deploy -> Manage deployments ->
 * editar el deployment activo -> "New version" -> Deploy.
 *
 * Defensas:
 *  1. Honeypot: si el campo "website" llega con valor -> spam.
 *  2. Tiempo: si el form se envió en <3s -> spam.
 *  3. Patrones: detecta código JS, HTML, exceso de URLs, repeticiones.
 *  4. Nombres aleatorios: ratio anómalo de mayúsculas/minúsculas.
 *  5. Rate limit: máx 5 envíos / hora por IP (best-effort vía CacheService).
 *
 * Cuando algo se marca como spam, NO se envía email — se descarta
 * silenciosamente y se devuelve {success:true} para no dar pistas al bot.
 */

var DEST_EMAIL = 'allerunax@gmail.com';
var MIN_FILL_SECONDS = 3;
var MAX_PER_HOUR = 5;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (isSpam(data)) {
      logSpam(data, 'filtered');
      return ok();
    }

    var ip = (e.parameter && e.parameter.userIP) || 'unknown';
    if (rateLimited(ip)) {
      logSpam(data, 'rate-limited');
      return ok();
    }

    var nombre    = sanitize(data.nombre);
    var apellidos = sanitize(data.apellidos);
    var email     = sanitize(data.email);
    var telefono  = sanitize(data.telefono);
    var mensaje   = sanitize(data.mensaje);

    MailApp.sendEmail({
      to: DEST_EMAIL,
      subject: 'Nuevo mensaje - TECMAC',
      htmlBody:
        '<h2>Nuevo mensaje desde la web</h2>' +
        '<p><b>Nombre:</b> ' + nombre + ' ' + apellidos + '</p>' +
        '<p><b>Email:</b> ' + email + '</p>' +
        '<p><b>Teléfono:</b> ' + (telefono || 'No indicado') + '</p>' +
        '<p><b>Mensaje:</b><br>' + (mensaje || 'Sin mensaje').replace(/\n/g, '<br>') + '</p>'
    });

    return ok();
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function isSpam(d) {
  if (!d) return true;

  // 1. Honeypot
  if (d.website && String(d.website).trim() !== '') return true;

  // 2. Tiempo mínimo
  if (typeof d.elapsed === 'number' && d.elapsed < MIN_FILL_SECONDS) return true;

  // 3. Campos requeridos
  if (!d.nombre || !d.email || !d.mensaje) return true;

  // 4. Email mínimamente válido
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email))) return true;

  var blob = [d.nombre, d.apellidos, d.mensaje].join(' ');

  // 5. Código / inyección
  if (/<script|function\s*\(|MailApp\.|ContentService|doPost|\.createTextOutput|onclick=|<iframe|eval\(|document\./i.test(blob)) return true;

  // 6. Exceso de URLs (spam SEO típico)
  var urls = blob.match(/https?:\/\//gi) || [];
  if (urls.length >= 2) return true;

  // 7. Caracteres repetidos en exceso
  if (/(.)\1{6,}/.test(blob)) return true;

  // 8. Nombres aleatorios (mayúsculas/minúsculas mezcladas)
  var name = String(d.nombre || '') + String(d.apellidos || '');
  if (name.length > 8 && /^[A-Za-z]+$/.test(name)) {
    var transitions = 0;
    for (var i = 1; i < name.length; i++) {
      var prevUpper = name[i - 1] === name[i - 1].toUpperCase();
      var currUpper = name[i] === name[i].toUpperCase();
      if (prevUpper !== currUpper) transitions++;
    }
    if (transitions / name.length > 0.45) return true;
  }

  // 9. Listas negras de palabras típicas de spam comercial
  var lower = blob.toLowerCase();
  var blacklist = [
    'seo services', 'rank higher', 'first page of google',
    'targeted visitors', 'less than 24 hours', 'launch campaigns',
    'crypto', 'bitcoin', 'forex', 'casino', 'viagra',
    'increase traffic', 'guaranteed ranking', 'backlinks'
  ];
  for (var j = 0; j < blacklist.length; j++) {
    if (lower.indexOf(blacklist[j]) !== -1) return true;
  }

  return false;
}

function rateLimited(ip) {
  if (ip === 'unknown') return false;
  var cache = CacheService.getScriptCache();
  var key = 'rl_' + ip;
  var count = parseInt(cache.get(key) || '0', 10);
  if (count >= MAX_PER_HOUR) return true;
  cache.put(key, String(count + 1), 3600);
  return false;
}

function sanitize(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .slice(0, 5000);
}

function logSpam(d, reason) {
  try {
    console.log('[SPAM ' + reason + ']', JSON.stringify({
      nombre: d && d.nombre,
      email: d && d.email,
      website: d && d.website,
      elapsed: d && d.elapsed,
      mensaje: (d && d.mensaje || '').slice(0, 200)
    }));
  } catch (e) {}
}
