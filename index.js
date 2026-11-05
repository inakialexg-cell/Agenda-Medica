const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const pacientesRoutes = require('./routes/pacientes.routes');
const consultasRoutes = require('./routes/consultas.routes');
const recetasRoutes = require('./routes/recetas.routes');
const doctoresRoutes = require('./routes/doctores.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// El frontend (login, paneles, recetas...) se sirve desde este mismo servidor
app.use(express.static(path.join(__dirname, 'frontend')));

// Montaje de rutas del backend
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacientesRoutes);
app.use('/api/consultas', consultasRoutes);
app.use('/api/recetas', recetasRoutes);
app.use('/api/doctores', doctoresRoutes);

// Estado de la API y de la base de datos
app.get('/api/estado', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ 
      mensaje: 'API del Consultorio Díaz conectada correctamente',
      hora_supabase: result.rows[0].now 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al conectar con la base de datos', detalle: error.message });
  }
});

// La raiz manda al login
app.get('/', (req, res) => res.redirect('/login.html'));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});