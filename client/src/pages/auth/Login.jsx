import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Smartphone, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { loginUser, clearError } from '../../store/authSlice';
import { Button } from '../../components/common/Button';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().default(false),
});

export const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onSubmit = async (data) => {
    try {
      const resultAction = await dispatch(loginUser(data));
      if (loginUser.fulfilled.match(resultAction)) {
        toast.success(`Welcome back, ${resultAction.payload.user?.full_name}!`);
        navigate('/dashboard');
      }
    } catch (err) {
      // Handled by redux
    }
  };

  const handleFillDemo = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-[var(--spatial-bg-app)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-apple-blue/10 border border-apple-blue/20 text-apple-blue shadow-xs mb-4">
          <Smartphone className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[var(--spatial-text-title)] tracking-tight">
          Mobotech mobile care
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-[var(--spatial-text-muted)]">
          Mobile Repair & Workshop Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="spatial-card py-8 px-6 sm:px-10 rounded-3xl shadow-xl">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--spatial-text-muted)]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@fixitrepair.com"
                  {...register('email')}
                  className={`block w-full pl-10 pr-3.5 py-2.5 spatial-input rounded-xl text-sm transition-all ${
                    errors.email ? 'border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--spatial-text-title)] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--spatial-text-muted)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  className={`block w-full pl-10 pr-10 py-2.5 spatial-input rounded-xl text-sm transition-all ${
                    errors.password ? 'border-rose-500 focus:ring-rose-500/20' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--spatial-text-muted)] hover:text-[var(--spatial-text-title)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('rememberMe')}
                  className="w-4 h-4 text-apple-blue border-[var(--spatial-border)] rounded focus:ring-apple-blue"
                />
                <span className="text-xs text-[var(--spatial-text-muted)] font-medium select-none">Remember this device</span>
              </label>
              <span className="text-xs text-apple-blue font-medium">Single-Shop Portal</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-2.5 text-sm font-semibold rounded-xl active:scale-98 cursor-pointer shadow-xs"
            >
              Sign In to Workshop
            </Button>
          </form>

          {/* Quick Demo Credential Pills */}
          <div className="mt-6 pt-5 border-t border-[var(--spatial-border)]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--spatial-text-muted)] text-center mb-2.5">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@fixitrepair.com', 'Admin@123456')}
                className="p-2 text-center rounded-xl bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-border)]/50 border border-[var(--spatial-border)] text-[11px] font-medium text-[var(--spatial-text-body)] transition-all active:scale-95 cursor-pointer"
              >
                <span className="block font-bold text-apple-blue">Admin</span>
                Owner
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('tech@fixitrepair.com', 'Tech@123456')}
                className="p-2 text-center rounded-xl bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-border)]/50 border border-[var(--spatial-border)] text-[11px] font-medium text-[var(--spatial-text-body)] transition-all active:scale-95 cursor-pointer"
              >
                <span className="block font-bold text-purple-600 dark:text-purple-400">Tech</span>
                Workbench
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('staff@fixitrepair.com', 'Staff@123456')}
                className="p-2 text-center rounded-xl bg-[var(--spatial-bg-card-subtle)] hover:bg-[var(--spatial-border)]/50 border border-[var(--spatial-border)] text-[11px] font-medium text-[var(--spatial-text-body)] transition-all active:scale-95 cursor-pointer"
              >
                <span className="block font-bold text-emerald-600 dark:text-emerald-400">Staff</span>
                Intake / Desk
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
