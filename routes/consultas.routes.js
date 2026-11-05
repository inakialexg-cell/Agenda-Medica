const express = require('express');
const router = express.Router();
const consultasController = require('../controllers/consultas.controller');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

router.get('/dia', [verificarToken, esAdmin], consultasController.obtenerConsultasDia);
router.get('/mes', [verificarToken, esAdmin], consultasController.obtenerConsultasMes);
router.post('/', verificarToken, consultasController.crearConsulta);
router.put('/:id/estatus', [verificarToken, esAdmin], consultasController.actualizarEstatus);
router.post('/recetas', [verificarToken, esAdmin], consultasController.crearReceta);
router.get('/historial/:pacienteId', verificarToken, consultasController.obtenerHistorialPaciente);

module.exports = router;
