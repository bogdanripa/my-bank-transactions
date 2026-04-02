import { useState, useEffect, useCallback } from 'react';
import { thirdParties, transactions } from '../api';
import { useSearchParams } from 'react-router-dom';

function formatAmount(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export default function ThirdParties() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total');
  const [selected, setSelected] = useState([]);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [tagInput, setTagInput] = useState({});
  const [detail, setDetail] = useState(null);
  const [detailTxs, setDetailTxs] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await thirdParties.list({
        search: search || undefined,
        sort_by: sortBy,
        limit: 200,
      });
      setData(result);
    } catch (err) {
      console.error(err);
    }
  }, [search, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-open detail if ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) showDetail(parseInt(id));
  }, [searchParams]);

  async function showDetail(id) {
    try {
      const tp = await thirdParties.get(id);
      const summary = await transactions.thirdPartySummary(id);
      const txs = await transactions.list({ third_party_id: id, limit: 200 });
      setDetail({ ...tp, ...summary });
      setDetailTxs(txs.transactions);
    } catch (err) {
      console.error(err);
    }
  }

  async function rename(id) {
    if (!renameValue.trim()) return;
    await thirdParties.rename(id, renameValue.trim());
    setRenaming(null);
    load();
    if (detail?.id === id) showDetail(id);
  }

  async function merge() {
    if (!mergeTarget || selected.length === 0) return;
    const sourceIds = selected.filter((id) => id !== mergeTarget);
    if (sourceIds.length === 0) return;
    await thirdParties.merge(mergeTarget, sourceIds);
    setSelected([]);
    setMergeTarget(null);
    load();
  }

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function addTag(tpId) {
    const tag = tagInput[tpId];
    if (!tag) return;
    await thirdParties.addTag(tpId, tag);
    setTagInput((prev) => ({ ...prev, [tpId]: '' }));
    load();
  }

  async function removeTag(tpId, tagName) {
    await thirdParties.removeTag(tpId, tagName);
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Third Parties</h1>

      {/* Detail view */}
      {detail && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">{detail.display_name}</h2>
            <button
              onClick={() => { setDetail(null); setDetailTxs(null); }}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
            <div>
              <div className="text-gray-500">Transactions</div>
              <div className="font-semibold">{detail.count}</div>
            </div>
            <div>
              <div className="text-gray-500">Total Paid</div>
              <div className="font-semibold text-red-600">
                {formatAmount(detail.total_paid || 0)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total Received</div>
              <div className="font-semibold text-green-600">
                {formatAmount(detail.total_received || 0)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Period</div>
              <div className="font-semibold text-xs">
                {detail.first_transaction} to {detail.last_transaction}
              </div>
            </div>
          </div>
          {detail.aliases?.length > 1 && (
            <div className="text-xs text-gray-500 mb-2">
              Aliases: {detail.aliases.join(', ')}
            </div>
          )}
          {detailTxs && (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {detailTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between bg-white rounded p-2 text-sm"
                >
                  <div>
                    <span>{tx.booking_date}</span>
                    <span className="text-gray-500 ml-2">
                      {tx.remittance_info || tx.additional_info || ''}
                    </span>
                  </div>
                  <span
                    className={`font-mono ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatAmount(tx.amount, tx.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search and sort */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search third parties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="total">By total amount</option>
          <option value="transaction_count">By transaction count</option>
          <option value="display_name">By name</option>
        </select>
      </div>

      {/* Merge controls */}
      {selected.length >= 2 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 flex items-center gap-3">
          <span className="text-sm">{selected.length} selected for merge.</span>
          <select
            value={mergeTarget || ''}
            onChange={(e) => setMergeTarget(parseInt(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">Select target...</option>
            {selected.map((id) => {
              const tp = data.find((t) => t.id === id);
              return (
                <option key={id} value={id}>
                  {tp?.display_name}
                </option>
              );
            })}
          </select>
          <button
            onClick={merge}
            disabled={!mergeTarget}
            className="bg-yellow-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          >
            Merge
          </button>
          <button
            onClick={() => { setSelected([]); setMergeTarget(null); }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {data.map((tp) => (
          <div
            key={tp.id}
            className={`border rounded p-3 ${
              selected.includes(tp.id) ? 'border-yellow-400 bg-yellow-50' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(tp.id)}
                onChange={() => toggleSelect(tp.id)}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {renaming === tp.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && rename(tp.id)}
                        className="border rounded px-2 py-0.5 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => rename(tp.id)}
                        className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenaming(null)}
                        className="text-xs text-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => showDetail(tp.id)}
                        className="font-medium hover:text-blue-600 text-left"
                      >
                        {tp.display_name}
                      </button>
                      <button
                        onClick={() => {
                          setRenaming(tp.id);
                          setRenameValue(tp.display_name);
                        }}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        rename
                      </button>
                    </>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {tp.transaction_count} transactions
                  {tp.aliases?.length > 1 && ` | ${tp.aliases.length} aliases`}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {tp.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tp.id, tag)}
                        className="text-purple-400 hover:text-purple-700"
                      >
                        x
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="tag"
                      value={tagInput[tp.id] || ''}
                      onChange={(e) =>
                        setTagInput((prev) => ({ ...prev, [tp.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && addTag(tp.id)}
                      className="border rounded px-2 py-0.5 text-xs w-20"
                    />
                    <button
                      onClick={() => addTag(tp.id)}
                      className="text-xs bg-gray-200 px-1.5 py-0.5 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-red-600">
                  Paid: {formatAmount(tp.total_paid)}
                </div>
                <div className="text-xs text-green-600">
                  Received: {formatAmount(tp.total_received)}
                </div>
                <div className="font-mono font-semibold text-sm">
                  Net: {formatAmount(tp.net_amount)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
