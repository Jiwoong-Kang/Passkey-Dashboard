import mongoose from 'mongoose';

const linkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    trim: true,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better search performance
linkSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });

// Update timestamp on save
linkSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Link = mongoose.model('Link', linkSchema);

export default Link;
