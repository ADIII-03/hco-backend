import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema({
  projectTitle: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true
  },
  projectIndex: {
    type: Number,
    required: [true, 'Project index is required'],
    min: [0, 'Project index must be non-negative'],
    validate: {
      validator: Number.isInteger,
      message: 'Project index must be an integer'
    }
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required'],
    trim: true
  },
  publicId: {
    type: String,
    required: [true, 'Cloudinary public ID is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  metadata: {
    size: Number,
    format: String,
    width: Number,
    height: Number
  }
}, {
  timestamps: true
});

// Index for faster queries
gallerySchema.index({ projectIndex: 1, uploadedAt: -1 });
gallerySchema.index({ publicId: 1 }, { unique: true });

export const Gallery = mongoose.model('Gallery', gallerySchema);
