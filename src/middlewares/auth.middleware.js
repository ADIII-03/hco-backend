import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Admin from "../models/admin.model.js";

// Ensure JWT_SECRET is properly loaded
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_1234567890!@';

if (!JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not configured");
  process.exit(1);
}

const isAuthenticated = asyncHandler(async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header or cookies
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, "Please login to access this resource");
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get admin without sensitive fields
    const admin = await Admin.findById(decoded._id).select("-password -refreshToken");
    
    if (!admin) {
      throw new ApiError(401, "Invalid token or admin not found");
    }

    req.user = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError(401, "Invalid token");
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, "Token has expired");
    }
    throw error;
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Please login first");
  }

  if (!req.user.role || !['admin', 'superadmin'].includes(req.user.role.toLowerCase())) {
    throw new ApiError(403, "Access denied. Admin privileges required.");
  }

  next();
});

export { isAuthenticated, isAdmin };
