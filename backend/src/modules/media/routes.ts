// Signed media delivery — streams stored images/thumbnails.
// Capability-based: the HMAC-signed expiring URL is only issued to
// authorised viewers (embedded in payloads they may access).
import { Router } from 'express';
import fs from 'node:fs';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/apiError.js';
import { storage } from '../../storage/local.provider.js';
import { verifyMediaSignature } from '../../services/mediaSigner.js';

export const mediaRoutes = Router();

mediaRoutes.get(
  '/:key',
  asyncHandler(async (req, res) => {
    const { exp, sig } = req.query as { exp?: string; sig?: string };
    if (!exp || !sig) throw ApiError.badRequest('MEDIA_PARAMS_MISSING', 'Missing exp/sig parameters');

    const storageKey = verifyMediaSignature(req.params.key, exp, sig);
    const absPath = storage.getLocalPath(storageKey);
    if (!absPath) throw ApiError.notFound('MEDIA_NOT_FOUND', 'Image not found');

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    fs.createReadStream(absPath).pipe(res);
  }),
);
