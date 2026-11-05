// Funciones compartidas por login, paneles, perfil y Recetas.
// La sesión se guarda en el navegador: "token" y "usuario".
// Con "Recordar sesión" va en localStorage; sin marcarlo, en sessionStorage (se borra al cerrar la pestaña).

const API = '/api';

const ICONOS = {
  inicio: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="10" r="2.6"/><path d="M7.5 17.5c.9-2.2 2.6-3.2 4.5-3.2s3.6 1 4.5 3.2"/></svg>',
  pacientes: '<svg viewBox="0 0 24 24"><circle cx="8.5" cy="9" r="3"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M3 19c.6-3 2.8-4.6 5.5-4.6S13.4 16 14 19"/><path d="M15 15.2c2.6-.3 4.7.9 5.4 3.8"/></svg>',
  consultas: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="4"/><path d="M3.5 10h17"/><circle cx="8" cy="14.5" r=".9" fill="currentColor"/></svg>',
  recetas: '<svg viewBox="0 0 24 24"><rect x="4.5" y="3.5" width="15" height="17" rx="3.5"/><path d="M8.5 9h7M8.5 12.5h7M8.5 16h4"/></svg>',
  historial: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  perfil: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c.8-4 3.8-6 7.5-6s6.7 2 7.5 6"/></svg>',
  salir: '<svg viewBox="0 0 24 24"><path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10"/><path d="M14 8l4 4-4 4M18 12H9.5"/></svg>',
  cruz: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  buscar: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
  campana: '<svg viewBox="0 0 24 24"><path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21h4"/></svg>',
};

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function leer(k) { return localStorage.getItem(k) || sessionStorage.getItem(k); }
function sesion() {
  try { return { token: leer('token'), usuario: JSON.parse(leer('usuario') || 'null') }; }
  catch (e) { return { token: null, usuario: null }; }
}
function guardarSesion(token, usuario, recordar) {
  const almacen = recordar ? localStorage : sessionStorage;
  almacen.setItem('token', token);
  almacen.setItem('usuario', JSON.stringify(usuario));
}
function cerrarSesion() {
  ['token', 'usuario'].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
  location.href = '/login.html';
}
// Llama a la API mandando el token. Si el token ya no sirve, regresa al login.
async function pedir(ruta, opciones = {}) {
  const { token } = sesion();
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opciones.headers || {}) },
  });
  const datos = await r.json().catch(() => ({}));
  if (r.status === 401 || r.status === 403) { cerrarSesion(); throw new Error('Sesión expirada'); }
  if (!r.ok) throw new Error(datos.mensaje || datos.error || 'Ocurrió un error, intenta de nuevo');
  return datos;
}
// Protege la página: sin sesión (o con otro rol) manda al login.
function exigirRol(rol) {
  const { token, usuario } = sesion();
  if (!token || !usuario || usuario.rol !== rol) { location.href = '/login.html'; return null; }
  return usuario;
}
function iniciales(n) { return String(n || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase(); }

// Dibuja el menú lateral según el rol. "activo" = qué enlace resaltar.
function dibujarSidebar(usuario, activo) {
  const admin = usuario.rol === 'ADMINISTRADOR';
  const enlaces = admin
    ? [['inicio','Inicio','/admin.html'],['pacientes','Pacientes','/pacientes/pacientes.html'],['consultas','Consultas','/consultas/consultas.html'],['recetas','Recetas','/recetas/recetas.html'],['historial','Historial','/historial/historial.html']]
    : [['inicio','Inicio','/paciente.html'],['consultas','Mis consultas','/paciente.html#consultas'],['recetas','Mis recetas','/paciente.html#recetas'],['historial','Mi historial','/paciente.html#historial']];
  const item = ([k, t, h]) => `<a href="${h}" class="${k === activo ? 'activo' : ''}">${ICONOS[k]}<span>${t}</span></a>`;
  document.getElementById('sidebar').innerHTML = `
    <div class="logo"><span class="logo-cruz">${ICONOS.cruz}</span><span class="marca">Consultorio "Diaz"</span></div>
    <p class="etiqueta">${admin ? 'PANEL ADMINISTRADOR' : 'PANEL PACIENTE'}</p>
    <nav>${enlaces.map(item).join('')}</nav>
    <div class="separador"></div>
    <p class="etiqueta">CUENTA</p>
    <nav>
      <a href="/perfil.html" class="${activo === 'perfil' ? 'activo' : ''}">${ICONOS.perfil}<span>Mi perfil</span></a>
      <a href="#" id="cerrar-sesion">${ICONOS.salir}<span>Cerrar sesión</span></a>
    </nav>
    <div class="usuario"><span class="avatar-usuario">${esc(iniciales(usuario.nombre))}</span>
      <div><strong>${esc(usuario.nombre)}</strong><small>${admin ? 'Administrador' : 'Paciente'}</small></div></div>`;
  document.getElementById('cerrar-sesion').addEventListener('click', e => { e.preventDefault(); cerrarSesion(); });
}
function hora(f) { const d = new Date(f); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function fechaCorta(f) { return new Date(f).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' }).replace(/\./g, ''); }
function fechaLarga() { const t = new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); return t.charAt(0).toUpperCase() + t.slice(1); }
function badge(est) { const e = String(est || '').toLowerCase(); return `<span class="badge b-${e}">${esc(e.charAt(0).toUpperCase() + e.slice(1))}</span>`; }
function primerNombre(n) { return String(n || '').replace(/^(Dra?\.|Sra?\.)\s*/i, '').split(' ')[0]; }
function cabeceraHtml(titulo, sub, conBuscador, u) {
  return `<div><h1>${esc(titulo)}</h1><p class="sub">${esc(sub)}</p></div>
    <div class="herramientas">
      ${conBuscador ? `<label class="buscar">${ICONOS.buscar}<input id="buscar-paciente" type="search" placeholder="Buscar paciente..."></label>` : ''}
      <span class="campana">${ICONOS.campana}</span><span class="avatar-top">${esc(iniciales(u.nombre))}</span>
    </div>`;
}
