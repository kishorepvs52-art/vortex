import { Router } from 'express';
import { authLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './controller.js';
import { loginSchema, refreshSchema, registerSchema } from './dto.js';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
authRoutes.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
authRoutes.post('/refresh', validate({ body: refreshSchema }), controller.refresh);
authRoutes.post('/logout', controller.logout);
authRoutes.get('/me', requireAuth, controller.me);
