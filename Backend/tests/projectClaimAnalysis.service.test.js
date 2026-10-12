import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeProjectClaims,
  mapClaimToDimensionAndIntent,
  calculateOpportunityPriority,
  detectProjectInformationGaps,
  detectProjectAmbiguities,
  BOUNDS,
} from '../services/projectClaimAnalysis.service.js';
import {
  CLAIM_CATEGORIES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  EXAMINATION_DIMENSIONS,
  EXAMINATION_INTENTS,
  OPPORTUNITY_TYPES,
  PRIORITY_LEVELS,
} from '../contracts/crossExamination.contracts.js';

describe('Project Claim Analysis Service', () => {
  const sampleDetailedProfile = {
    projects: [
      {
        projectId: 'prj_ecommerce_01',
        title: 'Distributed E-Commerce Platform',
        candidateRole: 'Full Stack Tech Lead',
        technologies: ['Node.js', 'Redis', 'PostgreSQL', 'Docker'],
        claims: [
          {
            claimId: 'clm_arch_01',
            statement: 'Architected microservices with distributed Redis lock synchronization for flash sales',
            category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
            sourceExcerpt: 'distributed Redis lock synchronization for flash sales',
            provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
            confidence: CONFIDENCE_LEVELS.HIGH,
          },
          {
            claimId: 'clm_metric_01',
            statement: 'Reduced checkout transaction latency by 45% during peak loads of 15,000 RPS',
            category: CLAIM_CATEGORIES.SCALE_METRIC,
            sourceExcerpt: 'Reduced checkout transaction latency by 45% during peak loads of 15,000 RPS',
            provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
            confidence: CONFIDENCE_LEVELS.HIGH,
          },
          {
            claimId: 'clm_fail_01',
            statement: 'Implemented circuit breaker pattern with fallback caching during downstream payment gateway outages',
            category: CLAIM_CATEGORIES.FAILURE_HANDLING,
            sourceExcerpt: 'circuit breaker pattern with fallback caching during downstream payment gateway outages',
            provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
            confidence: CONFIDENCE_LEVELS.HIGH,
          },
          {
            claimId: 'clm_db_01',
            statement: 'Designed composite indexing strategy in PostgreSQL database',
            category: CLAIM_CATEGORIES.TOOL_OR_DATABASE,
            sourceExcerpt: 'composite indexing strategy in PostgreSQL database',
            provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
            confidence: CONFIDENCE_LEVELS.HIGH,
          },
        ],
      },
    ],
  };

  describe('mapClaimToDimensionAndIntent', () => {
    it('should map SCALE_METRIC to METRICS_AND_OUTCOMES dimension with CLARIFY_METRIC intent', () => {
      const claim = {
        statement: 'Processed 50,000 messages per second with Kafka',
        category: CLAIM_CATEGORIES.SCALE_METRIC,
      };
      const result = mapClaimToDimensionAndIntent(claim);

      assert.strictEqual(result.dimension, EXAMINATION_DIMENSIONS.METRICS_AND_OUTCOMES);
      assert.strictEqual(result.intent, EXAMINATION_INTENTS.CLARIFY_METRIC);
      assert.ok(result.rationale.includes('Examine measurement methodology'));
    });

    it('should map ARCHITECTURE_DECISION with trade-off keywords to TRADEOFFS_AND_LIMITATIONS dimension', () => {
      const claim = {
        statement: 'Selected gRPC over REST due to latency trade-offs',
        category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
      };
      const result = mapClaimToDimensionAndIntent(claim);

      assert.strictEqual(result.dimension, EXAMINATION_DIMENSIONS.TRADEOFFS_AND_LIMITATIONS);
      assert.strictEqual(result.intent, EXAMINATION_INTENTS.EXPLORE_TRADEOFF);
    });

    it('should map FAILURE_HANDLING to ERROR_AND_FAILURE_HANDLING with INVESTIGATE_FAILURE intent', () => {
      const claim = {
        statement: 'Engineered automatic retry mechanism with exponential backoff',
        category: CLAIM_CATEGORIES.FAILURE_HANDLING,
      };
      const result = mapClaimToDimensionAndIntent(claim);

      assert.strictEqual(result.dimension, EXAMINATION_DIMENSIONS.ERROR_AND_FAILURE_HANDLING);
      assert.strictEqual(result.intent, EXAMINATION_INTENTS.INVESTIGATE_FAILURE);
    });

    it('should map TOOL_OR_DATABASE with DB keyword to DATABASE_AND_CONSISTENCY', () => {
      const claim = {
        statement: 'Optimized MongoDB aggregation pipelines',
        category: CLAIM_CATEGORIES.TOOL_OR_DATABASE,
      };
      const result = mapClaimToDimensionAndIntent(claim);

      assert.strictEqual(result.dimension, EXAMINATION_DIMENSIONS.DATABASE_AND_CONSISTENCY);
      assert.strictEqual(result.intent, EXAMINATION_INTENTS.INSPECT_DATA_CONSISTENCY);
    });
  });

  describe('calculateOpportunityPriority & Scoring Policy', () => {
    it('should calculate higher priority score for explicit claims with metrics', () => {
      const explicitWithMetric = calculateOpportunityPriority({
        opportunityType: OPPORTUNITY_TYPES.DIRECT_CLAIM_PROBE,
        dimension: EXAMINATION_DIMENSIONS.METRICS_AND_OUTCOMES,
        provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
        confidence: CONFIDENCE_LEVELS.HIGH,
        hasNumericMetric: true,
      });

      const inferredWithoutMetric = calculateOpportunityPriority({
        opportunityType: OPPORTUNITY_TYPES.DIRECT_CLAIM_PROBE,
        dimension: EXAMINATION_DIMENSIONS.TECHNOLOGY_SELECTION,
        provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
        confidence: CONFIDENCE_LEVELS.UNCERTAIN,
        hasNumericMetric: false,
      });

      assert.ok(explicitWithMetric.score > inferredWithoutMetric.score);
      assert.strictEqual(explicitWithMetric.priorityLevel, PRIORITY_LEVELS.HIGH);
      assert.ok(explicitWithMetric.scoreBreakdown.metricBonus > 0);
    });

    it('should assign HIGH priority to individual contribution verification', () => {
      const ownershipOpp = calculateOpportunityPriority({
        opportunityType: OPPORTUNITY_TYPES.INFORMATION_GAP_PROBE,
        dimension: EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION,
        provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
        confidence: CONFIDENCE_LEVELS.HIGH,
        hasNumericMetric: false,
      });

      assert.ok(ownershipOpp.score >= 55);
    });
  });

  describe('Information Gap & Ambiguity Detection', () => {
    it('should detect missing ownership context when candidateRole is blank or generic', () => {
      const project = {
        projectId: 'prj_test_1',
        title: 'Team Portal',
        candidateRole: 'Contributor',
        claims: [
          { statement: 'Built React UI', category: CLAIM_CATEGORIES.TECHNICAL_SKILL },
        ],
      };

      const gaps = detectProjectInformationGaps(project);
      const ownershipGap = gaps.find((g) => g.dimension === EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION);

      assert.ok(ownershipGap);
      assert.strictEqual(ownershipGap.examinationIntent, EXAMINATION_INTENTS.VERIFY_OWNERSHIP);
      assert.strictEqual(ownershipGap.opportunityType, OPPORTUNITY_TYPES.INFORMATION_GAP_PROBE);
    });

    it('should detect trade-off gap when project has multiple claims but no architectural rationale', () => {
      const project = {
        projectId: 'prj_test_2',
        title: 'Inventory Service',
        candidateRole: 'Lead',
        claims: [
          { statement: 'Used Node.js', category: CLAIM_CATEGORIES.TECHNICAL_SKILL },
          { statement: 'Used PostgreSQL', category: CLAIM_CATEGORIES.TOOL_OR_DATABASE },
        ],
      };

      const gaps = detectProjectInformationGaps(project);
      const tradeoffGap = gaps.find((g) => g.dimension === EXAMINATION_DIMENSIONS.TRADEOFFS_AND_LIMITATIONS);

      assert.ok(tradeoffGap);
      assert.strictEqual(tradeoffGap.examinationIntent, EXAMINATION_INTENTS.EXPLORE_TRADEOFF);
    });

    it('should detect extreme statements and create AMBIGUITY_RESOLVER opportunities', () => {
      const project = {
        projectId: 'prj_test_3',
        title: 'Zero Latency Engine',
        claims: [
          {
            claimId: 'clm_extreme_01',
            statement: 'Achieved 100% bug-free uptime with zero downtime forever',
            category: CLAIM_CATEGORIES.SCALE_METRIC,
            provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
          },
        ],
      };

      const ambiguities = detectProjectAmbiguities(project);
      assert.strictEqual(ambiguities.length, 1);
      assert.strictEqual(ambiguities[0].opportunityType, OPPORTUNITY_TYPES.AMBIGUITY_RESOLVER);
      assert.ok(ambiguities[0].rationale.includes('absolute statement'));
    });
  });

  describe('analyzeProjectClaims Pipeline & Blueprint Generation', () => {
    it('should analyze a detailed project and output sorted opportunities with coverage summary', () => {
      const blueprint = analyzeProjectClaims({
        crossExaminationProfile: sampleDetailedProfile,
      });

      assert.strictEqual(blueprint.success, true);
      assert.strictEqual(blueprint.totalProjectsAnalyzed, 1);
      assert.ok(blueprint.totalOpportunities > 0);
      assert.ok(blueprint.allOpportunitiesSorted.length > 0);

      // Verify opportunities have valid contract shapes
      const topOpp = blueprint.allOpportunitiesSorted[0];
      assert.ok(topOpp.opportunityId);
      assert.ok(topOpp.projectId);
      assert.ok(topOpp.dimension);
      assert.ok(topOpp.examinationIntent);
      assert.ok(topOpp.rationale);
      assert.ok(topOpp.priorityLevel);

      // Verify coverage summary exists
      assert.ok(blueprint.coverageSummary.byDimension);
      assert.ok(blueprint.coverageSummary.byPriority);
    });

    it('should produce identical deterministic ordering across repeated runs with identical input', () => {
      const run1 = analyzeProjectClaims({ crossExaminationProfile: sampleDetailedProfile });
      const run2 = analyzeProjectClaims({ crossExaminationProfile: sampleDetailedProfile });

      assert.strictEqual(run1.totalOpportunities, run2.totalOpportunities);

      const keys1 = run1.allOpportunitiesSorted.map((o) => `${o.dimension}:${o.examinationIntent}`);
      const keys2 = run2.allOpportunitiesSorted.map((o) => `${o.dimension}:${o.examinationIntent}`);

      assert.deepStrictEqual(keys1, keys2);
    });

    it('should deduplicate repeated identical claims within a project', () => {
      const duplicateProfile = {
        projects: [
          {
            projectId: 'prj_dup_01',
            title: 'Messaging App',
            claims: [
              { claimId: 'clm_1', statement: 'Built WebSocket server in Node.js', category: CLAIM_CATEGORIES.TECHNICAL_SKILL },
              { claimId: 'clm_2', statement: 'Built WebSocket server in Node.js', category: CLAIM_CATEGORIES.TECHNICAL_SKILL },
            ],
          },
        ],
      };

      const blueprint = analyzeProjectClaims({ crossExaminationProfile: duplicateProfile });
      const projectBlueprint = blueprint.projectBlueprints[0];

      assert.strictEqual(projectBlueprint.claimsCount, 1);
    });

    it('should handle sparse project with no claims safely without throwing', () => {
      const sparseProfile = {
        projects: [
          {
            projectId: 'prj_sparse_01',
            title: 'Simple Portfolio',
            claims: [],
          },
        ],
      };

      const blueprint = analyzeProjectClaims({ crossExaminationProfile: sparseProfile });
      assert.strictEqual(blueprint.success, true);
      assert.strictEqual(blueprint.totalProjectsAnalyzed, 1);

      // Should identify ownership gap
      assert.ok(blueprint.allOpportunitiesSorted.some((o) => o.dimension === EXAMINATION_DIMENSIONS.INDIVIDUAL_CONTRIBUTION));
    });

    it('should gracefully handle empty or invalid profile input', () => {
      const emptyBlueprint = analyzeProjectClaims({ crossExaminationProfile: null });
      assert.strictEqual(emptyBlueprint.success, false);
      assert.strictEqual(emptyBlueprint.totalOpportunities, 0);
      assert.ok(emptyBlueprint.warnings.length > 0);
    });

    it('should enforce reasonable output bounds', () => {
      // Create massive profile with 20 projects each having 30 claims
      const massiveProjects = Array.from({ length: 15 }, (_, i) => ({
        projectId: `prj_mass_${i}`,
        title: `Project Number ${i}`,
        claims: Array.from({ length: 25 }, (_, j) => ({
          claimId: `clm_${i}_${j}`,
          statement: `Technical statement number ${j} for project ${i}`,
          category: CLAIM_CATEGORIES.TECHNICAL_SKILL,
        })),
      }));

      const blueprint = analyzeProjectClaims({
        crossExaminationProfile: { projects: massiveProjects },
      });

      assert.ok(blueprint.totalProjectsAnalyzed <= BOUNDS.MAX_PROJECTS_ANALYZED);
      assert.ok(blueprint.totalOpportunities <= BOUNDS.MAX_TOTAL_OPPORTUNITIES);
    });

    it('should preserve Phase 1 and Phase 2 contract types and not invent new enums', () => {
      const blueprint = analyzeProjectClaims({ crossExaminationProfile: sampleDetailedProfile });

      blueprint.allOpportunitiesSorted.forEach((opp) => {
        assert.ok(EXAMINATION_DIMENSIONS[opp.dimension]);
        assert.ok(EXAMINATION_INTENTS[opp.examinationIntent]);
        assert.ok(OPPORTUNITY_TYPES[opp.opportunityType]);
        assert.ok(PRIORITY_LEVELS[opp.priorityLevel]);
      });
    });
  });
});
