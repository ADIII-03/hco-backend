import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Admin from "../models/admin.model.js";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not configured");
  process.exit(1);
}

// Middleware to verify authentication
const isAuthenticated = asyncHandler(async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header or cookies
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new ApiError(401, "Authentication required. Please login.");
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch admin without sensitive fields
    const admin = await Admin.findById(decoded._id).select("-password -refreshToken");

    if (!admin) {
      throw new ApiError(401, "Invalid authentication token");
    }

    req.user = admin;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new ApiError(401, "Invalid authentication token");
    }
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Authentication token has expired");
    }
    throw error;
  }
});

// Middleware to verify admin role
const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }

  if (!req.user.role || !["admin", "superadmin"].includes(req.user.role.toLowerCase())) {
    throw new ApiError(403, "Access denied. Admin privileges required.");
  }

  next();
});

export { isAuthenticated, isAdmin };
