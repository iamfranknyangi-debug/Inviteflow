// ============================================================
//  LoginPage.jsx
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { register, handleSubmit, formState:{ errors } } = useForm();
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="big-icon">✉</div>
          <h1>InviteFlow</h1>
          <p>Digital Invitation Management System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input className="form-input" placeholder="admin"
              {...register('username', { required: 'Username is required' })} />
            {errors.username && <span style={{ color:'var(--danger)', fontSize:12 }}>{errors.username.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="••••••••"
              {...register('password', { required: 'Password is required' })} />
            {errors.password && <span style={{ color:'var(--danger)', fontSize:12 }}>{errors.password.message}</span>}
          </div>

          <div style={{ fontSize:12, color:'var(--text3)' }}>
            Demo: admin / admin123
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ justifyContent:'center', padding:'11px', width:'100%' }}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}
