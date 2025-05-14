import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Admin schema with role management
const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please use a valid email address'], // Email validation regex
    },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 4, // Minimum length for username
    },
    password: {
      type: String,
      required: true,
      minlength: 8, // Minimum length for password
    },
    refreshToken: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['admin', 'superadmin', 'moderator'], // You can add other roles as needed
      default: 'admin', // Default to 'admin'
    },
  },
  { timestamps: true }
);

// 🔒 Hash password before saving
adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Compare password
adminSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ✅ Generate Access Token
adminSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: this.role, // Using role instead of isAdmin
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// ✅ Generate Refresh Token
adminSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
