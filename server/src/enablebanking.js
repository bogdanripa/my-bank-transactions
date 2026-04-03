import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ORIGIN = 'https://api.enablebanking.com';

function getPrivateKey() {
  const keyPath = process.env.ENABLE_BANKING_KEY_PATH;
  if (!keyPath) throw new Error('ENABLE_BANKING_KEY_PATH not set');
  const resolved = path.isAbsolute(keyPath)
    ? keyPath
    : path.join(__dirname, '..', keyPath);
  return fs.readFileSync(resolved, 'utf8');
}

function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600,
  };
  const privateKey = getPrivateKey();
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: { kid: process.env.ENABLE_BANKING_APP_ID },
  });
}

function authHeaders() {
  return {
    Authorization: `Bearer ${makeJwt()}`,
    'Content-Type': 'application/json',
  };
}

async function apiCall(path, options = {}) {
  const res = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Enable Banking API error ${res.status}: ${err}`);
  }

  return res.json();
}

// List available banks (ASPSPs) - optionally filter by country
export async function listAspsps(country) {
  const data = await apiCall('/aspsps');
  if (country) {
    return data.aspsps.filter(
      (a) => a.country.toLowerCase() === country.toLowerCase()
    );
  }
  return data.aspsps;
}

// Start bank authorization - returns URL to redirect user to
export async function startAuth({ aspspName, aspspCountry, redirectUrl, psuType = 'personal', state }) {
  const body = {
    access: {
      valid_until: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    aspsp: { name: aspspName, country: aspspCountry },
    state: state,
    redirect_url: redirectUrl,
    psu_type: psuType,
  };
  return apiCall('/auth', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// Create a session from the auth code returned after bank authorization
export async function createSession(code) {
  return apiCall('/sessions', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

// Get session details (includes accounts list)
export async function getSession(sessionId) {
  return apiCall(`/sessions/${sessionId}`);
}

// Get account balances
export async function getBalances(accountUid) {
  return apiCall(`/accounts/${accountUid}/balances`);
}

// Get account transactions with pagination via continuation_key
export async function getTransactions(accountUid, dateFrom, continuationKey) {
  const params = [];
  if (dateFrom) params.push(`date_from=${dateFrom}`);
  if (continuationKey) params.push(`continuation_key=${encodeURIComponent(continuationKey)}`);
  const qs = params.length ? `?${params.join('&')}` : '';
  return apiCall(`/accounts/${accountUid}/transactions${qs}`);
}

// Fetch ALL transactions (handles pagination automatically)
export async function getAllTransactions(accountUid, dateFrom) {
  const allTransactions = [];
  let continuationKey = null;

  do {
    const data = await getTransactions(accountUid, dateFrom, continuationKey);
    if (data.transactions) {
      allTransactions.push(...data.transactions);
    }
    continuationKey = data.continuation_key || null;
  } while (continuationKey);

  return allTransactions;
}

// Get application details (useful for checking redirect_urls)
export async function getApplication() {
  return apiCall('/application');
}
