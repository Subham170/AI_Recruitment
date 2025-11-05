import Application from '../models/Application.model.js';

// Create application
export const createApplication = async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      candidate: req.user.id
    };
    const application = await Application.create(applicationData);
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all applications
export const getApplications = async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('candidate', 'name email')
      .populate('job', 'title company');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get application by ID
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('candidate', 'name email')
      .populate('job', 'title company');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update application
export const updateApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete application
export const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findByIdAndDelete(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get my applications (Candidate)
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user.id })
      .populate('job', 'title company location');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get applications by job (Recruiter)
export const getApplicationsByJob = async (req, res) => {
  try {
    const applications = await Application.find({ job: req.params.jobId })
      .populate('candidate', 'name email');
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

