import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation,
  getBlockedDates,
  createBlockedDate,
  deleteBlockedDate,
  verifyAdminCredentials,
  getDbStatus,
} from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5181;

// Middlewares
app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Health & System status
app.get('/api/health', async (req, res) => {
  const dbStatus = await getDbStatus();
  res.json({
    status: 'ok',
    service: 'Aliwen Spa Booking API',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// Admin authentication
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const isValid = verifyAdminCredentials(email, password);

  if (isValid) {
    res.json({
      success: true,
      token: 'aliwen_token_' + Buffer.from(`${email || 'admin'}:${Date.now()}`).toString('base64'),
      user: {
        email: email || process.env.ADMIN_EMAIL || 'contacto@refugioaliwenspa.cl',
        role: 'admin',
      },
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Credenciales inválidas',
    });
  }
});

// Reservations endpoints
app.get('/api/reservations', async (req, res) => {
  try {
    const list = await getReservations();
    res.json(list);
  } catch (err) {
    console.error('[API] Error getting reservations:', err);
    res.status(500).json({ error: 'Error al consultar reservas' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const data = req.body;
    if (!data.cabinId || !data.checkIn || !data.checkOut) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }
    const created = await createReservation(data);
    res.status(201).json(created);
  } catch (err) {
    console.error('[API] Error creating reservation:', err);
    res.status(500).json({ error: 'Error al registrar reserva' });
  }
});

app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'El status es requerido' });
    }
    const updated = await updateReservationStatus(id, status);
    if (!updated) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    res.json(updated);
  } catch (err) {
    console.error('[API] Error updating reservation:', err);
    res.status(500).json({ error: 'Error al actualizar reserva' });
  }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteReservation(id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[API] Error deleting reservation:', err);
    res.status(500).json({ error: 'Error al eliminar reserva' });
  }
});

// Blocked dates endpoints
app.get('/api/blocked-dates', async (req, res) => {
  try {
    const list = await getBlockedDates();
    res.json(list);
  } catch (err) {
    console.error('[API] Error getting blocked dates:', err);
    res.status(500).json({ error: 'Error al consultar bloqueos' });
  }
});

app.post('/api/blocked-dates', async (req, res) => {
  try {
    const data = req.body;
    if (!data.cabinId || !data.startDate || !data.endDate) {
      return res.status(400).json({ error: 'Faltan campos de bloqueo' });
    }
    const created = await createBlockedDate(data);
    res.status(201).json(created);
  } catch (err) {
    console.error('[API] Error creating blocked date:', err);
    res.status(500).json({ error: 'Error al bloquear fechas' });
  }
});

app.delete('/api/blocked-dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteBlockedDate(id);
    res.json({ success: true, id });
  } catch (err) {
    console.error('[API] Error deleting blocked date:', err);
    res.status(500).json({ error: 'Error al liberar bloqueo' });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
});
