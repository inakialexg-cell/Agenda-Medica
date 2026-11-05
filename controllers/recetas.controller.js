const db = require('../config/db');

// Listar recetas (con buscador opcional ?q=)
// Devuelve las columnas que espera el frontend:
// id, paciente_id, paciente_nombre, doctor_nombre, medicamento,
// dosis_indicaciones, emitida_el, estatus
exports.listarRecetas = async (req, res) => {
  const q = req.query.q || null;
  try {
    const query = `
      SELECT r.id, r.paciente_id, u.nombre AS paciente_nombre,
             du.nombre AS doctor_nombre, r.medicamento, r.dosis_indicaciones,
             r.notas_paciente, r.emitida_el, r.estatus
      FROM recetas r
      JOIN usuarios u ON r.paciente_id = u.id
      LEFT JOIN doctores d ON r.doctor_id = d.id
      LEFT JOIN usuarios du ON d.usuario_id = du.id
      WHERE ($1::text IS NULL
             OR u.nombre ILIKE '%' || $1 || '%'
             OR r.medicamento ILIKE '%' || $1 || '%')
      ORDER BY r.emitida_el DESC, r.id DESC;
    `;
    const resultado = await db.query(query, [q]);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas', detalle: error.message });
  }
};

// Emitir una receta nueva
exports.crearReceta = async (req, res) => {
  const { paciente_id, doctor_id, consulta_id, medicamento, dosis_indicaciones, notas_paciente } = req.body;
  if (!paciente_id || !medicamento || !dosis_indicaciones) {
    return res.status(400).json({ error: 'Faltan datos: paciente, medicamento y dosis son obligatorios' });
  }
  try {
    const query = `
      INSERT INTO recetas (paciente_id, doctor_id, consulta_id, medicamento, dosis_indicaciones, notas_paciente, estatus)
      VALUES ($1, $2, $3, $4, $5, $6, 'VIGENTE') RETURNING *;
    `;
    const nueva = await db.query(query, [
      paciente_id, doctor_id || null, consulta_id || null,
      medicamento, dosis_indicaciones, notas_paciente || null
    ]);
    res.status(201).json(nueva.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar la receta, intenta de nuevo', detalle: error.message });
  }
};

// Cambiar estatus: VIGENTE / FINALIZADA
exports.actualizarEstatus = async (req, res) => {
  const { id } = req.params;
  const estatus = String(req.body.estatus || '').toUpperCase();
  if (!['VIGENTE', 'FINALIZADA'].includes(estatus)) {
    return res.status(400).json({ error: 'Estatus no válido' });
  }
  try {
    const resultado = await db.query(
      'UPDATE recetas SET estatus = $1 WHERE id = $2 RETURNING *;',
      [estatus, id]
    );
    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }
    res.json(resultado.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la receta', detalle: error.message });
  }
};
