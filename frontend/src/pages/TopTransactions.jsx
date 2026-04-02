import { useState, useEffect } from 'react';
import { transactions } from '../api';
import { Link } from 'react-router-dom';

function formatAmount(amount, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount);
}

export default function TopTransactions() {
  const [data, setData] = useState([]);
  const [direction, setDirection] = useState('');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    transactions
      .top({ direction: direction || undefined, limit })
      .then(setData)
      .catch(console.error);
  }, [direction, limit]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Top Transactions by Value</h1>

      <div className="flex gap-3 items-center">
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All</option>
          <option value="out">Payments (outgoing)</option>
          <option value="in">Income (incoming)</option>
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="border rounded px-3 py-2"
        >
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
          <option value={100}>Top 100</option>
        </select>
      </div>

      <div className="space-y-1">
        {data.map((tx, idx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between border rounded p-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm w-6 text-right">
                {idx + 1}.
              </span>
              <div>
                <div className="font-medium">
                  {tx.third_party_name || tx.raw_name || 'Unknown'}
                  {tx.third_party_id && (
                    <Link
                      to={`/third-parties?id=${tx.third_party_id}`}
                      className="text-blue-600 text-xs ml-2 hover:underline"
                    >
                      view
                    </Link>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {tx.booking_date} - {tx.institution_name} / {tx.account_name}
                </div>
              </div>
            </div>
            <span
              className={`font-mono font-semibold ${
                tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatAmount(tx.amount, tx.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
