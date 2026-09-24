import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Invalid email');

// login = email (admin/ceo/main_admin/mentor) ИЛИ логин-код (parent/student)
export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Login is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email,
});

export const resetPasswordSchema = z.object({
  email,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const qrLoginSchema = z.object({
  token: z.string().trim().min(1, 'token is required'),
});

/* Смена своего пароля работником. Минимум 8 символов — тот же порог, что у
   resetPasswordSchema выше; разойдись они, и сброс по почте позволял бы
   поставить пароль, который смена запрещает. */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
