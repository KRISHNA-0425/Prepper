/**
 * Deterministic Fallback Generator for Recovery Plans
 * Generates an evidence-grounded study roadmap purely from verified interview findings
 * when the external AI engine is unreachable, timed out, or quota-exhausted.
 */

export const generateFallbackRecoveryPlan = ({
  harvestedData,
  scheduleDurationDays = 14,
  dailyStudyMinutes = 45,
  fallbackReason = 'Deterministic plan generated from verified performance evidence',
}) => {
  const weaknesses = Array.isArray(harvestedData.weaknesses) && harvestedData.weaknesses.length > 0
    ? harvestedData.weaknesses
    : [
        {
          weaknessId: 'gap_fallback_1',
          topic: 'Core Technical Competencies',
          severity: 'moderate',
          description: `General review and strengthening of core interview skills for ${harvestedData.targetRole || 'Software Engineer'}.`,
          misconceptionSnippet: '',
          evidence: null,
        },
      ];

  const tasks = [];
  const daysCount = Number(scheduleDurationDays) || 14;
  const minutesPerTask = Math.min(Math.max(20, Math.floor(dailyStudyMinutes / 2)), 60);

  // Distribute weaknesses across available days
  weaknesses.forEach((weakness, wIdx) => {
    const topic = weakness.topic || 'Software Fundamentals';
    const baseDay = Math.min(1 + Math.floor((wIdx * (daysCount - 2)) / Math.max(1, weaknesses.length)), daysCount - 2);

    // 1. Conceptual deep dive task
    tasks.push({
      taskId: `fallback_t_d${baseDay}_${wIdx + 1}_theory`,
      dayNumber: baseDay,
      title: `Deep-Dive: ${topic} Foundations & Core Principles`,
      description: `Targeting identified gap: "${weakness.description}". Read official documentation, analyze architectural tradeoffs, and summarize core principles without relying on rote memorization.`,
      relatedWeaknessId: weakness.weaknessId,
      relatedWeaknessTopic: topic,
      priority: weakness.severity === 'critical' ? 'critical' : 'high',
      estimatedMinutes: minutesPerTask,
      difficulty: weakness.severity === 'critical' ? 'beginner' : 'intermediate',
      category: 'theory',
      expectedOutcome: `Thorough conceptual clarity on ${topic} and resolution of previously noted misconceptions.`,
      completionCriteria: `Produce written notes addressing the root cause of "${weakness.description}".`,
      status: 'pending',
      completedAt: null,
      candidateNotes: '',
      evidence: weakness.evidence || null,
    });

    // 2. Applied drill / coding practice on next day
    const drillDay = Math.min(baseDay + 1, daysCount - 1);
    tasks.push({
      taskId: `fallback_t_d${drillDay}_${wIdx + 1}_practice`,
      dayNumber: drillDay,
      title: `Hands-On Drill: Implement & Verify ${topic}`,
      description: `Solve 2 targeted interview problems or code exercises directly exercising ${topic}. Focus specifically on edge cases, algorithmic complexity, and error handling.`,
      relatedWeaknessId: weakness.weaknessId,
      relatedWeaknessTopic: topic,
      priority: weakness.severity === 'critical' ? 'critical' : 'high',
      estimatedMinutes: minutesPerTask,
      difficulty: 'intermediate',
      category: 'coding_practice',
      expectedOutcome: `Executable implementation and proven ability to handle corner cases for ${topic}.`,
      completionCriteria: `Pass all local test assertions and document Big-O runtime and space efficiency.`,
      status: 'pending',
      completedAt: null,
      candidateNotes: '',
      evidence: weakness.evidence || null,
    });
  });

  // Ensure every day up to scheduleDurationDays has at least one structured task
  const assignedDays = new Set(tasks.map((t) => t.dayNumber));
  for (let d = 1; d <= daysCount; d++) {
    if (!assignedDays.has(d)) {
      if (d === daysCount) {
        // Final Day: Reassessment readiness & timed mock drill
        tasks.push({
          taskId: `fallback_t_d${d}_final_mock`,
          dayNumber: d,
          title: `Final Milestone: Comprehensive Timed Reassessment Drill`,
          description: `Simulate full interview conditions: solve 2 questions without checking references, articulate design tradeoffs out loud, and complete your recovery plan reassessment.`,
          relatedWeaknessId: '',
          relatedWeaknessTopic: 'Final Reassessment Readiness',
          priority: 'critical',
          estimatedMinutes: dailyStudyMinutes,
          difficulty: 'advanced',
          category: 'mock_drill',
          expectedOutcome: `Demonstrated mastery across all remediated topics with measurable score improvement.`,
          completionCriteria: `Complete the Module 5 Reassessment test and verify score delta.`,
          status: 'pending',
          completedAt: null,
          candidateNotes: '',
          evidence: null,
        });
      } else {
        // Mid-cycle review / consolidation
        tasks.push({
          taskId: `fallback_t_d${d}_review`,
          dayNumber: d,
          title: `Day ${d}: Cumulative Review & Spaced Repetition`,
          description: `Review notes from prior days, re-examine previous incorrect answers, and perform spaced repetition self-testing.`,
          relatedWeaknessId: '',
          relatedWeaknessTopic: 'Spaced Repetition & Retention',
          priority: 'medium',
          estimatedMinutes: dailyStudyMinutes,
          difficulty: 'intermediate',
          category: 'revision',
          expectedOutcome: `Reinforced long-term retention of remediated concepts.`,
          completionCriteria: `Explain each remediated topic in your own words with zero hesitation.`,
          status: 'pending',
          completedAt: null,
          candidateNotes: '',
          evidence: null,
        });
      }
    }
  }

  // Sort by dayNumber, then priority
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  tasks.sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
  });

  return {
    overallAssessment: `This ${daysCount}-day recovery curriculum was systematically derived from your interview performance evaluation. By focusing on your ${weaknesses.length} identified areas of improvement through sequenced theory, hands-on implementation drills, and final reassessment, you will establish rigorous interview readiness for ${harvestedData.targetRole || 'target roles'}.`,
    strengths: Array.isArray(harvestedData.strengths) ? harvestedData.strengths : [],
    criticalWeaknesses: weaknesses,
    tasks,
    isFallbackGenerated: true,
    fallbackReason,
  };
};
