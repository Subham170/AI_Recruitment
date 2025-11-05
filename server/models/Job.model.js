import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a job title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide a job description']
  },
  company: {
    type: String,
    required: [true, 'Please provide a company name'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Please provide a location'],
    trim: true
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    default: 'full-time'
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  requirements: {
    experience: String,
    education: String,
    skills: [String]
  },
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active'
  },
  applicationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const Job = mongoose.model('Job', jobSchema);

export default Job;

