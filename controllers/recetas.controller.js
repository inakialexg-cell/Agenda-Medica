const db = require('../config/db');

// Listar recetas (con buscador opcional ?q=)
exports.listarRecetas = async (req, res) => {
  const q = req.query.q || null;
  try {
    const query = `
      SELECT r.*, p.nombre AS paciente_nombre
      FROM recetas r
      JOIN pacientes p ON r.paciente_id = p.id
      WHERE ($1::text IS NULL
             OR p.nombre ILIKE '%' || $1 || '%'
             OR r.medicamento ILIKE '%' || $1 || '%')
      ORDER BY r.fecha_emision DESC;
    `;
    const resultado = await db.query(query, [q]);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener recetas', detalle: error.message });
  }
};

// Emitir una receta nueva
exports.crearReceta = async (req, res) => {
  const { paciente_id, consulta_id, medicamento, dosis, doctor } = req.body;
  if (!paciente_id || !medicamento || !dosis) {
    return res.status(400).json({ error: 'Faltan datos: paciente, medicamento y dosis son obligatorios' });
  }
  try {
    const query = `
      INSERT INTO recetas (paciente_id, consulta_id, medicamento, dosis, doctor, fecha_emision, estatus)
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'vigente') RETURNING *;
    `;
    const nueva = await db.query(query, [paciente_id, consulta_id || null, medicamento, dosis, doctor]);
    res.status(201).json(nueva.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo guardar la receta, intenta de nuevo', detalle: error.message });
  }
};

// Cambiar estatus: vigente / finalizada
exports.actualizarEstatus = async (req, res) => {
  const { id } = req.params;
  const { estatus } = req.body;
  if (!['vigente', 'finalizada'].includes(estatus)) {
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