const express = require('express');
const router = express.Router();
const recetasController = require('../controllers/recetas.controller');
const { verificarToken } = require('../middlewares/authMiddleware');

router.get('/', verificarToken, recetasController.listarRecetas);
router.post('/', verificarToken, recetasController.crearReceta);
router.put('/:id/estatus', verificarToken, recetasController.actualizarEstatus);

module.exports = router;