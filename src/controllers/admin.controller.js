import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Admin from "../models/admin.model.js"; // Correctly use Admin (capital 'A')
import jwt from "jsonwebtoken";

// Reuse your existing token generator
const generateAccessAndRefreshToken = async (adminId) => {
  const currentAdmin = await Admin.findById(adminId); // Correctly use Admin (capital 'A')
  if (!currentAdmin) {
    throw new Error("Admin not found");
  }

  const accessToken = currentAdmin.generateAccessToken(); // Assuming this method exists
  const refreshToken = currentAdmin.generateRefreshToken(); // Assuming this method exists

  currentAdmin.refreshToken = refreshToken;
  await currentAdmin.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

// ✅ Admin Login
const adminLogin = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }

  const currentAdmin = await Admin.findOne({ // Correctly use Admin (capital 'A')
    $or: [{ email }, { username }],
  });

  if (!currentAdmin) {
    throw new ApiError(404, "Admin not found");
  }

  const isPasswordCorrect = await currentAdmin.comparePassword(password); // Assuming comparePassword exists
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(currentAdmin._id);

  const adminUser = await Admin.findById(currentAdmin._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: adminUser, accessToken},
        "Admin logged in successfully"
      )
    );
});

// ✅ Admin Logout
const adminLogout = asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    throw new ApiError(401, "Only admin can logout here");
  }

  await Admin.findByIdAndUpdate(req.user._id, { // Correctly use Admin (capital 'A')
    $unset: { refreshToken: 1 },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  res.clearCookie("refreshToken", cookieOptions);
  res.clearCookie("accessToken", cookieOptions);

  return res.status(200).json(new ApiResponse(200, {}, "Admin logged out successfully"));
});

const adminRegister = asyncHandler(async (req, res) => {
  const { name, email, username, password, role } = req.body;

  if (!name || !email || !username || !password) {
    throw new ApiError(400, "Please provide all required fields");
  }

  // Check if an admin already exists with the same email or username
  const existingAdmin = await Admin.findOne({
    $or: [{ email }, { username }],
  });

  if (existingAdmin) {
    throw new ApiError(400, "Admin with this email or username already exists");
  }

  // Default role to 'admin', or use the role passed from the request
  const newAdmin = new Admin({
    name,
    email,
    username,
    password,
    role: role || 'admin', // Default to 'admin' if no role provided
  });

  // Save the new admin to the database
  await newAdmin.save();

  // Generate tokens for the new admin
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(newAdmin._id);

  const adminUser = await Admin.findById(newAdmin._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
  };

  return res.status(201).cookie("refreshToken", refreshToken, cookieOptions).json(
    new ApiResponse(201, { user: adminUser, accessToken, refreshToken }, "Admin registered successfully")
  );
});


export { adminLogin, adminLogout, adminRegister };
