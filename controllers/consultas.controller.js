const db = require('../config/db');

// Obtener consultas del día y cálculo de total cobrado (Pantalla 5)
exports.obtenerConsultasDia = async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
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

    // Cálculo total cobrado del día
    const totalCobrado = resultado.rows
      .filter(c => c.estatus === 'CONFIRMADA')
      .reduce((sum, c) => sum + parseFloat(c.costo || 0), 0);

    res.json({ consultas: resultado.rows, totalCobrado });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener consultas', detalle: error.message });
  }
};

// Crear nueva consulta (Pantalla 5)
exports.crearConsulta = async (req, res) => {
  const { paciente_id, doctor_id, fecha_hora, motivo, costo } = req.body;
  try {
    const query = `
      INSERT INTO consultas (paciente_id, doctor_id, fecha_hora, motivo, costo, estatus)
      VALUES ($1, $2, $3, $4, $5, 'CONFIRMADA') RETURNING *;
    `;
    const nuevaConsulta = await db.query(query, [paciente_id, doctor_id, fecha_hora, motivo, costo]);
    res.status(201).json(nuevaConsulta.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al agendar consulta', detalle: error.message });
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

// Obtener expediente/historial completo de un paciente (Pantalla 7)
exports.obtenerHistorialPaciente = async (req, res) => {
  const { pacienteId } = req.params;
  try {
    const paciente = await db.query('SELECT id, nombre, email, telefono, fecha_nacimiento, notas_medicas FROM usuarios WHERE id = $1', [pacienteId]);
    const consultas = await db.query('SELECT * FROM consultas WHERE paciente_id = $1 ORDER BY fecha_hora DESC', [pacienteId]);
    const recetas = await db.query('SELECT * FROM recetas WHERE paciente_id = $1 ORDER BY emitida_el DESC', [pacienteId]);

    const timeline = [
      ...consultas.rows.map(c => ({ tipo: 'CONSULTA', fecha: c.fecha_hora, detalle: c })),
      ...recetas.rows.map(r => ({ tipo: 'RECETA', fecha: r.emitida_el, detalle: r }))
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({
      paciente: paciente.rows[0],
      timeline
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener expediente', detalle: error.message });
  }
};