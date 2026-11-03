const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Función para registrar un usuario inicial (puedes usarla para crear tu primer admin)
exports.registrar = async (req, res) => {
  const { nombre, email, password, rol, telefono } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO usuarios (nombre, email, password_hash, rol, telefono)
      VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol;
    `;
    const nuevoUsuario = await db.query(query, [nombre, email, passwordHash, rol || 'PACIENTE', telefono]);
    res.status(201).json({ mensaje: 'Usuario creado con éxito', usuario: nuevoUsuario.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario', detalle: error.message });
  }
};

// Función de inicio de sesión (Login - Pantalla 1)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const resultado = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensaje: 'Correo electrónico no encontrado' });
    }

    const usuario = resultado.rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Contraseña incorrecta' });
    }

    // Crear token JWT válido por 8 horas
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      mensaje: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor', detalle: error.message });
  }
};