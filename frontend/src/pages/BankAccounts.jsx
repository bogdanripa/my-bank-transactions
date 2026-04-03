import { useState, useEffect } from 'react';
import { requisitions, institutions, sync } from '../api';

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'FI', name: 'Finland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'PL', name: 'Poland' },
  { code: 'RO', name: 'Romania' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LV', name: 'Latvia' },
  { code: 'EE', name: 'Estonia' },
];

export default function BankAccounts() {
  const [reqs, setReqs] = useState([]);
  const [country, setCountry] = useState('');
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadRequisitions();
  }, []);

  async function loadRequisitions() {
    try {
      const data = await requisitions.list();
      setReqs(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadBanks(countryCode) {
    setCountry(countryCode);
    if (!countryCode) {
      setBanks([]);
      return;
    }
    setLoading(true);
    try {
      const data = await institutions.list(countryCode);
      setBanks(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function connectBank(bank) {
    setAdding(true);
    try {
      const result = await requisitions.create({
        aspsp_name: bank.aspsp_name,
        aspsp_country: bank.aspsp_country,
        institution_name: bank.name,
        institution_logo: bank.logo,
        redirect_url: window.location.origin + '/callback',
      });
      // Save the requisition ID so the callback can find it
      localStorage.setItem('pending_requisition_id', result.id);
      // Redirect to bank auth
      window.location.href = result.link;
    } catch (err) {
      alert(err.message);
    }
    setAdding(false);
  }

  async function completeRequisition(id) {
    try {
      await requisitions.complete(id);
      loadRequisitions();
    } catch (err) {
      alert(err.message);
    }
  }

  async function syncAccount(accountId) {
    setSyncing(accountId);
    setSyncResult(null);
    try {
      const result = await sync.account(accountId);
      setSyncResult({ accountId, ...result });
      loadRequisitions();
    } catch (err) {
      alert(err.message);
    }
    setSyncing(null);
  }

  async function syncAll() {
    setSyncing('all');
    setSyncResult(null);
    try {
      const results = await sync.all();
      setSyncResult({ all: true, results });
      loadRequisitions();
    } catch (err) {
      alert(err.message);
    }
    setSyncing(null);
  }

  async function removeRequisition(id) {
    if (!confirm('Remove this bank connection and all its accounts?')) return;
    try {
      await requisitions.delete(id);
      loadRequisitions();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bank Accounts</h1>
        <button
          onClick={syncAll}
          disabled={syncing !== null}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {syncing === 'all' ? 'Syncing...' : 'Sync All Accounts'}
        </button>
      </div>

      {syncResult && (
        <div className="bg-green-50 border border-green-200 rounded p-4 text-sm">
          {syncResult.all ? (
            <div>
              {syncResult.results.map((r, i) => (
                <div key={i}>
                  {r.name}: {r.error ? `Error: ${r.error}` : `${r.inserted} new, ${r.skipped} existing`}
                </div>
              ))}
            </div>
          ) : (
            <div>Inserted {syncResult.inserted} new transactions ({syncResult.skipped} already existed)</div>
          )}
        </div>
      )}

      {/* Connected banks */}
      {reqs.length > 0 && (
        <div className="space-y-4">
          {reqs.map((req) => (
            <div key={req.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {req.institution_logo && (
                    <img src={req.institution_logo} alt="" className="w-8 h-8" />
                  )}
                  <div>
                    <h3 className="font-semibold">{req.institution_name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        req.status === 'LN'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {req.status === 'LN' ? 'Connected' : req.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {req.status !== 'LN' && (
                    <button
                      onClick={() => completeRequisition(req.id)}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                    >
                      Complete Setup
                    </button>
                  )}
                  <button
                    onClick={() => removeRequisition(req.id)}
                    className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {req.accounts.length > 0 && (
                <div className="space-y-2 ml-11">
                  {req.accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">{acc.name || acc.iban || acc.id}</span>
                        {acc.iban && (
                          <span className="text-gray-500 ml-2">{acc.iban}</span>
                        )}
                        {acc.last_synced_at && (
                          <span className="text-gray-400 ml-2">
                            Last sync: {new Date(acc.last_synced_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => syncAccount(acc.id)}
                        disabled={syncing !== null}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        {syncing === acc.id ? 'Syncing...' : 'Sync'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new bank */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-3">Add Bank Connection</h2>
        <select
          value={country}
          onChange={(e) => loadBanks(e.target.value)}
          className="border rounded px-3 py-2 w-full mb-3"
        >
          <option value="">Select a country...</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        {loading && <div className="text-gray-500 text-sm">Loading banks...</div>}

        {banks.length > 0 && (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {banks.map((bank) => (
              <button
                key={bank.id}
                onClick={() => connectBank(bank)}
                disabled={adding}
                className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-50 text-left disabled:opacity-50"
              >
                {bank.logo && <img src={bank.logo} alt="" className="w-6 h-6" />}
                <span className="text-sm">{bank.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
