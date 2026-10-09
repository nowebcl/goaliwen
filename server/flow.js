import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const FLOW_API_KEY = process.env.FLOW_API_KEY || '3C2FB4EE-4519-4F44-AB42-8B9A5332L121';
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY || '863ab95341cd175aa17995ff6084c3fd5df6927b';
const FLOW_API_URL = (process.env.FLOW_API_URL || 'https://www.flow.cl/api').replace(/\/+$/, '');

/**
 * Sign parameters with HMAC-SHA256 according to Flow specification:
 * 1. Sort parameter keys alphabetically in ascending order.
 * 2. Concatenate key and value without delimiters (e.g. key1val1key2val2).
 * 3. Generate HMAC-SHA256 using secretKey and output in hex format.
 */
export function signParams(params, secret = FLOW_SECRET_KEY) {
  const keys = Object.keys(params).sort();
  let toSign = '';
  for (const key of keys) {
    if (params[key] !== undefined && params[key] !== null) {
      toSign += `${key}${params[key]}`;
    }
  }
  return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
}

/**
 * Create a new payment in Flow (Production / Sandbox).
 * Returns { success: true, url, token, flowOrder, redirectUrl } or { success: false, error }
 */
export async function createFlowPayment({
  commerceOrder,
  subject,
  amount,
  email,
  urlConfirmation,
  urlReturn,
  optional = '',
}) {
  try {
    const cleanAmount = Math.max(350, Math.round(Number(amount) || 350));
    const cleanEmail = (email || 'contacto@refugioaliwenspa.cl').trim();

    const params = {
      apiKey: FLOW_API_KEY,
      commerceOrder: String(commerceOrder),
      subject: String(subject || 'Agendamiento Refugio Aliwen Spa').slice(0, 250),
      currency: 'CLP',
      amount: cleanAmount,
      email: cleanEmail,
      urlConfirmation: String(urlConfirmation),
      urlReturn: String(urlReturn),
    };

    if (optional) {
      params.optional = typeof optional === 'object' ? JSON.stringify(optional).slice(0, 255) : String(optional).slice(0, 255);
    }

    // Generate Flow signature
    params.s = signParams(params, FLOW_SECRET_KEY);

    const body = new URLSearchParams(params).toString();

    console.log(`[Flow] Initiating payment for order ${commerceOrder} ($${cleanAmount} CLP) at ${FLOW_API_URL}/payment/create`);

    const res = await fetch(`${FLOW_API_URL}/payment/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await res.json();

    if (res.ok && data.url && data.token) {
      const redirectUrl = `${data.url}?token=${data.token}`;
      console.log(`[Flow] Order created successfully. Token: ${data.token}. Redirect: ${redirectUrl}`);
      return {
        success: true,
        url: data.url,
        token: data.token,
        flowOrder: data.flowOrder,
        redirectUrl,
      };
    } else {
      console.error('[Flow] Error creating payment:', data);
      return {
        success: false,
        error: data.message || `Error Flow (código ${data.code || res.status})`,
        details: data,
      };
    }
  } catch (err) {
    console.error('[Flow] Exception creating payment:', err);
    return {
      success: false,
      error: err.message || 'Error de conexión con la pasarela Flow',
    };
  }
}

/**
 * Query the status of a payment in Flow by token.
 * Status values:
 * 1: Pendiente
 * 2: Pagada
 * 3: Rechazada
 * 4: Anulada
 */
export async function getFlowPaymentStatus(token) {
  try {
    if (!token) {
      return { success: false, error: 'Token es requerido' };
    }

    const params = {
      apiKey: FLOW_API_KEY,
      token: String(token),
    };

    params.s = signParams(params, FLOW_SECRET_KEY);

    const query = new URLSearchParams(params).toString();
    const url = `${FLOW_API_URL}/payment/getStatus?${query}`;

    const res = await fetch(url);
    const data = await res.json();

    if (res.ok && data.commerceOrder) {
      const statusMap = {
        1: 'pendiente',
        2: 'pagada',
        3: 'rechazada',
        4: 'anulada',
      };

      return {
        success: true,
        flowOrder: data.flowOrder,
        commerceOrder: data.commerceOrder,
        status: data.status,
        statusName: statusMap[data.status] || 'desconocido',
        isPaid: data.status === 2,
        amount: data.amount,
        payer: data.payer,
        paymentData: data.paymentData,
        raw: data,
      };
    } else {
      console.error('[Flow] Error fetching status:', data);
      return {
        success: false,
        error: data.message || `Error Flow al consultar estado (${data.code})`,
        details: data,
      };
    }
  } catch (err) {
    console.error('[Flow] Exception fetching status:', err);
    return {
      success: false,
      error: err.message || 'Error de conexión con Flow',
    };
  }
}
