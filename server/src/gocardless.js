import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2';

async function apiCall(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GOCARDLESS_API_KEY}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GoCardless API error ${res.status}: ${err}`);
  }

  return res.json();
}

export async function listInstitutions(country) {
  return apiCall(`/institutions/?country=${country}`);
}

export async function createRequisition(institutionId, redirectUrl) {
  return apiCall('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      redirect: redirectUrl,
      institution_id: institutionId,
      user_language: 'EN',
      // Request maximum history
      access_valid_for_days: 180,
      max_historical_days: 730,
      access_scope: ['balances', 'details', 'transactions'],
    }),
  });
}

export async function getRequisition(requisitionId) {
  return apiCall(`/requisitions/${requisitionId}/`);
}

export async function getAccountDetails(accountId) {
  return apiCall(`/accounts/${accountId}/`);
}

export async function getAccountTransactions(accountId, dateFrom, dateTo) {
  let path = `/accounts/${accountId}/transactions/`;
  const params = [];
  if (dateFrom) params.push(`date_from=${dateFrom}`);
  if (dateTo) params.push(`date_to=${dateTo}`);
  if (params.length) path += `?${params.join('&')}`;
  return apiCall(path);
}

export async function deleteRequisition(requisitionId) {
  return apiCall(`/requisitions/${requisitionId}/`, { method: 'DELETE' });
}
