import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/respond.js';
import * as userService from './service.js';
import { changePasswordSchema, updateProfileSchema } from './dto.js';

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get(
  '/me',
  asyncHandler(async (req, res) => ok(res, await userService.getProfile(req.user!.id))),
);

userRoutes.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(async (req, res) => ok(res, await userService.updateProfile(req.user!.id, req.body))),
);

userRoutes.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  asyncHandler(async (req, res) =>
    ok(res, await userService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword)),
  ),
);
