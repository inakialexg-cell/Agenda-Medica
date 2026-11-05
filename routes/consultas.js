
const express = require('express');
const router = express.Router();
const db = require('../config/db');

const {
    obtenerConsultas,
    crearConsulta,
    actualizarEstatus
} = require('../models/consultas');


// GET: Mostrar consultas con filtros opcionales
router.get('/', async (req, res) => {
    try {
        const { fecha, estatus } = req.query;

        const consultas = await obtenerConsultas({
            fecha,
            estatus
        });

        // Obtener las consultas del día para calcular el total
        const fechaActual = fecha || new Date().toLocaleDateString('en-CA');

        const consultasDelDia = await obtenerConsultas({
            fecha: fechaActual
        });

        // Sumar únicamente las consultas confirmadas
        const totalConfirmadas = consultasDelDia
            .filter(c => c.estatus === 'confirmada')
            .reduce((total, c) => total + Number(c.costo), 0);

        res.render('consultas/listado', {
            consultas,
            fecha: fecha || '',
            estatus: estatus || '',
            totalConfirmadas,
            error: req.query.error || ''
        });

    } catch (error) {
        console.error('Error en GET /consultas:', error);
        res.status(500).send('No se pudieron cargar las consultas');
    }
});


// POST: Crear una consulta
router.post('/', async (req, res) => {
    try {
        const {
            paciente_id,
            doctor,
            fecha,
            hora,
            motivo,
            costo
        } = req.body;

        // Validar los campos obligatorios
        if (
            !paciente_id ||
            !doctor ||
            !fecha ||
            !hora ||
            !motivo ||
            costo === undefined ||
            costo === ''
        ) {
            return res.status(400).send(
                'Todos los campos son obligatorios'
            );
        }

        // Validar los datos numéricos
        const pacienteId = Number(paciente_id);
        const costoNumerico = Number(costo);

        if (
            !Number.isInteger(pacienteId) ||
            pacienteId <= 0 ||
            !Number.isFinite(costoNumerico) ||
            costoNumerico < 0
        ) {
            return res.status(400).send(
                'El paciente o el costo no son válidos'
            );
        }

        await crearConsulta({
            paciente_id: pacienteId,
            doctor,
            fecha,
            hora,
            motivo,
            costo: costoNumerico
        });

        // Regresar al listado después de guardar
        res.redirect('/consultas?fecha=' + encodeURIComponent(fecha));

    } catch (error) {
        console.error('Error en POST /consultas:', error);

        const mensaje = encodeURIComponent(error.message);

        res.redirect('/consultas?error=' + mensaje);
    }
});


// PUT: Actualizar el estatus de una consulta
router.put('/:id/estatus', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { nuevoEstatus } = req.body;

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'El ID de la consulta no es válido'
            });
        }

        const consulta = await actualizarEstatus(
            id,
            nuevoEstatus
        );

        res.json({
            mensaje: 'Estatus actualizado correctamente',
            consulta
        });

    } catch (error) {
        console.error('Error en PUT /consultas/:id/estatus:', error);

        const noEncontrada = error.message === 'No se encontró la consulta';
        const invalido = error.message === 'El estatus proporcionado no es válido';

        res.status(noEncontrada ? 404 : invalido ? 400 : 500).json({
            error: error.message
        });
    }
});

// Mostrar calendario de consultas
router.get('/calendario', async (req, res) => {
    try {
        const resultado = await db.query(`
            SELECT DISTINCT
                TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha
            FROM consultas
        `);

        const diasConConsultas = resultado.rows.map(
            consulta => consulta.fecha
        );

        res.render('consultas/calendario', {
            diasConConsultas
        });

    } catch (error) {
        console.error('Error al cargar el calendario:', error);
        res.status(500).send('No se pudo cargar el calendario');
    }
});

// Exportar las rutas
module.exports = router;
