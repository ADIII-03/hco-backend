import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import Admin from "../models/admin.model.js";

// Ensure JWT_SECRET is properly loaded
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("❌ FATAL: JWT_SECRET is not configured");
  process.exit(1);
}

const isAuthenticated = asyncHandler(async (req, res, next) => {
  try {
    let token;
    
    // Extract token from header, cookie, or body
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
    
    // Get admin without sensitive fields
    const admin = await Admin.findById(decoded._id).select("-password -refreshToken");
    
    if (!admin) {
      throw new ApiError(401, "Invalid authentication token");
    }

    // Attach admin to request
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

const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required");
  }
  
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin privileges required.");
  }
  
  next();
});

export { isAuthenticated, isAdmin };
