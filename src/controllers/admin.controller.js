import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Admin from "../models/admin.model.js";

// Generate access and refresh tokens
const generateAccessAndRefreshToken = async (adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    const accessToken = admin.generateAccessToken();
    const refreshToken = admin.generateRefreshToken();

    admin.refreshToken = refreshToken;
    await admin.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};

// Admin Login
const adminLogin = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, "Email and password are required");
    }

    // Find admin and include password for verification
    const admin = await Admin.findOne({ email }).select("+password");
    if (!admin) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(admin._id);

    // Get admin data without sensitive fields
    const loggedInAdmin = await Admin.findById(admin._id).select("-password -refreshToken");

    // Set cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
      path: "/"
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
        }, "Login successful")
      );
  } catch (error) {
    console.error("Login error:", error);
    throw new ApiError(error.statusCode || 500, error.message || "Login failed");
  }
});

// Admin Logout
const adminLogout = asyncHandler(async (req, res) => {
  try {
    // Update admin in database
    await Admin.findByIdAndUpdate(
      req.user._id,
      {
        $unset: { refreshToken: 1 }
      }
    );

    // Clear cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      domain: process.env.NODE_ENV === "production" ? ".onrender.com" : undefined,
      path: "/"
    };

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json(new ApiResponse(200, {}, "Logged out successfully"));
  } catch (error) {
    throw new ApiError(500, "Error during logout");
  }
});

// Admin Register (protected, only for development)
const adminRegister = asyncHandler(async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new ApiError(400, "All fields are required");
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      throw new ApiError(409, "Admin already exists with this email");
    }

    // Create new admin
    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password
    });

    const createdAdmin = await Admin.findById(admin._id).select("-password -refreshToken");
    if (!createdAdmin) {
      throw new ApiError(500, "Error while creating admin");
    }

    return res.status(201).json(
      new ApiResponse(201, createdAdmin, "Admin registered successfully")
    );
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message || "Registration failed");
  }
});

export { adminLogin, adminLogout, adminRegister };
