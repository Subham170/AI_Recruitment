import mongoose from "mongoose";
import Candidate from "../candidates/model.js";
import JobPosting from "../job_posting/model.js";
import CandidateProgress from "./model.js";

const STAGES = ["applied", "screening", "interviews", "offer"];
const ALL_STAGES = [...STAGES, "rejected"];

const normalizeId = (id) => {
  if (!id) return null;
  if (id._id) return id._id.toString();
  return id.toString();
};

const formatCandidateProgress = (doc, candidateEntry) => {
  if (!candidateEntry) return null;
  return {
    jobPostingId: doc.jobPostingId,
    candidateId: candidateEntry.candidateId?._id || candidateEntry.candidateId,
    applied: candidateEntry.applied,
    screening: candidateEntry.screening,
    interviews: candidateEntry.interviews,
    offer: candidateEntry.offer,
    rejected: candidateEntry.rejected,
    updatedBy: candidateEntry.updatedBy,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
};

const ensureJobProgress = async (jobPostingId) => {
  let doc = await CandidateProgress.findOne({ jobPostingId })
    .populate("candidates.candidateId", "name email phone_no role experience")
    .exec();

  if (!doc) {
    doc = await CandidateProgress.create({ jobPostingId, candidates: [] });
    doc = await CandidateProgress.findById(doc._id)
      .populate("candidates.candidateId", "name email phone_no role experience")
      .exec();
  }

  return doc;
};

const ensureCandidateEntry = (doc, candidateId, userId) => {
  const targetId = normalizeId(candidateId);
  let entry = doc.candidates.find(
    (c) => normalizeId(c.candidateId) === targetId
  );

  if (!entry) {
    entry = {
      candidateId: mongoose.Types.ObjectId.isValid(candidateId)
        ? new mongoose.Types.ObjectId(candidateId)
        : candidateId,
      applied: { status: "completed", completedAt: new Date(), notes: "" },
      screening: { status: "pending", completedAt: null, notes: "" },
      interviews: { status: "pending", completedAt: null, notes: "" },
      offer: { status: "pending", completedAt: null, notes: "" },
      rejected: {
        status: "pending",
        completedAt: null,
        notes: "",
        rejectedAt: null,
      },
      updatedBy: userId,
    };
    doc.candidates.push(entry);
  }

  return entry;
};

const validateStageHierarchy = (currentEntry, stage, status) => {
  if (stage === "rejected") return { valid: true };
  if (status === "completed") {
    const idx = STAGES.indexOf(stage);
    for (let i = 0; i < idx; i++) {
      const prev = STAGES[i];
      if (currentEntry[prev]?.status !== "completed") {
        return {
          valid: false,
          message: `Cannot mark ${stage} as completed. Please complete ${prev} first.`,
        };
      }
    }
  }
  return { valid: true };
};

// Get or create progress for a candidate within a job
export const getOrCreateProgress = async (req, res) => {
  try {
    const { candidateId, jobPostingId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(candidateId) ||
      !mongoose.Types.ObjectId.isValid(jobPostingId)
    ) {
      return res.status(400).json({
        message: "Invalid candidate or job posting ID",
      });
    }

    const candidate = await Candidate.findById(candidateId);
    const jobPosting = await JobPosting.findById(jobPostingId);

    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    if (!jobPosting) {
      return res.status(404).json({ message: "Job posting not found" });
    }

    const doc = await ensureJobProgress(jobPostingId);
    const entry = ensureCandidateEntry(doc, candidateId, req.user?.id);
    doc.markModified("candidates");
    await doc.save();

    const response = formatCandidateProgress(doc, entry);
    res.json({ progress: response });
  } catch (error) {
    console.error("Error getting/creating progress:", error);
    res.status(500).json({
      message: error.message || "Failed to get candidate progress",
    });
  }
};

// Update a specific stage for a candidate within a job
export const updateStage = async (req, res) => {
  try {
    const { candidateId, jobPostingId, stage } = req.params;
    const { status, notes } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(candidateId) ||
      !mongoose.Types.ObjectId.isValid(jobPostingId)
    ) {
      return res.status(400).json({
        message: "Invalid candidate or job posting ID",
      });
    }

    if (!ALL_STAGES.includes(stage)) {
      return res.status(400).json({
        message: `Invalid stage. Must be one of: ${ALL_STAGES.join(", ")}`,
      });
    }

    if (status && !["pending", "completed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be 'pending' or 'completed'",
      });
    }

    const doc = await ensureJobProgress(jobPostingId);
    const entry = ensureCandidateEntry(doc, candidateId, req.user?.id);

    const validation = validateStageHierarchy(entry, stage, status);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    entry[stage].status = status || entry[stage].status;
    if (notes !== undefined) {
      entry[stage].notes = notes;
    }

    if (status === "completed" && !entry[stage].completedAt) {
      entry[stage].completedAt = new Date();
    }

    if (stage === "rejected" && status === "completed") {
      entry.rejected.rejectedAt = new Date();
    }

    if (status === "pending" && entry[stage].completedAt) {
      entry[stage].completedAt = null;
      if (stage === "rejected") {
        entry.rejected.rejectedAt = null;
      }

      if (stage !== "rejected") {
        const currentStageIndex = STAGES.indexOf(stage);
        for (let i = currentStageIndex + 1; i < STAGES.length; i++) {
          const subsequentStage = STAGES[i];
          if (entry[subsequentStage]?.status === "completed") {
            entry[subsequentStage].status = "pending";
            entry[subsequentStage].completedAt = null;
            entry[subsequentStage].notes = "";
          }
        }
      }
    }

    entry.updatedBy = req.user?.id;
    doc.markModified("candidates");
    await doc.save();

    const response = formatCandidateProgress(doc, entry);
    res.json({
      message: `${stage} stage updated successfully`,
      progress: response,
    });
  } catch (error) {
    console.error("Error updating stage:", error);
    res.status(500).json({
      message: error.message || "Failed to update stage",
    });
  }
};

// Get all progress records for a job posting
export const getProgressByJob = async (req, res) => {
  try {
    const { jobPostingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(jobPostingId)) {
      return res.status(400).json({
        message: "Invalid job posting ID",
      });
    }

    const doc = await ensureJobProgress(jobPostingId);
    // Deduplicate candidates (in case legacy duplicates exist)
    const seen = new Set();
    const unique = [];
    doc.candidates.forEach((c) => {
      const cid = normalizeId(c.candidateId);
      if (!seen.has(cid)) {
        seen.add(cid);
        unique.push(c);
      }
    });
    if (unique.length !== doc.candidates.length) {
      doc.candidates = unique;
      doc.markModified("candidates");
      await doc.save();
    }
    const formatted = unique.map((c) => formatCandidateProgress(doc, c));

    res.json({ jobPostingId, candidates: formatted });
  } catch (error) {
    console.error("Error getting progress by job:", error);
    res.status(500).json({
      message: error.message || "Failed to get progress records",
    });
  }
};

// Get all progress records for a candidate
export const getProgressByCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({
        message: "Invalid candidate ID",
      });
    }

    const docs = await CandidateProgress.find({
      "candidates.candidateId": candidateId,
    }).populate(
      "candidates.candidateId",
      "name email phone_no role experience"
    );

    const formatted = [];
    docs.forEach((doc) => {
      const target = normalizeId(candidateId);
      const seen = new Set();
      const uniqueEntries = [];
      doc.candidates.forEach((c) => {
        const cid = normalizeId(c.candidateId);
        if (cid === target && !seen.has(cid)) {
          seen.add(cid);
          uniqueEntries.push(c);
        } else if (cid !== target) {
          uniqueEntries.push(c);
        }
      });
      if (uniqueEntries.length !== doc.candidates.length) {
        doc.candidates = uniqueEntries;
        doc.markModified("candidates");
        doc.save().catch(() => {});
      }
      uniqueEntries.forEach((entry) => {
        if (normalizeId(entry.candidateId) === target) {
          const result = formatCandidateProgress(doc, entry);
          if (result) formatted.push(result);
        }
      });
    });

    res.json({ progressList: formatted });
  } catch (error) {
    console.error("Error getting progress by candidate:", error);
    res.status(500).json({
      message: error.message || "Failed to get progress records",
    });
  }
};
