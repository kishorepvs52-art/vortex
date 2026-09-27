import type { Request, Response } from 'express';
import { REFRESH_COOKIE } from '../../config/constants.js';
import { ApiError } from '../../utils/apiError.js';
import { ok, created } from '../../utils/respond.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  clearRefreshCookie,
  rotateRefreshToken,
  setRefreshCookie,
} from '../../services/tokenService.js';
import * as authService from './service.js';
import { sanitizeUser } from './service.js';
import type { loginSchema, refreshSchema, registerSchema } from './dto.js';
import type { z } from 'zod';

type RegisterBody = z.infer<typeof registerSchema>;
type LoginBody = z.infer<typeof loginSchema>;
type RefreshBody = z.infer<typeof refreshSchema>;

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body as RegisterBody);
  if (result.pendingApproval) {
    return created(res, {
      pendingApproval: true,
      message: 'Expert registration received. An admin will review and approve your account shortly.',
      user: result.user,
    });
  }
  setRefreshCookie(res, result.tokens!.refreshToken);
  created(res, {
    pendingApproval: false,
    user: result.user,
    accessToken: result.tokens!.accessToken,
    refreshToken: result.tokens!.refreshToken,
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginBody;
  const { user, tokens } = await authService.login(email, password, req.headers['user-agent']);
  setRefreshCookie(res, tokens.refreshToken);
  ok(res, { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = (req.body as RefreshBody).refreshToken ?? (req.cookies?.[REFRESH_COOKIE] as string | undefined);
  if (!raw) throw ApiError.unauthorized('REFRESH_MISSING', 'No refresh token provided');

  const { user, tokens } = await rotateRefreshToken(raw, req.headers['user-agent']);
  setRefreshCookie(res, tokens.refreshToken);
  ok(res, { user: sanitizeUser(user), accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const raw =
    ((req.body as RefreshBody | undefined)?.refreshToken as string | undefined) ??
    (req.cookies?.[REFRESH_COOKIE] as string | undefined);
  await authService.logout(raw);
  clearRefreshCookie(res);
  ok(res, { message: 'Signed out successfully' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  ok(res, await authService.getMe(req.user!.id));
});
