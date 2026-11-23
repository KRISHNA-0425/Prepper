import mongoose from 'mongoose';

/**
 * Sub-schema for individual interview round configurations within a company profile
 */
const companyRoundSchema = new mongoose.Schema({
  roundId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  focusAreas: {
    type: [String],
    default: [],
  },
  recommendedDuration: {
    type: Number,
    default: 45,
  },
  typicalQuestionCount: {
    type: Number,
    default: 5,
  },
  format: {
    type: String,
    enum: ['coding', 'conceptual', 'system_design', 'behavioral', 'mixed'],
    default: 'conceptual',
  },
}, { _id: false });

/**
 * Main CompanyProfile Schema
 * Persists reusable company intelligence, interview rounds, and evaluation expectations.
 */
const companyProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  industry: {
    type: String,
    default: 'Technology & Software',
    trim: true,
  },
  tier: {
    type: String,
    enum: ['Tier 1 Product', 'Enterprise Tech', 'IT Services & Consulting', 'FinTech & Banking', 'Startup / Unicorn'],
    default: 'Tier 1 Product',
  },
  description: {
    type: String,
    default: '',
  },
  logoUrl: {
    type: String,
    default: '',
  },
  interviewCulture: {
    type: String,
    default: '',
  },
  supportedRounds: {
    type: [companyRoundSchema],
    default: [],
  },
  commonCompetencies: {
    type: [String],
    default: [],
  },
  techStackFocus: {
    type: [String],
    default: [],
  },
  behavioralPrinciples: {
    type: [String],
    default: [],
  },
  sampleQuestionThemes: {
    type: [String],
    default: [],
  },
  disclaimer: {
    type: String,
    default: 'Publicly documented interview preparation patterns; not affiliated with official corporate hiring evaluations.',
  },
  isVerified: {
    type: Boolean,
    default: false,
    index: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

companyProfileSchema.index({ slug: 1, isVerified: 1 });

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema);

export default CompanyProfile;
