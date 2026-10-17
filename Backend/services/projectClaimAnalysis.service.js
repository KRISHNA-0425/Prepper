/**
 * @file projectClaimAnalysis.service.js
 * Deterministic Project Claim Analysis Service for Prepper AI.
 * Transforms validated crossExaminationProfile data into prioritized,
 * grounded examination opportunities.
 */

import {
  CLAIM_CATEGORIES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  EXAMINATION_DIMENSIONS,
  EXAMINATION_INTENTS,
  OPPORTUNITY_TYPES,
  PRIORITY_LEVELS,
  generateDomainId,
  validateExaminationOpportunityContract,
} from '../contracts/crossExamination.contracts.js';

export const ANALYSIS_ENGINE_VERSION = 'v1.0.0';

export const BOUNDS = Object.freeze({
  MAX_PROJECTS_ANALYZED: 8,
  MAX_OPPORTUNITIES_PER_PROJECT: 10,
  MAX_TOTAL_OPPORTUNITIES: 30,
});

// Deterministic dimension weights for ranking
const DIMENSION_WEIGHTS = Object.freeze({
  [EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION]: 25,
  [EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES]: 20,
  [EXAMINATION_DIMENSIONS.TRADEOFFS_AND_LIMITATIONS]: 20,
  [EXAMINATION_DIMENSIONS.METRICS_AND_OUTCOMES]: 20,
  [EXAMINATION_DIMENSIONS.ERROR_AND_FAILURE_HANDLING]: 18,
  [EXAMINATION_DIMENSIONS.DATABASE_AND_CONSISTENCY]: 15,
  [EXAMINATION_DIMENSIONS.SECURITY_AND_AUTH]: 15,
  [EXAMINATION_DIMENSIONS.PERFORMANCE_AND_SCALE]: 15,
  [EXAMINATION_DIMENSIONS.API_AND_DATA_FLOW]: 12,
  [EXAMINATION_DIMENSIONS.TECHNOLOGY_SELECTION]: 10,
  [EXAMINATION_DIMENSIONS.TESTING_AND_DEPLOYMENT]: 10,
  [EXAMINATION_DIMENSIONS.PROBLEM_AND_REQUIREMENTS]: 8,
});

/**
 * Maps a claim's category and content to an examination dimension and intent.
 * @param {object} claim
 * @returns {{ dimension: string, intent: string, rationale: string }}
 */
export const mapClaimToDimensionAndIntent = (claim) => {
  const statement = String(claim.statement || '').toLowerCase();

  switch (claim.category) {
    case CLAIM_CATEGORIES.SCALE_METRIC:
      return {
        dimension: EXAMINATION_DIMENSIONS.METRICS_AND_OUTCOMES,
        intent: EXAMINATION_INTENTS.CLARIFY_METRIC,
        rationale: `Examine measurement methodology and baseline context for stated metric: "${claim.statement}"`,
      };

    case CLAIM_CATEGORIES.ARCHITECTURE_DECISION:
      if (statement.includes('trade-off') || statement.includes('alternative') || statement.includes('versus')) {
        return {
          dimension: EXAMINATION_DIMENSIONS.TRADEOFFS_AND_LIMITATIONS,
          intent: EXAMINATION_INTENTS.EXPLORE_TRADEOFF,
          rationale: `Probe rationale and rejected alternatives for architectural choice: "${claim.statement}"`,
        };
      }
      return {
        dimension: EXAMINATION_DIMENSIONS.ARCHITECTURE_BOUNDARIES,
        intent: EXAMINATION_INTENTS.PROBE_ARCHITECTURE,
        rationale: `Examine component coupling, state boundaries, and data flow for: "${claim.statement}"`,
      };

    case CLAIM_CATEGORIES.FAILURE_HANDLING:
      return {
        dimension: EXAMINATION_DIMENSIONS.ERROR_AND_FAILURE_HANDLING,
        intent: EXAMINATION_INTENTS.INVESTIGATE_FAILURE,
        rationale: `Probe edge cases, recovery paths, and disaster resilience for: "${claim.statement}"`,
      };

    case CLAIM_CATEGORIES.PROJECT_CONTRIBUTION:
    case CLAIM_CATEGORIES.RESPONSIBILITY_AND_OWNERSHIP:
      return {
        dimension: EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION,
        intent: EXAMINATION_INTENTS.VERIFY_OWNERSHIP,
        rationale: `Verify candidate's specific hands-on implementation versus team-level responsibilities for: "${claim.statement}"`,
      };

    case CLAIM_CATEGORIES.TOOL_OR_DATABASE: {
      const isDb = /(sql|mongo|redis|dynamo|postgres|database|query|index|cache|orm)/i.test(statement);
      if (isDb) {
        return {
          dimension: EXAMINATION_DIMENSIONS.DATABASE_AND_CONSISTENCY,
          intent: EXAMINATION_INTENTS.INSPECT_DATA_CONSISTENCY,
          rationale: `Probe indexing, transactional consistency, and data access patterns for database tool: "${claim.statement}"`,
        };
      }
      return {
        dimension: EXAMINATION_DIMENSIONS.TECHNOLOGY_SELECTION,
        intent: EXAMINATION_INTENTS.VALIDATE_TECH_SELECTION,
        rationale: `Examine evaluation criteria and fit-for-purpose justification for tool: "${claim.statement}"`,
      };
    }

    case CLAIM_CATEGORIES.DEPLOYMENT_INFRASTRUCTURE:
      return {
        dimension: EXAMINATION_DIMENSIONS.TESTING_AND_DEPLOYMENT,
        intent: EXAMINATION_INTENTS.EVALUATE_OPERATIONAL_PRACTICES,
        rationale: `Investigate deployment automation, rollback strategies, and operational monitoring for: "${claim.statement}"`,
      };

    case CLAIM_CATEGORIES.PROBLEM_STATEMENT:
      return {
        dimension: EXAMINATION_DIMENSIONS.PROBLEM_AND_REQUIREMENTS,
        intent: EXAMINATION_INTENTS.PROBE_ARCHITECTURE,
        rationale: `Examine candidate's understanding of technical requirements and problem constraints for: "${claim.statement}"`,
      };

    case CLAIM_CATEGORIES.TECHNICAL_SKILL:
    default: {
      if (/(api|rest|graphql|grpc|endpoint|webhook)/i.test(statement)) {
        return {
          dimension: EXAMINATION_DIMENSIONS.API_AND_DATA_FLOW,
          intent: EXAMINATION_INTENTS.PROBE_IMPLEMENTATION_DETAIL,
          rationale: `Examine API contract design, serialization, and payload structure for: "${claim.statement}"`,
        };
      }
      return {
        dimension: EXAMINATION_DIMENSIONS.TECHNOLOGY_SELECTION,
        intent: EXAMINATION_INTENTS.VALIDATE_TECH_SELECTION,
        rationale: `Examine practical application and depth of technical skill: "${claim.statement}"`,
      };
    }
  }
};

/**
 * Calculates a deterministic priority score (0–100) for an opportunity.
 * @param {object} params
 * @returns {{ score: number, priorityLevel: string, scoreBreakdown: object }}
 */
export const calculateOpportunityPriority = ({
  opportunityType,
  dimension,
  provenanceType,
  confidence,
  hasNumericMetric,
}) => {
  let score = 0;
  const breakdown = {};

  // 1. Base score by Opportunity Type & Provenance
  if (opportunityType === OPPORTUNITY_TYPES.DIRECT_CLAIM_PROBE) {
    if (provenanceType === PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT) {
      score += 25;
      breakdown.provenance = 25;
    } else {
      score += 15;
      breakdown.provenance = 15;
    }
  } else if (opportunityType === OPPORTUNITY_TYPES.AMBIGUITY_RESOLVER) {
    score += 22;
    breakdown.provenance = 22;
  } else {
    // INFORMATION_GAP_PROBE
    score += 20;
    breakdown.provenance = 20;
  }

  // 2. Dimension importance
  const dimWeight = DIMENSION_WEIGHTS[dimension] || 10;
  score += dimWeight;
  breakdown.dimension = dimWeight;

  // 3. Confidence weight
  let confScore = 2;
  if (confidence === CONFIDENCE_LEVELS.HIGH) confScore = 10;
  else if (confidence === CONFIDENCE_LEVELS.MEDIUM) confScore = 6;
  score += confScore;
  breakdown.confidence = confScore;

  // 4. Metric specificity bonus (verifiable numbers)
  if (hasNumericMetric) {
    score += 8;
    breakdown.metricBonus = 8;
  }

  // Clamp score between 0 and 100
  const finalScore = Math.min(100, Math.max(0, score));

  // Determine discrete priority level
  let priorityLevel = PRIORITY_LEVELS.LOW;
  if (finalScore >= 60) priorityLevel = PRIORITY_LEVELS.HIGH;
  else if (finalScore >= 42) priorityLevel = PRIORITY_LEVELS.MEDIUM;

  return {
    score: finalScore,
    priorityLevel,
    scoreBreakdown: breakdown,
  };
};

/**
 * Detects information gaps in a project.
 * Missing detail is an opportunity to ask questions, NOT evidence of incompetence.
 * @param {object} project
 * @returns {Array<object>} List of unprioritized gap opportunities
 */
export const detectProjectInformationGaps = (project) => {
  const gaps = [];
  const claims = Array.isArray(project.claims) ? project.claims : [];
  const projectId = project.projectId || 'prj_unknown';

  const hasOwnershipClaim = claims.some(
    (c) =>
      c.category === CLAIM_CATEGORIES.PROJECT_CONTRIBUTION ||
      c.category === CLAIM_CATEGORIES.RESPONSIBILITY_AND_OWNERSHIP
  );

  const hasArchitectureClaim = claims.some(
    (c) => c.category === CLAIM_CATEGORIES.ARCHITECTURE_DECISION
  );

  const hasFailureHandlingClaim = claims.some(
    (c) => c.category === CLAIM_CATEGORIES.FAILURE_HANDLING
  );

  const candidateRole = String(project.candidateRole || '').trim().toLowerCase();
  const isVagueRole =
    !candidateRole ||
    candidateRole === 'contributor' ||
    candidateRole === 'developer' ||
    candidateRole === 'team member';

  // Gap 1: Ownership and individual contribution
  if (!hasOwnershipClaim || isVagueRole) {
    gaps.push({
      opportunityType: OPPORTUNITY_TYPES.INFORMATION_GAP_PROBE,
      dimension: EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION,
      examinationIntent: EXAMINATION_INTENTS.VERIFY_OWNERSHIP,
      referencedClaimIds: [],
      groundingSource: 'MISSING_OWNERSHIP_CONTEXT',
      rationale: `Candidate's personal implementation boundary versus overall project scope is unstated. Probe what candidate individually designed and wrote.`,
      confidence: CONFIDENCE_LEVELS.UNCERTAIN,
      provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
      hasNumericMetric: false,
    });
  }

  // Gap 2: Architectural trade-offs
  if (claims.length >= 2 && !hasArchitectureClaim) {
    gaps.push({
      opportunityType: OPPORTUNITY_TYPES.INFORMATION_GAP_PROBE,
      dimension: EXAMINATION_DIMENSIONS.TRADEOFFS_AND_LIMITATIONS,
      examinationIntent: EXAMINATION_INTENTS.EXPLORE_TRADEOFF,
      referencedClaimIds: [],
      groundingSource: 'MISSING_ARCHITECTURE_TRADE_OFFS',
      rationale: `Technologies are listed for "${project.title}", but architectural trade-offs and rejected alternatives are unstated. Explore system decisions.`,
      confidence: CONFIDENCE_LEVELS.MEDIUM,
      provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
      hasNumericMetric: false,
    });
  }

  // Gap 3: Failure scenarios and edge cases
  if (claims.length >= 3 && !hasFailureHandlingClaim) {
    gaps.push({
      opportunityType: OPPORTUNITY_TYPES.INFORMATION_GAP_PROBE,
      dimension: EXAMINATION_DIMENSIONS.ERROR_AND_FAILURE_HANDLING,
      examinationIntent: EXAMINATION_INTENTS.INVESTIGATE_FAILURE,
      referencedClaimIds: [],
      groundingSource: 'MISSING_FAILURE_HANDLING',
      rationale: `System handles business transactions, but error handling and failure recovery mechanisms are not documented. Probe failure handling.`,
      confidence: CONFIDENCE_LEVELS.MEDIUM,
      provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
      hasNumericMetric: false,
    });
  }

  return gaps;
};

/**
 * Detects ambiguities or suspicious extremes across project claims.
 * @param {object} project
 * @returns {Array<object>} Ambiguity opportunities
 */
export const detectProjectAmbiguities = (project) => {
  const ambiguities = [];
  const claims = Array.isArray(project.claims) ? project.claims : [];

  claims.forEach((claim) => {
    const text = String(claim.statement || '').toLowerCase();
    const isExtreme = /(100%|zero downtime|infinite scale|bug-free|never fails|completely secured)/i.test(text);

    if (isExtreme) {
      ambiguities.push({
        opportunityType: OPPORTUNITY_TYPES.AMBIGUITY_RESOLVER,
        dimension: EXAMINATION_DIMENSIONS.TRADEOFFS_AND_LIMITATIONS,
        examinationIntent: EXAMINATION_INTENTS.CLARIFY_METRIC,
        referencedClaimIds: [claim.claimId],
        groundingSource: 'AMBIGUOUS_OR_EXTREME_CLAIM',
        rationale: `Claim contains absolute statement: "${claim.statement}". Examine real-world constraints, edge cases, and caveats.`,
        confidence: CONFIDENCE_LEVELS.MEDIUM,
        provenanceType: claim.provenanceType,
        hasNumericMetric: true,
      });
    }
  });

  return ambiguities;
};

/**
 * Main Project Claim Analysis engine.
 * Converts a validated crossExaminationProfile into a deterministic blueprint of examination opportunities.
 *
 * @param {object} params
 * @param {object} params.crossExaminationProfile - Validated profile from Phase 2
 * @returns {{
 *   success: boolean,
 *   blueprintId: string,
 *   totalProjectsAnalyzed: number,
 *   totalOpportunities: number,
 *   projectBlueprints: Array<object>,
 *   allOpportunitiesSorted: Array<object>,
 *   coverageSummary: object,
 *   warnings: Array<string>
 * }}
 */
export const analyzeProjectClaims = ({ crossExaminationProfile }) => {
  const warnings = [];

  if (!crossExaminationProfile || typeof crossExaminationProfile !== 'object') {
    return {
      success: false,
      blueprintId: generateDomainId('blp'),
      totalProjectsAnalyzed: 0,
      totalOpportunities: 0,
      projectBlueprints: [],
      allOpportunitiesSorted: [],
      coverageSummary: {},
      warnings: ['Invalid or empty crossExaminationProfile provided'],
    };
  }

  const rawProjects = Array.isArray(crossExaminationProfile.projects)
    ? crossExaminationProfile.projects.slice(0, BOUNDS.MAX_PROJECTS_ANALYZED)
    : [];

  const blueprintId = generateDomainId('blp');
  const projectBlueprints = [];
  const allOpportunities = [];
  const coverageByDimension = {};
  const coverageByPriority = {
    [PRIORITY_LEVELS.HIGH]: 0,
    [PRIORITY_LEVELS.MEDIUM]: 0,
    [PRIORITY_LEVELS.LOW]: 0,
  };

  rawProjects.forEach((project, projectIdx) => {
    const projectId = project.projectId || generateDomainId('prj');
    const projectTitle = String(project.title || `Project ${projectIdx + 1}`).trim();
    const rawClaims = Array.isArray(project.claims) ? project.claims : [];

    // Filter duplicates by claim statement
    const seenStatements = new Set();
    const uniqueClaims = [];

    rawClaims.forEach((c) => {
      if (!c || typeof c !== 'object') return;
      const normalized = String(c.statement || '').trim().toLowerCase();
      if (!normalized || seenStatements.has(normalized)) return;
      seenStatements.add(normalized);
      uniqueClaims.push(c);
    });

    const unrankedOpportunities = [];

    // 1. Direct claim opportunities
    uniqueClaims.forEach((claim) => {
      const claimId = claim.claimId || generateDomainId('clm');
      const { dimension, intent, rationale } = mapClaimToDimensionAndIntent(claim);
      const hasNumeric = /\d+/.test(String(claim.statement || ''));

      unrankedOpportunities.push({
        opportunityType: OPPORTUNITY_TYPES.DIRECT_CLAIM_PROBE,
        dimension,
        examinationIntent: intent,
        referencedClaimIds: [claimId],
        groundingSource: claim.provenanceType || PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
        rationale,
        confidence: claim.confidence || CONFIDENCE_LEVELS.HIGH,
        provenanceType: claim.provenanceType || PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
        hasNumericMetric: hasNumeric,
        claimStatement: claim.statement,
      });
    });

    // 2. Information gap opportunities
    const gaps = detectProjectInformationGaps({ ...project, claims: uniqueClaims });
    unrankedOpportunities.push(...gaps);

    // 3. Ambiguity opportunities
    const ambiguities = detectProjectAmbiguities({ ...project, claims: uniqueClaims });
    unrankedOpportunities.push(...ambiguities);

    // Prioritize and construct opportunity entities
    const projectOpportunities = unrankedOpportunities.map((rawOpp, oppIdx) => {
      const oppId = `opp_${projectId.slice(-6)}_${String(oppIdx + 1).padStart(2, '0')}`;
      const { score, priorityLevel, scoreBreakdown } = calculateOpportunityPriority(rawOpp);

      const opportunity = {
        opportunityId: oppId,
        projectId,
        projectTitle,
        referencedClaimIds: rawOpp.referencedClaimIds,
        dimension: rawOpp.dimension,
        examinationIntent: rawOpp.examinationIntent,
        opportunityType: rawOpp.opportunityType,
        groundingSource: rawOpp.groundingSource,
        rationale: rawOpp.rationale,
        priorityScore: score,
        priorityLevel,
        scoreBreakdown,
        deterministicKey: `${String(1000 - score).padStart(4, '0')}_${rawOpp.dimension}_${oppId}`,
      };

      // Contract validation
      const validation = validateExaminationOpportunityContract(opportunity);
      if (!validation.isValid) {
        warnings.push(`Contract check on ${oppId}: ${validation.errors.join('; ')}`);
      }

      // Track coverage
      coverageByDimension[opportunity.dimension] = (coverageByDimension[opportunity.dimension] || 0) + 1;
      coverageByPriority[priorityLevel] = (coverageByPriority[priorityLevel] || 0) + 1;

      return opportunity;
    });

    // Stable sort within project by deterministicKey
    projectOpportunities.sort((a, b) => a.deterministicKey.localeCompare(b.deterministicKey));

    const boundedProjectOpps = projectOpportunities.slice(0, BOUNDS.MAX_OPPORTUNITIES_PER_PROJECT);

    projectBlueprints.push({
      projectId,
      title: projectTitle,
      candidateRole: project.candidateRole || '',
      claimsCount: uniqueClaims.length,
      opportunitiesCount: boundedProjectOpps.length,
      opportunities: boundedProjectOpps,
    });

    allOpportunities.push(...boundedProjectOpps);
  });

  // Global deterministic tie-break sorting across all projects
  allOpportunities.sort((a, b) => a.deterministicKey.localeCompare(b.deterministicKey));

  const boundedAllOpportunities = allOpportunities.slice(0, BOUNDS.MAX_TOTAL_OPPORTUNITIES);

  return {
    success: true,
    blueprintId,
    totalProjectsAnalyzed: projectBlueprints.length,
    totalOpportunities: boundedAllOpportunities.length,
    projectBlueprints,
    allOpportunitiesSorted: boundedAllOpportunities,
    coverageSummary: {
      byDimension: coverageByDimension,
      byPriority: coverageByPriority,
    },
    warnings,
  };
};
