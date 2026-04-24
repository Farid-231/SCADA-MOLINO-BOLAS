const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Conexión a Postgres
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'molino_db',
  password: '123456', 
  port: 5432,
});

// --- RUTAS DE LECTURA (SENSORES Y ESTADO) ---

// Obtener la última lectura de los sensores (Tiempo Real)
app.get('/api/lecturas', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.lecturas_molino ORDER BY fecha_hora DESC LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener lecturas' });
  }
});

// Obtener los últimos 5 eventos para la tabla de Analytics
app.get('/api/eventos/recientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM public.historial_eventos ORDER BY fecha_hora DESC LIMIT 5');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Simulación de Desgaste de Revestimientos
let desgasteSimulado = 85.5; 
app.get('/api/activos/salud', (req, res) => {
  desgasteSimulado -= 0.001; 
  res.json({ componente: 'Revestimientos Molino B', salud: desgasteSimulado.toFixed(2) });
});

// --- RUTAS DE CONTROL (ESCRITURA) ---

// Actualizar Setpoint (RPM)
app.patch('/api/configuracion/:id', async (req, res) => {
  const { id } = req.params;
  const { setpoint_rpm } = req.body;
  try {
    const result = await pool.query(
      'UPDATE public.configuracion_control SET setpoint_rpm = $1 WHERE id = $2',
      [setpoint_rpm, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'ID no encontrado' });
    console.log(` Setpoint actualizado a ${setpoint_rpm} RPM`);
    res.json({ message: 'Setpoint actualizado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar/Parar Motor
app.patch('/api/estado/:id', async (req, res) => {
  const { id } = req.params;
  const { estado_actual } = req.body;
  try {
    const esAutomatico = (estado_actual === 'OPERANDO');
    await pool.query(
      'UPDATE public.configuracion_control SET modo_automatico = $1 WHERE id = $2',
      [esAutomatico, id]
    );
    console.log(` Motor en estado: ${estado_actual}`);
    res.json({ message: 'Estado actualizado', estado: estado_actual });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// Registro de Historial de Eventos
app.post('/api/eventos', async (req, res) => {
  const { evento, tipo, descripcion } = req.body;
  try {
    await pool.query(
      'INSERT INTO historial_eventos (evento, tipo, descripcion) VALUES ($1, $2, $3)',
      [evento, tipo, descripcion]
    );
    console.log(` Evento guardado: ${evento}`);
    res.status(201).json({ message: 'Evento registrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`
   SISTEMA SCADA MOLINO DE BOLAAS
  -------------------------------------------
    API: http://localhost:${PORT}
    DB: molino_db (PostgreSQL)
  -------------------------------------------
  `);
});