const express = require('express');
const router = express.Router();
const consultasController = require('../controllers/consultas.controller');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/dia', verificarToken, consultasController.obtenerConsultasDia);
router.post('/', verificarToken, consultasController.crearConsulta);
router.post('/recetas', verificarToken, consultasController.crearReceta);
router.get('/historial/:pacienteId', verificarToken, consultasController.obtenerHistorialPaciente);

module.exports = router;
