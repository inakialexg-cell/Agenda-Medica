// recetas.js — Frontend del módulo Recetas (Persona 4)
// Funciona SOLO con datos de prueba mientras el backend no exista.
// Cuando el backend esté listo, cambia USAR_MOCK a false.

const CONFIG = {
  USAR_MOCK: true,                       // true = datos de prueba | false = backend real
  API_URL: 'http://localhost:3000/api',  // dirección del backend
};

// Doctores de prueba (cuando exista el endpoint de doctores, se reemplaza)
const DOCTORES = [
  { id: 1, nombre: 'Dr. Díaz', detalle: 'Dr. Díaz — Medicina general' },
  { id: 2, nombre: 'Dra. Ramírez', detalle: 'Dra. Ramírez' },
];

// ---------------------------------------------------------------
// CAPA DE DATOS (aquí está todo lo que habla con el backend)
// Las recetas deben llegar con estas columnas:
//   id, paciente_id, paciente_nombre, doctor_nombre, medicamento,
//   dosis_indicaciones, emitida_el, estatus ('VIGENTE' | 'FINALIZADA')
// ---------------------------------------------------------------
const MOCK_PACIENTES = [
  { id: 1, nombre: 'María López' },
  { id: 2, nombre: 'Carlos Ruiz' },
  { id: 3, nombre: 'Ana Torres' },
  { id: 4, nombre: 'Jorge Medina' },
  { id: 5, nombre: 'Lucía Hernández' },
];

const MOCK_RECETAS_INICIALES = [
  { id: 1, paciente_id: 1, paciente_nombre: 'María López', doctor_nombre: 'Dr. Díaz', medicamento: 'Amoxicilina 500mg', dosis_indicaciones: '1 cada 8 horas por 7 días', emitida_el: '2026-10-28', estatus: 'VIGENTE' },
  { id: 2, paciente_id: 2, paciente_nombre: 'Carlos Ruiz', doctor_nombre: 'Dr. Díaz', medicamento: 'Losartán 50mg', dosis_indicaciones: '1 cada 24 horas', emitida_el: '2026-10-10', estatus: 'VIGENTE' },
  { id: 3, paciente_id: 3, paciente_nombre: 'Ana Torres', doctor_nombre: 'Dra. Ramírez', medicamento: 'Paracetamol 500mg', dosis_indicaciones: '1 cada 8 horas por 3 días', emitida_el: '2026-10-03', estatus: 'FINALIZADA' },
  { id: 4, paciente_id: 4, paciente_nombre: 'Jorge Medina', doctor_nombre: 'Dr. Díaz', medicamento: 'Omeprazol 20mg', dosis_indicaciones: '1 cada 24 horas por 14 días', emitida_el: '2026-09-15', estatus: 'FINALIZADA' },
];

// Guarda los datos de prueba en el navegador para que no se pierdan al recargar
function leerMock() {
  try {
    const guardado = localStorage.getItem('recetas_mock');
    if (guardado) return JSON.parse(guardado);
  } catch (e) { /* si falla, usamos los iniciales */ }
  return [...MOCK_RECETAS_INICIALES];
}
function guardarMock(lista) {
  try { localStorage.setItem('recetas_mock', JSON.stringify(lista)); } catch (e) { /* sin guardar */ }
}

// Petición al backend real, con el token del login
async function pedir(ruta, opciones = {}) {
  const token = localStorage.getItem('token');
  const respuesta = await fetch(CONFIG.API_URL + ruta, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.mensaje || datos.error || 'Ocurrió un error, intenta de nuevo');
  return datos;
}

const api = {
  // GET /api/recetas?q=texto
  async listarRecetas(q) {
    if (CONFIG.USAR_MOCK) {
      const t = q.toLowerCase();
      return leerMock().filter(r => !t || r.paciente_nombre.toLowerCase().includes(t) || r.medicamento.toLowerCase().includes(t));
    }
    return pedir('/recetas?q=' + encodeURIComponent(q));
  },

  // GET /api/pacientes  (esta ruta ya existe en el backend del equipo)
  async listarPacientes() {
    if (CONFIG.USAR_MOCK) return MOCK_PACIENTES;
    return pedir('/pacientes');
  },

  // POST /api/recetas
  // Envía: paciente_id, doctor_id, medicamento, dosis_indicaciones, notas_paciente
  async crearReceta(datos) {
    if (CONFIG.USAR_MOCK) {
      const lista = leerMock();
      const paciente = MOCK_PACIENTES.find(p => p.id === datos.paciente_id);
      const doctor = DOCTORES.find(d => d.id === datos.doctor_id);
      const nueva = {
        id: Math.max(0, ...lista.map(r => r.id)) + 1,
        paciente_id: datos.paciente_id,
        paciente_nombre: paciente ? paciente.nombre : 'Paciente',
        doctor_nombre: doctor ? doctor.nombre : 'Doctor',
        medicamento: datos.medicamento,
        dosis_indicaciones: datos.dosis_indicaciones,
        emitida_el: new Date().toISOString().slice(0, 10),
        estatus: 'VIGENTE',
      };
      lista.unshift(nueva);
      guardarMock(lista);
      return nueva;
    }
    return pedir('/recetas', { method: 'POST', body: JSON.stringify(datos) });
  },

  // PUT /api/recetas/:id/estatus   body: { estatus: 'VIGENTE' | 'FINALIZADA' }
  async cambiarEstatus(id, estatus) {
    if (CONFIG.USAR_MOCK) {
      const lista = leerMock();
      const receta = lista.find(r => r.id === id);
      if (receta) receta.estatus = estatus;
      guardarMock(lista);
      return receta;
    }
    return pedir('/recetas/' + id + '/estatus', { method: 'PUT', body: JSON.stringify({ estatus }) });
  },
};

// ---------------------------------------------------------------
// PANTALLA
// ---------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const COLORES = [['#E6F1FB', '#185FA5'], ['#FAEEDA', '#854F0B'], ['#FBEAF0', '#993556'], ['#EEEDFE', '#534AB7']];
let pacientes = [];

// Evita que un texto raro se interprete como HTML
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function iniciales(nombre) {
  return nombre.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}
function colorDe(nombre) {
  let h = 0;
  for (const c of nombre) h += c.charCodeAt(0);
  return COLORES[h % COLORES.length];
}
function fechaCorta(valor) {
  if (!valor) return '';
  // Si viene "2026-10-28" lo armamos a mano para evitar desfase de zona horaria
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  const fecha = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(valor);
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
}
function esVigente(r) { return String(r.estatus).toUpperCase() === 'VIGENTE'; }

function mostrarMensaje(texto) {
  const caja = $('mensaje');
  caja.textContent = texto;
  caja.classList.remove('oculto');
  setTimeout(() => caja.classList.add('oculto'), 3500);
}

async function cargarRecetas() {
  const q = $('buscador').value.trim();
  try {
    const recetas = await api.listarRecetas(q);
    $('subtitulo').textContent = recetas.length + (recetas.length === 1 ? ' receta ' : ' recetas ') + (q ? 'encontradas' : 'emitidas');

    if (recetas.length === 0) {
      $('tabla-recetas').innerHTML = '<tr><td colspan="4" class="vacio">No hay recetas para mostrar</td></tr>';
      return;
    }
    $('tabla-recetas').innerHTML = recetas.map(r => {
      const [fondo, letra] = colorDe(r.paciente_nombre);
      const vigente = esVigente(r);
      return `
        <tr>
          <td>
            <div class="persona">
              <div class="avatar" style="background:${fondo};color:${letra}">${esc(iniciales(r.paciente_nombre))}</div>
              <div><strong>${esc(r.paciente_nombre)}</strong><div class="linea2">${esc(r.doctor_nombre)}</div></div>
            </div>
          </td>
          <td><strong>${esc(r.medicamento)}</strong><div class="linea2">${esc(r.dosis_indicaciones)}</div></td>
          <td>${esc(fechaCorta(r.emitida_el))}</td>
          <td>
            <button class="badge ${vigente ? 'vigente' : 'finalizada'}" data-id="${r.id}" data-vigente="${vigente}" title="Clic para cambiar el estatus">
              ${vigente ? 'Vigente' : 'Finalizada'}
            </button>
          </td>
        </tr>`;
    }).join('');
  } catch (error) {
    $('tabla-recetas').innerHTML = '<tr><td colspan="4" class="vacio">No se pudieron cargar las recetas</td></tr>';
    mostrarMensaje(error.message);
  }
}

// Cambiar vigente <-> finalizada al hacer clic en el badge
$('tabla-recetas').addEventListener('click', async (e) => {
  const boton = e.target.closest('.badge');
  if (!boton) return;
  const nuevo = boton.dataset.vigente === 'true' ? 'FINALIZADA' : 'VIGENTE';
  try {
    await api.cambiarEstatus(Number(boton.dataset.id), nuevo);
    cargarRecetas();
  } catch (error) {
    mostrarMensaje('No se pudo cambiar el estatus, intenta de nuevo');
  }
});

// Buscador (espera un momento para no buscar con cada tecla)
let temporizador;
$('buscador').addEventListener('input', () => {
  clearTimeout(temporizador);
  temporizador = setTimeout(cargarRecetas, 250);
});

// ---------- Panel "Nueva receta" ----------
function abrirPanel() { $('panel').classList.add('abierto'); }
function cerrarPanel() {
  $('panel').classList.remove('abierto');
  $('form-receta').reset();
  $('error-form').classList.add('oculto');
}
$('btn-nueva').addEventListener('click', abrirPanel);
$('btn-cerrar').addEventListener('click', cerrarPanel);
$('btn-cancelar').addEventListener('click', cerrarPanel);

$('form-receta').addEventListener('submit', async (e) => {
  e.preventDefault();
  const error = $('error-form');
  error.classList.add('oculto');

  const nombre = $('paciente').value.trim();
  const paciente = pacientes.find(p => p.nombre === nombre);
  const medicamento = $('medicamento').value.trim();
  const dosis = $('dosis').value.trim();

  if (!paciente) { error.textContent = 'Elige un paciente de la lista'; error.classList.remove('oculto'); return; }
  if (!medicamento || !dosis) { error.textContent = 'Escribe el medicamento y la dosis'; error.classList.remove('oculto'); return; }

  try {
    await api.crearReceta({
      paciente_id: paciente.id,
      doctor_id: Number($('doctor').value),
      medicamento,
      dosis_indicaciones: dosis,
      notas_paciente: $('notas').value.trim(),
    });
    cerrarPanel();
    mostrarMensaje('Receta guardada correctamente');
    cargarRecetas();
  } catch (err) {
    error.textContent = err.message || 'No se pudo guardar la receta, intenta de nuevo';
    error.classList.remove('oculto');
  }
});

// Cerrar sesión: borra el token y manda al login (ajusta la ruta cuando exista)
$('cerrar-sesion').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('token');
  alert('Sesión cerrada (aquí irá la redirección al login)');
});

// ---------- Arranque ----------
async function iniciar() {
  $('doctor').innerHTML = DOCTORES.map(d => `<option value="${d.id}">${esc(d.detalle)}</option>`).join('');
  try {
    pacientes = await api.listarPacientes();
    $('lista-pacientes').innerHTML = pacientes.map(p => `<option value="${esc(p.nombre)}"></option>`).join('');
  } catch (error) {
    mostrarMensaje('No se pudo cargar la lista de pacientes');
  }
  cargarRecetas();
}
iniciar();
