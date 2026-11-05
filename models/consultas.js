
const db = require('../config/db');

// Obtener consultas con filtros opcionales
async function obtenerConsultas({ fecha, estatus } = {}) {
    try {
        let sql = `
            SELECT
                c.id,
                c.paciente_id,
                p.nombre AS paciente_nombre,
                c.doctor,
                c.fecha,
                c.hora,
                c.motivo,
                c.costo,
                c.estatus
            FROM consultas c
            INNER JOIN pacientes p ON c.paciente_id = p.id
            WHERE 1 = 1
        `;

        const valores = [];
        
        // Agregar filtro por fecha
        if (fecha) {
            valores.push(fecha);
            sql += ` AND c.fecha = $${valores.length}`;
        }

        // Agregar filtro por estatus
        if (estatus) {
            valores.push(estatus);
            sql += ` AND c.estatus = $${valores.length}`;
        }

        sql += ' ORDER BY c.fecha DESC, c.hora ASC';

        const resultado = await db.query(sql, valores);

        return resultado.rows;

    } catch (error) {
        console.error('Error al obtener consultas:', error);
        throw new Error('No se pudieron obtener las consultas');
    }
}


// Crear una consulta nueva
async function crearConsulta({
    paciente_id,
    doctor,
    fecha,
    hora,
    motivo,
    costo
}) {
    try {
        // Verificar que el horario no esté ocupado
        const verificacion = await db.query(
            `SELECT id
             FROM consultas
             WHERE doctor = $1
             AND fecha = $2
             AND hora = $3
             LIMIT 1`,
            [doctor, fecha, hora]
        );

        if (verificacion.rows.length > 0) {
            throw new Error(
                'El doctor ya tiene una consulta programada en ese horario'
            );
        }

        // Registrar la nueva consulta
        const resultado = await db.query(
            `INSERT INTO consultas
                (paciente_id, doctor, fecha, hora, motivo, costo, estatus)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [
                paciente_id,
                doctor,
                fecha,
                hora,
                motivo,
                costo,
                'pendiente'
            ]
        );

        return resultado.rows[0];

    } catch (error) {
        console.error('Error al crear consulta:', error);

        if (error.message.includes('horario')) {
            throw error;
        }

        throw new Error('No se pudo guardar la cita, intenta de nuevo');
    }
}


// Actualizar el estatus de una consulta
async function actualizarEstatus(id, nuevoEstatus) {
    try {
        const estatusPermitidos = [
            'confirmada',
            'pendiente',
            'cancelada'
        ];

        // Validar el nuevo estatus
        if (!estatusPermitidos.includes(nuevoEstatus)) {
            throw new Error('El estatus proporcionado no es válido');
        }

        const resultado = await db.query(
            `UPDATE consultas
             SET estatus = $1
             WHERE id = $2
             RETURNING *`,
            [nuevoEstatus, id]
        );

        if (resultado.rows.length === 0) {
            throw new Error('No se encontró la consulta');
        }

        return resultado.rows[0];

    } catch (error) {
        console.error('Error al actualizar consulta:', error);

        if (
            error.message === 'El estatus proporcionado no es válido' ||
            error.message === 'No se encontró la consulta'
        ) {
            throw error;
        }

        throw new Error('No se pudo actualizar el estatus de la consulta');
    }
}


// Exportar las funciones para utilizarlas en las rutas
module.exports = {
    obtenerConsultas,
    crearConsulta,
    actualizarEstatus
};
