const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ mensaje: 'Acceso denegado. Token no proporcionado.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ mensaje: 'Token inválido o expirado.' });
    req.user = user;
    next();
  });
};

const esAdmin = (req, res, next) => {
  if (req.user.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({ mensaje: 'Acceso no autorizado. Se requiere rol de Administrador.' });
  }
  next();
};

module.exports = { verificarToken, esAdmin };