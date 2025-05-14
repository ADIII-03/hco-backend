import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Admin from "../models/admin.model.js";
import jwt from "jsonwebtoken";

// Generate access and refresh tokens
const generateAccessAndRefreshToken = async (adminId) => {
  const admin = await Admin.findById(adminId);
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const accessToken = admin.generateAccessToken();
  const refreshToken = admin.generateRefreshToken();

  admin.refreshToken = refreshToken;
  await admin.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// Admin Login
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // Find admin by email
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Verify password
  const isPasswordValid = await admin.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(admin._id);

  // Get admin data without sensitive fields
  const loggedInAdmin = await Admin.findById(admin._id).select("-password -refreshToken");

  // Set cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  // Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, {
        user: loggedInAdmin,
        accessToken,
        refreshToken
      }, "Admin logged in successfully")
    );
});

// Admin Logout
const adminLogout = asyncHandler(async (req, res) => {
  await Admin.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 }
    },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict"
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Admin logged out successfully"));
});

// Admin Register (protected, only for development)
const adminRegister = asyncHandler(async (req, res) => {
  const { name, email, username, password, role = "admin" } = req.body;

  if (!name || !email || !username || !password) {
    throw new ApiError(400, "All fields are required");
  }

  // Check if admin already exists
  const existingAdmin = await Admin.findOne({
    $or: [{ email }, { username }]
  });

  if (existingAdmin) {
    throw new ApiError(409, "Admin with this email or username already exists");
  }

  // Create new admin
  const admin = await Admin.create({
    name,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    role
  });

  // Get created admin without sensitive fields
  const createdAdmin = await Admin.findById(admin._id).select("-password -refreshToken");

  if (!createdAdmin) {
    throw new ApiError(500, "Something went wrong while registering the admin");
  }

  return res.status(201).json(
    new ApiResponse(201, createdAdmin, "Admin registered successfully")
  );
});

export { adminLogin, adminLogout, adminRegister };
