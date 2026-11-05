const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientes.controller');
const { verificarToken, esAdmin } = require('../middlewares/authMiddleware');

router.get('/', [verificarToken, esAdmin], pacientesController.obtenerPacientes);
router.post('/', [verificarToken, esAdmin], pacientesController.crearPaciente);
router.put('/:id', [verificarToken, esAdmin], pacientesController.actualizarPaciente);

module.exports = router;
