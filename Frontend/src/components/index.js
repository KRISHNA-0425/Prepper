/**
 * @file Frontend/src/components/index.js
 * Domain-Driven Component Registry for Prepper AI.
 * Organizes frontend UI components into clean domain groupings.
 */

// 1. Common UI & Navigation Components
export { default as Navbar } from './Navbar';
export { default as Timer } from './Timer';
export { default as CapabilityCard } from './CapabilityCard';
export { default as FeatureCard } from './FeatureCard';
export { default as ModeCard } from './ModeCard';
export { default as AuthModel } from './AuthModel';

// 2. Module 4: Live Coding Workspace Components
export { default as CodingWorkspace } from './coding/CodingWorkspace';
export { default as CodingReportSection } from './coding/CodingReportSection';

// 3. Module 2: Dedicated Cross-Examination Components
export { default as QuestionCard } from './cross-examination/QuestionCard';
export { default as AnswerAnalysisCard } from './cross-examination/AnswerAnalysisCard';
export { default as PastSessionsModal } from './cross-examination/PastSessionsModal';
export { default as PreparationGuidance } from './cross-examination/PreparationGuidance';
export { default as SessionProgress } from './cross-examination/SessionProgress';
export { default as SessionSummaryModal } from './cross-examination/SessionSummaryModal';

// 4. Module 5: Personalized Recovery Plan Components
export { default as RecoveryPlanSetupModal } from './recovery/RecoveryPlanSetupModal';
export { default as RecoveryPlanOverview } from './recovery/RecoveryPlanOverview';
export { default as DailyTaskList } from './recovery/DailyTaskList';
export { default as TaskDetailModal } from './recovery/TaskDetailModal';
export { default as ReassessmentModal } from './recovery/ReassessmentModal';
