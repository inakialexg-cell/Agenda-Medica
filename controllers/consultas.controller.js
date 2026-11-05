const db = require('../config/db');

// Consultas de un día + total cobrado (solo las CONFIRMADAS suman)
// GET /api/consultas/dia?fecha=2026-11-05
exports.obtenerConsultasDia = async (req, res) => {
  const fecha = req.query.fecha || new Date().toLocaleDateString('en-CA');
  try {
    const query = `
      SELECT c.*,
             u.nombre AS paciente_nombre,
             u.telefono AS paciente_telefono,
             d_usr.nombre AS doctor_nombre
      FROM consultas c
      JOIN usuarios u ON c.paciente_id = u.id
      LEFT JOIN doctores d ON c.doctor_id = d.id
      LEFT JOIN usuarios d_usr ON d.usuario_id = d_usr.id
      WHERE DATE(c.fecha_hora) = $1
      ORDER BY c.fecha_hora ASC;
    `;
    const resultado = await db.query(query, [fecha]);
    const totalCobrado = resultado.rows
      .filter(c => c.estatus === 'CONFIRMADA')
      .reduce((sum, c) => sum + parseFloat(c.costo || 0), 0);
    res.json({ consultas: resultado.rows, totalCobrado });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener consultas', detalle: error.message });
  }
};

// Todas las consultas de un mes (para el calendario)
// GET /api/consultas/mes?mes=2026-11
exports.obtenerConsultasMes = async (req, res) => {
  const mes = req.query.mes || new Date().toLocaleDateString('en-CA').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mes)) return res.status(400).json({ error: 'Mes no válido (usa AAAA-MM)' });
  try {
    const resultado = await db.query(`
      SELECT c.*, u.nombre AS paciente_nombre, d_usr.nombre AS doctor_nombre
      FROM consultas c
      JOIN usuarios u ON c.paciente_id = u.id
      LEFT JOIN doctores d ON c.doctor_id = d.id
      LEFT JOIN usuarios d_usr ON d.usuario_id = d_usr.id
      WHERE to_char(c.fecha_hora, 'YYYY-MM') = $1
      ORDER BY c.fecha_hora ASC;`, [mes]);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener consultas del mes', detalle: error.message });
  }
};

// Agendar consulta.
// - Administrador: elige paciente y costo; queda CONFIRMADA.
// - Paciente: solo puede agendar para sí mismo, sin costo; queda PENDIENTE de confirmar.
exports.crearConsulta = async (req, res) => {
  const esPaciente = req.user.rol === 'PACIENTE';
  const paciente_id = esPaciente ? req.user.id : Number(req.body.paciente_id);
  const { doctor_id, fecha_hora, motivo } = req.body;
  const costo = esPaciente ? 0 : Number(req.body.costo ?? 0);

  if (!paciente_id || !doctor_id || !fecha_hora || !motivo) {
    return res.status(400).json({ error: 'Paciente, doctor, fecha y hora, y motivo son obligatorios' });
  }
  if (!Number.isFinite(costo) || costo < 0) {
    return res.status(400).json({ error: 'El costo no es válido' });
  }
  try {
    // No permitir dos consultas del mismo doctor a la misma hora
    const ocupado = await db.query(
      `SELECT id FROM consultas WHERE doctor_id = $1 AND fecha_hora = $2 AND estatus <> 'CANCELADA' LIMIT 1`,
      [doctor_id, fecha_hora]
    );
    if (ocupado.rows.length > 0) {
      return res.status(409).json({ error: 'El doctor ya tiene una consulta en ese horario' });
    }
    const nueva = await db.query(
      `INSERT INTO consultas (paciente_id, doctor_id, fecha_hora, motivo, costo, estatus)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`,
      [paciente_id, doctor_id, fecha_hora, motivo, costo, esPaciente ? 'PENDIENTE' : 'CONFIRMADA']
    );
    res.status(201).json(nueva.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar la cita, intenta de nuevo', detalle: error.message });
  }
};

// Cambiar estatus de una consulta (solo administrador)
// PUT /api/consultas/:id/estatus   body: { estatus: 'CONFIRMADA' | 'PENDIENTE' | 'CANCELADA' }
exports.actualizarEstatus = async (req, res) => {
  const estatus = String(req.body.estatus || '').toUpperCase();
  if (!['CONFIRMADA', 'PENDIENTE', 'CANCELADA'].includes(estatus)) {
    return res.status(400).json({ error: 'Estatus no válido' });
  }
  try {
    const r = await db.query('UPDATE consultas SET estatus = $1 WHERE id = $2 RETURNING *;', [estatus, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Consulta no encontrada' });
    res.json(r.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la consulta', detalle: error.message });
  }
};

// Emitir nueva receta (Pantalla 6)
exports.crearReceta = async (req, res) => {
  const { paciente_id, doctor_id, medicamento, dosis_indicaciones, notas_paciente } = req.body;
  try {
    const query = `
      INSERT INTO recetas (paciente_id, doctor_id, medicamento, dosis_indicaciones, notas_paciente, estatus)
      VALUES ($1, $2, $3, $4, $5, 'VIGENTE') RETURNING *;
    `;
    const nuevaReceta = await db.query(query, [paciente_id, doctor_id, medicamento, dosis_indicaciones, notas_paciente]);
    res.status(201).json(nuevaReceta.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al emitir receta', detalle: error.message });
  }
};

// Expediente / historial completo de un paciente (Pantalla 7)
// Un paciente solo puede ver el suyo; el administrador puede ver cualquiera.
exports.obtenerHistorialPaciente = async (req, res) => {
  const { pacienteId } = req.params;
  if (req.user.rol === 'PACIENTE' && String(req.user.id) !== String(pacienteId)) {
    return res.status(403).json({ mensaje: 'No puedes ver el historial de otro paciente.' });
  }
  try {
    const paciente = await db.query('SELECT id, nombre, email, telefono, fecha_nacimiento, notas_medicas, creado_en FROM usuarios WHERE id = $1', [pacienteId]);
    if (paciente.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    const consultas = await db.query(`
      SELECT c.*, du.nombre AS doctor_nombre
      FROM consultas c
      LEFT JOIN doctores d ON c.doctor_id = d.id
      LEFT JOIN usuarios du ON d.usuario_id = du.id
      WHERE c.paciente_id = $1 ORDER BY c.fecha_hora DESC`, [pacienteId]);
    const recetas = await db.query(`
      SELECT r.*, du.nombre AS doctor_nombre
      FROM recetas r
      LEFT JOIN doctores d ON r.doctor_id = d.id
      LEFT JOIN usuarios du ON d.usuario_id = du.id
      WHERE r.paciente_id = $1 ORDER BY r.emitida_el DESC`, [pacienteId]);

    const timeline = [
      ...consultas.rows.map(c => ({ tipo: 'CONSULTA', fecha: c.fecha_hora, detalle: c })),
      ...recetas.rows.map(r => ({ tipo: 'RECETA', fecha: r.emitida_el, detalle: r }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({ paciente: paciente.rows[0], timeline });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener expediente', detalle: error.message });
  }
};
