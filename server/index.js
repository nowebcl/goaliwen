import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
import {
  createFlowPayment,
  getFlowPaymentStatus,
} from './flow.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5181;

// Middlewares: Support JSON and URL-encoded (Flow redirects use application/x-www-form-urlencoded)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

// Pending reservations store (in-memory + disk cache)
const PENDING_FILE = path.join(__dirname, 'data', 'pending_reservations.json');
let pendingReservations = new Map();

function loadPendingReservations() {
  try {
    if (fs.existsSync(PENDING_FILE)) {
      const raw = fs.readFileSync(PENDING_FILE, 'utf-8');
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && item.code) {
            pendingReservations.set(item.code, item);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Pending Store] Error reading pending file:', err.message);
  }
}

function persistPendingReservations() {
  try {
    const list = Array.from(pendingReservations.values());
    fs.writeFileSync(PENDING_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Pending Store] Error saving pending file:', err.message);
  }
}

loadPendingReservations();

function getPublicUrl(req) {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = req.get('host') || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${host}`;
}

// Health & System status
app.get('/api/health', async (req, res) => {
  const dbStatus = await getDbStatus();
  res.json({
    status: 'ok',
    service: 'Aliwen Spa Booking API with Flow.cl',
    database: dbStatus,
    flowGateway: {
      url: process.env.FLOW_API_URL || 'https://www.flow.cl/api',
      mode: 'production',
      hasKey: !!process.env.FLOW_API_KEY,
    },
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

// ==========================================
// FLOW PAYMENT GATEWAY ENDPOINTS (PRODUCCIÓN)
// ==========================================

// 1. Create payment order in Flow
app.post('/api/flow/create-payment', async (req, res) => {
  try {
    const data = req.body || {};
    if (!data.cabinId || !data.checkIn || !data.checkOut) {
      return res.status(400).json({ error: 'Faltan datos obligatorios para la reserva' });
    }

    const code = data.code || `ALW-${Math.floor(10000 + Math.random() * 90000)}`;
    const depositAmount = Math.max(350, Math.round(Number(data.depositAmount) || 350));
    const totalPrice = Math.max(depositAmount, Math.round(Number(data.totalPrice) || depositAmount));
    const pendingBalance = Math.max(0, totalPrice - depositAmount);

    let clientOrigin = data.clientOrigin;
    if (!clientOrigin && req.headers.referer) {
      try {
        clientOrigin = new URL(req.headers.referer).origin;
      } catch {}
    }
    if (!clientOrigin) {
      clientOrigin = getPublicUrl(req);
    }

    const pendingRecord = {
      id: `res-${Date.now()}`,
      code,
      cabinId: data.cabinId,
      cabinName: data.cabinName || 'Cabaña Refugio Aliwen',
      guestName: (data.guestName || 'Huésped').trim(),
      guestEmail: (data.guestEmail || 'contacto@refugioaliwenspa.cl').trim(),
      guestPhone: (data.guestPhone || '+56 9 9459 7751').trim(),
      guestNotes: (data.guestNotes || '').trim(),
      guestsCount: Number(data.guestsCount) || 2,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nightsCount: Number(data.nightsCount) || 1,
      pricePerNight: Number(data.pricePerNight) || depositAmount,
      totalPrice,
      depositPercentage: Number(data.depositPercentage) || 100,
      depositAmount,
      pendingBalance,
      status: 'en_proceso',
      paymentMethod: 'webpay_plus',
      clientOrigin,
      createdAt: new Date().toISOString(),
    };

    // Store in pending map
    pendingReservations.set(code, pendingRecord);
    persistPendingReservations();

    const publicUrl = getPublicUrl(req);
    const urlConfirmation = `${publicUrl}/api/flow/confirm`;
    const urlReturn = `${publicUrl}/api/flow/return`;

    const flowResult = await createFlowPayment({
      commerceOrder: code,
      subject: `Reserva ${pendingRecord.cabinName} (${code})`,
      amount: depositAmount,
      email: pendingRecord.guestEmail,
      urlConfirmation,
      urlReturn,
      optional: { code, cabinId: data.cabinId },
    });

    if (flowResult.success) {
      pendingRecord.flowToken = flowResult.token;
      pendingRecord.flowOrder = flowResult.flowOrder;
      pendingReservations.set(code, pendingRecord);
      persistPendingReservations();

      return res.json({
        success: true,
        redirectUrl: flowResult.redirectUrl,
        token: flowResult.token,
        commerceOrder: code,
        flowOrder: flowResult.flowOrder,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: flowResult.error || 'Error al conectar con la pasarela Flow',
        details: flowResult.details,
      });
    }
  } catch (err) {
    console.error('[API Flow Create] Error:', err);
    res.status(500).json({ error: 'Error interno al generar pago Flow' });
  }
});

// 2. Flow Return (Browser redirect after payment)
app.all('/api/flow/return', async (req, res) => {
  try {
    const token = req.body?.token || req.query?.token;
    console.log('[Flow Return] Received browser return with token:', token);

    if (!token) {
      const publicUrl = getPublicUrl(req);
      return res.redirect(`${publicUrl}/?payment_status=invalid_token`);
    }

    const flowStatus = await getFlowPaymentStatus(token);
    console.log('[Flow Return] Payment status response:', flowStatus);

    if (!flowStatus.success) {
      const publicUrl = getPublicUrl(req);
      return res.redirect(`${publicUrl}/?payment_status=error&msg=${encodeURIComponent(flowStatus.error || '')}`);
    }

    const commerceOrder = flowStatus.commerceOrder;
    let pending = pendingReservations.get(commerceOrder);

    // If not found by commerceOrder, search by flowToken
    if (!pending) {
      for (const [, item] of pendingReservations.entries()) {
        if (item.flowToken === token) {
          pending = item;
          break;
        }
      }
    }

    const clientOrigin = pending?.clientOrigin || getPublicUrl(req);

    if (flowStatus.isPaid) {
      // Payment Successful (status 2 = Pagada)
      const confirmedData = {
        ...(pending || {}),
        code: commerceOrder,
        status: 'confirmada',
        paymentMethod: 'webpay_plus',
        transactionId: `FLOW-${flowStatus.flowOrder}`,
      };

      try {
        await createReservation(confirmedData);
        pendingReservations.delete(commerceOrder);
        persistPendingReservations();
        console.log(`[Flow Return] Reservation ${commerceOrder} successfully confirmed and persisted!`);
      } catch (saveErr) {
        console.error('[Flow Return] Error persisting reservation:', saveErr);
      }

      // Redirect user to the clean Thank You page
      return res.redirect(`${clientOrigin}/gracias?code=${encodeURIComponent(commerceOrder)}&token=${encodeURIComponent(token)}`);
    } else {
      // Payment failed or was rejected / cancelled
      console.warn(`[Flow Return] Payment was not successful. Status: ${flowStatus.statusName} (${flowStatus.status})`);
      return res.redirect(`${clientOrigin}/?payment_status=${encodeURIComponent(flowStatus.statusName)}&code=${encodeURIComponent(commerceOrder)}`);
    }
  } catch (err) {
    console.error('[Flow Return] Exception during return handling:', err);
    const publicUrl = getPublicUrl(req);
    return res.redirect(`${publicUrl}/?payment_status=server_error`);
  }
});

// 3. Flow Confirm (Webhook from Flow server)
app.post('/api/flow/confirm', async (req, res) => {
  try {
    const token = req.body?.token;
    console.log('[Flow Webhook Confirm] Notification received for token:', token);

    if (!token) {
      return res.status(400).send('Token missing');
    }

    const flowStatus = await getFlowPaymentStatus(token);
    if (flowStatus.success && flowStatus.isPaid) {
      const commerceOrder = flowStatus.commerceOrder;
      const pending = pendingReservations.get(commerceOrder);

      const confirmedData = {
        ...(pending || {}),
        code: commerceOrder,
        status: 'confirmada',
        paymentMethod: 'webpay_plus',
        transactionId: `FLOW-${flowStatus.flowOrder}`,
      };

      await createReservation(confirmedData);
      pendingReservations.delete(commerceOrder);
      persistPendingReservations();
      console.log(`[Flow Webhook Confirm] Reservation ${commerceOrder} confirmed via webhook!`);
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Flow Webhook Confirm] Error:', err);
    res.status(500).send('Error');
  }
});

// 4. Query payment status by token
app.get('/api/flow/status/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const status = await getFlowPaymentStatus(token);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RESERVATIONS & BLOCKED DATES ENDPOINTS
// ==========================================

// Get reservation by code
app.get('/api/reservations/by-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const list = await getReservations();
    const found = list.find((r) => r.code?.toUpperCase() === code?.toUpperCase());

    if (found) {
      return res.json(found);
    }

    // Check pending list
    const pending = pendingReservations.get(code);
    if (pending) {
      return res.json(pending);
    }

    res.status(404).json({ error: 'Reserva no encontrada' });
  } catch (err) {
    console.error('[API] Error getting reservation by code:', err);
    res.status(500).json({ error: 'Error al consultar reserva' });
  }
});

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

// ==========================================
// STATIC FRONTEND SERVING & SPA FALLBACK
// ==========================================
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // Express 5 compatible SPA fallback
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Start listening
app.listen(PORT, () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
  console.log(`[Flow Gateway] Ready on ${process.env.FLOW_API_URL || 'https://www.flow.cl/api'}`);
});
