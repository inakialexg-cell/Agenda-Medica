const bcrypt = require('bcrypt');
const db = require('../config/db');

// Obtener lista de pacientes o buscar por nombre/teléfono (Pantalla 4)
exports.obtenerPacientes = async (req, res) => {
  const { q } = req.query;
  try {
    let query = "SELECT id, nombre, email, telefono, fecha_nacimiento, notas_medicas, activo, creado_en FROM usuarios WHERE rol = 'PACIENTE'";
    let params = [];

    if (q) {
      query += " AND (nombre ILIKE $1 OR telefono ILIKE $1)";
      params.push(`%${q}%`);
    }

    query += " ORDER BY creado_en DESC";
    const resultado = await db.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pacientes', detalle: error.message });
  }
};

// Crear nuevo paciente desde el Modal (Pantalla 4)
exports.crearPaciente = async (req, res) => {
  const { nombre, email, telefono, fecha_nacimiento, notas_medicas } = req.body;
  try {
    // Contraseña temporal por defecto "123456" para nuevos pacientes
    const tempPasswordHash = await bcrypt.hash('123456', 10);
    
    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, fecha_nacimiento, notas_medicas)
      VALUES ($1, $2, $3, 'PACIENTE', $4, $5, $6) RETURNING id, nombre, email, telefono, fecha_nacimiento;
    `;
    const nuevoPaciente = await db.query(query, [nombre, email, tempPasswordHash, telefono, fecha_nacimiento, notas_medicas]);
    res.status(201).json(nuevoPaciente.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar paciente', detalle: error.message });
  }
};