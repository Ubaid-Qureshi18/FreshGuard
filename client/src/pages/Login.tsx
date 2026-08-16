// Auth-free: redirect directly to dashboard
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/dashboard', { replace: true }); }, [navigate]);
  return null;
}
