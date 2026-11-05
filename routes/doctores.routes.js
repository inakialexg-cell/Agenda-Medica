const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verificarToken } = require('../middlewares/authMiddleware');

// Lista de doctores para los selectores (agendar consulta, emitir receta)
router.get('/', verificarToken, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT d.id, u.nombre, d.especialidad
      FROM doctores d JOIN usuarios u ON d.usuario_id = u.id
      ORDER BY u.nombre;`);
    res.json(r.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener doctores', detalle: error.message });
  }
});

module.exports = router;
