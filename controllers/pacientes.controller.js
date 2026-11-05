const bcrypt = require('bcrypt');
const db = require('../config/db');

// Lista de pacientes, con buscador por nombre/teléfono (?q=) y su última visita (Pantalla 4)
exports.obtenerPacientes = async (req, res) => {
  const { q } = req.query;
  try {
    let query = `
      SELECT u.id, u.nombre, u.email, u.telefono, u.fecha_nacimiento, u.notas_medicas, u.activo, u.creado_en,
             (SELECT MAX(c.fecha_hora) FROM consultas c WHERE c.paciente_id = u.id) AS ultima_visita
      FROM usuarios u WHERE u.rol = 'PACIENTE'`;
    const params = [];
    if (q) {
      query += " AND (u.nombre ILIKE $1 OR u.telefono ILIKE $1)";
      params.push(`%${q}%`);
    }
    query += " ORDER BY u.creado_en DESC, u.id DESC";
    const resultado = await db.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes', detalle: error.message });
  }
};

// Alta de paciente desde el panel lateral (Pantalla 4)
exports.crearPaciente = async (req, res) => {
  const { nombre, email, telefono, fecha_nacimiento, notas_medicas } = req.body;
  if (!nombre || !telefono || !email) {
    return res.status(400).json({ error: 'Nombre, teléfono y correo son obligatorios' });
  }
  try {
    // Contraseña temporal por defecto "123456" para nuevos pacientes
    const tempPasswordHash = await bcrypt.hash('123456', 10);
    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, fecha_nacimiento, notas_medicas)
      VALUES ($1, $2, $3, 'PACIENTE', $4, $5, $6) RETURNING id, nombre, email, telefono, fecha_nacimiento;
    `;
    const nuevoPaciente = await db.query(query, [nombre, email, tempPasswordHash, telefono, fecha_nacimiento || null, notas_medicas || null]);
    res.status(201).json(nuevoPaciente.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    res.status(500).json({ error: 'Error al registrar paciente', detalle: error.message });
  }
};

// Editar paciente (nombre, contacto, notas y si está activo)
exports.actualizarPaciente = async (req, res) => {
  const { nombre, email, telefono, fecha_nacimiento, notas_medicas, activo } = req.body;
  if (!nombre || !telefono || !email) {
    return res.status(400).json({ error: 'Nombre, teléfono y correo son obligatorios' });
  }
  try {
    const r = await db.query(`
      UPDATE usuarios SET nombre = $1, email = $2, telefono = $3, fecha_nacimiento = $4, notas_medicas = $5,
                          activo = COALESCE($6, activo)
      WHERE id = $7 AND rol = 'PACIENTE'
      RETURNING id, nombre, email, telefono, fecha_nacimiento, notas_medicas, activo;`,
      [nombre, email, telefono, fecha_nacimiento || null, notas_medicas || null, typeof activo === 'boolean' ? activo : null, req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Paciente no encontrado' });
    res.json(r.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Ya existe un usuario con ese correo' });
    res.status(500).json({ error: 'No se pudo actualizar el paciente', detalle: error.message });
  }
};
