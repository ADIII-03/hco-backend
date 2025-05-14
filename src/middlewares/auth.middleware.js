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
  let token;
  
  // Extract token from header, cookie, or body
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  } else if (req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication token missing" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const currentAdmin = await Admin.findById(decoded._id).select("-password -refreshToken");
    
    if (!currentAdmin) {
      return res.status(401).json({ error: "Admin not found - invalid token" });
    }

    req.user = currentAdmin;
    next();
  } catch (error) {
    console.error("Error during token verification:", error);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});


const isAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated");
  }
  
  if (req.user.role?.toLowerCase() !== "admin") {
    throw new ApiError(403, "Access denied. Admins only.");
  }
  
  next();
});

export { isAuthenticated, isAdmin };
