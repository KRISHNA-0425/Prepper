/**
 * @file Frontend/src/pages/index.js
 * Domain-Driven Page Registry for Prepper AI.
 * Organizes route pages by module and feature domain.
 */

// 1. Core Platform & Account Management
export { default as Home } from './Home';
export { default as Auth } from './Auth';
export { default as Pricing } from './Pricing';
export { default as InterViewHistory } from './InterViewHistory';

// 2. Module 1: Conversational Mock Interview
export { default as Step1Setup } from './Step1Setup';
export { default as Step2Interview } from './Step2Interview';
export { default as Step3Report } from './Step3Report';
export { default as InterviewPage } from './InterviewPage';
export { default as InterviewReport } from './InterviewReport';

// 3. Module 2: Dedicated Cross-Examination & Probing
export { default as CrossExaminationSetup } from './CrossExaminationSetup';
export { default as CrossExaminationSession } from './CrossExaminationSession';

// 4. Module 4: Live Coding Workspace
export { default as CodingSetup } from './CodingSetup';
export { default as CodingSessionPage } from './CodingSessionPage';

// 5. Module 5: Personalized Interview Recovery Plan
export { default as RecoveryPlansListPage } from './RecoveryPlansListPage';
export { default as RecoveryPlanDashboard } from './RecoveryPlanDashboard';

// 6. Module 6: Company-Specific Interview Simulation
export { default as CompanyInterviewSetup } from './CompanyInterviewSetup';
export { default as CompanyInterviewSession } from './CompanyInterviewSession';
export { default as CompanyInterviewReport } from './CompanyInterviewReport';
export { default as CompanyInterviewHistory } from './CompanyInterviewHistory';

// 7. Module 7: AI Resume-to-Job ATS & Application Intelligence
export { default as AtsDashboard } from './AtsDashboard';
export { default as AtsSetupPage } from './AtsSetupPage';
export { default as AtsAnalysisReport } from './AtsAnalysisReport';
export { default as AtsHistoryPage } from './AtsHistoryPage';


