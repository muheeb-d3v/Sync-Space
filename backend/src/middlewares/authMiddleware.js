import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { customErrorResponse } from "../utils/common/responseObjects.js";

export const isAuthenticated = async (req, res, next) => {
    const token = req.headers["x-access-token"];

    if (!token) {
        return res.status(StatusCodes.FORBIDDEN).json(
            customErrorResponse({
                explanation: "Invalid data sent from the client",
                message: "Access denied. No token provided.",
            })
        );
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach user data to request object
        next();
    } catch {
        return res.status(StatusCodes.UNAUTHORIZED).json(
            customErrorResponse({
                explanation: "Invalid or expired token",
                message: "Authentication failed",
            })
        );
    }
};

/**
 * LIKE isAuthenticated, but the JWT may also arrive via `?token=` or
 * `Authorization: Bearer`. Needed ONLY for file endpoints: browsers cannot
 * attach custom headers to <img>/<video>/iframe GET requests, so inline
 * previews would fail with 403 (the original cause of broken chat images).
 */
export const isAuthenticatedForFiles = async (req, res, next) => {
    const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token =
        req.headers['x-access-token'] || bearer || req.query?.token || '';

    if (!token) {
        return res.status(StatusCodes.FORBIDDEN).json(
            customErrorResponse({
                explanation: 'Invalid data sent from the client',
                message: 'Access denied. No token provided.',
            })
        );
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(StatusCodes.UNAUTHORIZED).json(
            customErrorResponse({
                explanation: 'Invalid or expired token',
                message: 'Authentication failed',
            })
        );
    }
};

