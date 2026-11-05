-- Agenda Medica - Consultorio "Diaz" | Esquema PostgreSQL (Supabase)
-- Correr en Supabase: SQL Editor > New query > pegar TODO > Run.
-- Es seguro correrlo mas de una vez (reinicia las tablas y los datos de prueba).

DROP TABLE IF EXISTS recetas;
DROP TABLE IF EXISTS consultas;
DROP TABLE IF EXISTS doctores;
DROP TABLE IF EXISTS usuarios;

-- Pacientes y administradores viven en la misma tabla (se distinguen por "rol")
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol TEXT NOT NULL DEFAULT 'PACIENTE' CHECK (rol IN ('ADMINISTRADOR', 'PACIENTE')),
  telefono VARCHAR(20),
  fecha_nacimiento DATE,
  notas_medicas TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE doctores (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  especialidad VARCHAR(100)
);

CREATE TABLE consultas (
  id SERIAL PRIMARY KEY,
  paciente_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  doctor_id INT REFERENCES doctores(id) ON DELETE SET NULL,
  fecha_hora TIMESTAMP NOT NULL,
  motivo VARCHAR(255),
  costo NUMERIC(8,2) NOT NULL DEFAULT 0,
  estatus TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estatus IN ('CONFIRMADA', 'PENDIENTE', 'CANCELADA')),
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recetas (
  id SERIAL PRIMARY KEY,
  paciente_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  doctor_id INT REFERENCES doctores(id) ON DELETE SET NULL,
  consulta_id INT REFERENCES consultas(id) ON DELETE SET NULL,
  medicamento VARCHAR(150) NOT NULL,
  dosis_indicaciones VARCHAR(255) NOT NULL,
  notas_paciente TEXT,
  emitida_el DATE NOT NULL DEFAULT CURRENT_DATE,
  estatus TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (estatus IN ('VIGENTE', 'FINALIZADA'))
);

-- ---------------- DATOS DE PRUEBA ----------------
-- Todos los usuarios de prueba tienen la contrasena: admin123
-- (el hash es bcrypt; nunca se guarda la contrasena en texto plano)
INSERT INTO usuarios (nombre, email, password_hash, rol, telefono, fecha_nacimiento, notas_medicas) VALUES
('Dr. Díaz',        'admin@consultoriodiaz.com',  '$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'ADMINISTRADOR', '8110000001', NULL, NULL),
('Dra. Ramírez',    'ramirez@consultoriodiaz.com','$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'ADMINISTRADOR', '8110000002', NULL, NULL),
('María López',     'maria.lopez@correo.com',     '$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'PACIENTE', '8112345678', '1990-05-14', 'Sin alergias registradas'),
('Carlos Ruiz',     'carlos.ruiz@correo.com',     '$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'PACIENTE', '8123456789', '1985-11-02', NULL),
('Ana Torres',      'ana.torres@correo.com',      '$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'PACIENTE', '8134567890', '1998-02-20', 'Alergia a la penicilina'),
('Jorge Medina',    'jorge.medina@correo.com',    '$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'PACIENTE', '8145678901', '1979-07-30', NULL),
('Lucía Hernández', 'lucia.hernandez@correo.com', '$2b$10$Y9HYRgqY10hsNtnpL35FAeYiHpdNWELDwFdJw6gEBV79Kx.2EWaqO', 'PACIENTE', '8156789012', '2001-12-09', NULL);

INSERT INTO doctores (usuario_id, especialidad) VALUES
(1, 'Medicina general'),
(2, 'Medicina general');

INSERT INTO consultas (paciente_id, doctor_id, fecha_hora, motivo, costo, estatus) VALUES
(3, 1, '2026-11-05 09:00', 'Revisión general', 350, 'CONFIRMADA'),
(4, 1, '2026-11-05 10:00', 'Control de presión', 350, 'CONFIRMADA'),
(5, 2, '2026-11-05 11:30', 'Dolor de cabeza', 300, 'PENDIENTE'),
(6, 1, '2026-11-05 13:00', 'Seguimiento', 0, 'CANCELADA'),
(7, 2, '2026-11-05 16:00', 'Primera consulta', 400, 'CONFIRMADA');

INSERT INTO recetas (paciente_id, doctor_id, medicamento, dosis_indicaciones, emitida_el, estatus) VALUES
(3, 1, 'Amoxicilina 500mg', '1 cada 8 horas por 7 días', CURRENT_DATE - 1, 'VIGENTE'),
(4, 1, 'Losartán 50mg', '1 cada 24 horas', CURRENT_DATE - 3, 'VIGENTE'),
(5, 2, 'Paracetamol 500mg', '1 cada 8 horas por 3 días', '2026-10-03', 'FINALIZADA'),
(6, 1, 'Omeprazol 20mg', '1 cada 24 horas por 14 días', '2026-09-15', 'FINALIZADA');
