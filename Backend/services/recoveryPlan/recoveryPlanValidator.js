/**
 * Validates and sanitizes structured recovery plan output from AI or fallback generators.
 */

const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const VALID_CATEGORIES = ['theory', 'coding_practice', 'system_design', 'mock_drill', 'revision'];

export const validateRecoveryPlanData = ({
  rawPlan,
  harvestedData,
  scheduleDurationDays,
  dailyStudyMinutes,
}) => {
  const errors = [];

  if (!rawPlan || typeof rawPlan !== 'object') {
    return {
      isValid: false,
      planData: null,
      errors: ['Plan data must be a valid non-null object'],
    };
  }

  // 1. Overall assessment check
  const overallAssessment = typeof rawPlan.overallAssessment === 'string' && rawPlan.overallAssessment.trim().length > 20
    ? rawPlan.overallAssessment.trim()
    : `Personalized ${scheduleDurationDays}-day recovery program tailored for ${harvestedData.targetRole} based on evaluated interview performance.`;

  // 2. Build weakness lookup map for evidence preservation
  const weaknessMap = new Map();
  if (Array.isArray(harvestedData.weaknesses)) {
    harvestedData.weaknesses.forEach((w) => {
      weaknessMap.set(w.weaknessId, w);
      if (w.topic) weaknessMap.set(w.topic.toLowerCase(), w);
    });
  }

  // 3. Validate & sanitize tasks
  const rawTasks = Array.isArray(rawPlan.tasks) ? rawPlan.tasks : [];
  if (rawTasks.length === 0) {
    errors.push('Recovery plan must contain at least one task');
  }

  const sanitizedTasks = [];
  const coveredDays = new Set();
  const taskIds = new Set();

  rawTasks.forEach((t, idx) => {
    const day = Number.isInteger(t.dayNumber) && t.dayNumber >= 1 && t.dayNumber <= scheduleDurationDays
      ? t.dayNumber
      : Math.min(Math.max(1, Math.ceil((idx + 1) / Math.max(1, Math.ceil(rawTasks.length / scheduleDurationDays)))), scheduleDurationDays);

    coveredDays.add(day);

    let taskId = (t.taskId || `task_d${day}_${idx + 1}`).trim();
    if (taskIds.has(taskId)) {
      taskId = `${taskId}_${idx + 1}`;
    }
    taskIds.add(taskId);

    const title = typeof t.title === 'string' && t.title.trim().length > 3
      ? t.title.trim()
      : `Day ${day} Study & Practice Session`;

    const description = typeof t.description === 'string' && t.description.trim().length > 10
      ? t.description.trim()
      : `Structured learning exercise addressing core competency requirements for Day ${day}.`;

    const priority = VALID_PRIORITIES.includes(t.priority) ? t.priority : 'medium';
    const difficulty = VALID_DIFFICULTIES.includes(t.difficulty) ? t.difficulty : 'intermediate';
    const category = VALID_CATEGORIES.includes(t.category) ? t.category : 'theory';

    const estimatedMinutes = Number.isInteger(t.estimatedMinutes) && t.estimatedMinutes >= 15 && t.estimatedMinutes <= 180
      ? t.estimatedMinutes
      : dailyStudyMinutes || 45;

    const expectedOutcome = typeof t.expectedOutcome === 'string' && t.expectedOutcome.trim().length > 5
      ? t.expectedOutcome.trim()
      : 'Solidified understanding and applied problem-solving mastery';

    const completionCriteria = typeof t.completionCriteria === 'string' && t.completionCriteria.trim().length > 5
      ? t.completionCriteria.trim()
      : 'Review all concepts, solve practice exercises, and verify understanding';

    // Map evidence from matching harvested weakness
    let evidence = null;
    let relatedWeaknessTopic = t.relatedWeaknessTopic || '';
    let relatedWeaknessId = t.relatedWeaknessId || '';

    if (relatedWeaknessId && weaknessMap.has(relatedWeaknessId)) {
      const matched = weaknessMap.get(relatedWeaknessId);
      evidence = matched.evidence || null;
      relatedWeaknessTopic = relatedWeaknessTopic || matched.topic;
    } else if (relatedWeaknessTopic && weaknessMap.has(relatedWeaknessTopic.toLowerCase())) {
      const matched = weaknessMap.get(relatedWeaknessTopic.toLowerCase());
      evidence = matched.evidence || null;
      relatedWeaknessId = relatedWeaknessId || matched.weaknessId;
    }

    sanitizedTasks.push({
      taskId,
      dayNumber: day,
      title,
      description,
      relatedWeaknessId,
      relatedWeaknessTopic,
      priority,
      estimatedMinutes,
      difficulty,
      category,
      expectedOutcome,
      completionCriteria,
      status: 'pending',
      completedAt: null,
      candidateNotes: '',
      evidence,
    });
  });

  // Sort tasks by dayNumber, then priority order
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  sanitizedTasks.sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
  });

  // Ensure overall days coverage - if any day is missing, create a consolidation task
  for (let d = 1; d <= scheduleDurationDays; d++) {
    if (!coveredDays.has(d)) {
      const consolidationTask = {
        taskId: `task_d${d}_rev`,
        dayNumber: d,
        title: `Day ${d}: Review, Consolidate & Self-Test`,
        description: `Review previously studied concepts, solve 2 complementary drills, and document notes on challenging topics.`,
        relatedWeaknessId: '',
        relatedWeaknessTopic: 'Cumulative Review',
        priority: 'medium',
        estimatedMinutes: dailyStudyMinutes || 45,
        difficulty: 'intermediate',
        category: 'revision',
        expectedOutcome: 'Retain key patterns and ensure zero regression on practiced concepts',
        completionCriteria: 'Complete review notes and confirm clarity on past mistakes',
        status: 'pending',
        completedAt: null,
        candidateNotes: '',
        evidence: null,
      };
      sanitizedTasks.push(consolidationTask);
    }
  }

  sanitizedTasks.sort((a, b) => a.dayNumber - b.dayNumber);

  const planData = {
    overallAssessment,
    strengths: Array.isArray(harvestedData.strengths) ? harvestedData.strengths : [],
    criticalWeaknesses: Array.isArray(harvestedData.weaknesses) ? harvestedData.weaknesses : [],
    tasks: sanitizedTasks,
  };

  return {
    isValid: errors.length === 0,
    planData,
    errors,
  };
};
