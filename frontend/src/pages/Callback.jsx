import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requisitions } from '../api';

export default function Callback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState('Processing bank authorization...');

  useEffect(() => {
    const code = params.get('code');
    const reqId = localStorage.getItem('pending_requisition_id');

    if (code && reqId) {
      localStorage.removeItem('pending_requisition_id');
      setStatus('Connecting your accounts...');
      requisitions
        .complete(reqId, code)
        .then(() => {
          setStatus('Success! Redirecting...');
          navigate('/accounts');
        })
        .catch((err) => {
          setStatus(`Error: ${err.message}. Redirecting...`);
          setTimeout(() => navigate('/accounts'), 3000);
        });
    } else {
      setStatus('Missing authorization code. Redirecting...');
      setTimeout(() => navigate('/accounts'), 2000);
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">{status}</div>
    </div>
  );
}
