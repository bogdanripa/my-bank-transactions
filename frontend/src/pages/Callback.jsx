import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { requisitions } from '../api';

export default function Callback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const ref = params.get('ref');
    if (ref) {
      requisitions
        .complete(ref)
        .then(() => navigate('/accounts'))
        .catch(() => navigate('/accounts'));
    } else {
      navigate('/accounts');
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Completing bank connection...</div>
    </div>
  );
}
