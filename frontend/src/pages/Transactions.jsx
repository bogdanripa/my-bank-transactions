import { useState, useEffect, useCallback } from 'react';
import { transactions, tags as tagsApi } from '../api';
import { Link } from 'react-router-dom';

function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount);
}

export default function Transactions() {
  const [data, setData] = useState({ transactions: [], total: 0 });
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('booking_date');
  const [sortDir, setSortDir] = useState('DESC');
  const [page, setPage] = useState(0);
  const [tagInput, setTagInput] = useState({});
  const [expanded, setExpanded] = useState(null);
  const limit = 50;

  const load = useCallback(async () => {
    try {
      const result = await transactions.list({
        search: search || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        limit,
        offset: page * limit,
      });
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }, [search, dateFrom, dateTo, sortBy, sortDir, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function addTag(txId) {
    const tag = tagInput[txId];
    if (!tag) return;
    await transactions.addTag(txId, tag);
    setTagInput((prev) => ({ ...prev, [txId]: '' }));
    load();
  }

  async function removeTag(txId, tagName) {
    await transactions.removeTag(txId, tagName);
    load();
  }

  const totalPages = Math.ceil(data.total / limit);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Transactions</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-gray-500 block mb-1">Search</label>
          <input
            type="text"
            placeholder="Search by name, description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Sort</label>
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(':');
              setSortBy(s);
              setSortDir(d);
            }}
            className="border rounded px-3 py-2"
          >
            <option value="booking_date:DESC">Date (newest)</option>
            <option value="booking_date:ASC">Date (oldest)</option>
            <option value="amount:DESC">Amount (high to low)</option>
            <option value="amount:ASC">Amount (low to high)</option>
          </select>
        </div>
      </div>

      <div className="text-sm text-gray-500">{data.total} transactions found</div>

      {/* Transaction list */}
      <div className="space-y-1">
        {data.transactions.map((tx) => (
          <div key={tx.id} className="border rounded">
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpanded(expanded === tx.id ? null : tx.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {tx.third_party_name || tx.raw_name || 'Unknown'}
                  </span>
                  {tx.third_party_id && (
                    <Link
                      to={`/third-parties?id=${tx.third_party_id}`}
                      className="text-blue-600 text-xs hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      view
                    </Link>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{tx.booking_date}</span>
                  <span>{tx.institution_name}</span>
                  <span>{tx.account_name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {tx.tags?.length > 0 && (
                  <div className="flex gap-1">
                    {tx.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <span
                  className={`font-mono font-semibold ${
                    tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatAmount(tx.amount, tx.currency)}
                </span>
              </div>
            </div>

            {expanded === tx.id && (
              <div className="border-t px-3 py-2 bg-gray-50 text-sm space-y-2">
                {tx.remittance_info && (
                  <div>
                    <span className="text-gray-500">Remittance: </span>
                    {tx.remittance_info}
                  </div>
                )}
                {tx.additional_info && (
                  <div>
                    <span className="text-gray-500">Additional: </span>
                    {tx.additional_info}
                  </div>
                )}
                {tx.raw_name && tx.raw_name !== tx.third_party_name && (
                  <div>
                    <span className="text-gray-500">Raw name: </span>
                    {tx.raw_name}
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Value date: </span>
                  {tx.value_date}
                </div>
                <div>
                  <span className="text-gray-500">Account: </span>
                  {tx.account_name} ({tx.account_iban})
                </div>

                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  {tx.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tx.id, tag)}
                        className="text-blue-400 hover:text-blue-700"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Add tag"
                      value={tagInput[tx.id] || ''}
                      onChange={(e) =>
                        setTagInput((prev) => ({ ...prev, [tx.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && addTag(tx.id)}
                      className="border rounded px-2 py-0.5 text-xs w-24"
                    />
                    <button
                      onClick={() => addTag(tx.id)}
                      className="text-xs bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
