import { buildCompanyQuestionPrompt } from './companyQuestionPrompt.js';
import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';

/**
 * Deterministic fallback question bank tailored per interview round
 */
export const getFallbackCompanyQuestions = ({
  companyName = 'Tech Enterprise',
  targetRole = 'Software Engineer',
  interviewRound = 'technical_round_1',
  count = 5,
  difficulty = 'medium',
}) => {
  const roundQuestionsMap = {
    online_assessment: [
      {
        question: `Given an array of server transaction latencies, find the maximum sub-array sum using Kadane's algorithm and explain how to handle all-negative inputs.`,
        category: 'Data Structures & Algorithms',
        topic: 'Arrays & Dynamic Programming',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Time complexity O(N), Space O(1), correct handling of edge cases.',
        transitionPhrase: `Let's start with an algorithmic problem common in our online assessments.`,
      },
      {
        question: `Implement an efficient algorithm to detect cycle presence in a directed graph representing package dependencies at ${companyName}.`,
        category: 'Data Structures & Algorithms',
        topic: 'Graph Theory & Topological Sort',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'DFS with 3-color state or Kahn algorithm BFS.',
        transitionPhrase: `Here is the second problem focusing on dependency graph validation.`,
      },
      {
        question: `Design an in-memory sliding window rate limiter that allows a maximum of N requests per minute per IP address.`,
        category: 'Problem Solving',
        topic: 'Sliding Window & Queues',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Deque or Redis sorted set approach, handling clock drift.',
        transitionPhrase: `Let's examine how you approach practical service throttling.`,
      },
    ],
    technical_round_1: [
      {
        question: `Explain how memory management and garbage collection work in your primary runtime (e.g. V8 for Node.js or JVM for Java). How would you diagnose an episodic memory leak in production?`,
        category: 'Language Internals',
        topic: 'Memory Management & GC',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Generational GC, heap dumps, profiler analysis, retaining paths.',
        transitionPhrase: `Welcome to ${companyName}'s Technical Round 1. Let's explore your understanding of runtime internals.`,
      },
      {
        question: `How does indexing work in B-Tree relational databases vs LSM-Tree NoSQL databases? When would you select one over the other for ${companyName}'s data workloads?`,
        category: 'Database Management',
        topic: 'Indexing & Storage Engines',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'B-Tree read optimization vs LSM write optimization and compaction tradeoffs.',
        transitionPhrase: `Moving to storage layer design, let's look at indexing tradeoffs.`,
      },
      {
        question: `Explain the Event Loop phases. If you queue a setImmediate, setTimeout(fn, 0), and a resolved Promise.then, in what exact order do they execute and why?`,
        category: 'Asynchronous Programming',
        topic: 'Event Loop & Microtasks',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Microtask queue priority over macrotasks and timer phases.',
        transitionPhrase: `Let's drill into asynchronous execution guarantees.`,
      },
      {
        question: `Design an LRU Cache with $O(1)$ get and $O(1)$ put operations under strict memory caps. Explain how your doubly linked list and hash map synchronize.`,
        category: 'Data Structures & Algorithms',
        topic: 'LRU Cache & Linked Lists',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Hash map for lookup, doubly linked list for eviction, concurrency considerations.',
        transitionPhrase: `Now let's examine a foundational data structure design.`,
      },
      {
        question: `How do you secure API endpoints against common OWASP vulnerabilities like SSRF, SQL Injection, and Broken Object Level Authorization (BOLA)?`,
        category: 'Security & Web APIs',
        topic: 'OWASP Security & Auth',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Input sanitization, parameterized queries, token validation, scope checks.',
        transitionPhrase: `To wrap up our technical session, let's discuss security hygiene.`,
      },
    ],
    technical_round_2: [
      {
        question: `Walk me through how you design an idempotent API endpoint for payment or order placement at ${companyName}. How do you handle network retries, race conditions, and distributed locks?`,
        category: 'Backend Architecture',
        topic: 'Idempotency & Distributed Locking',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Idempotency keys, unique database constraints, Redis Redlock or conditional writes.',
        transitionPhrase: `Welcome to Round 2. Today we'll dive deep into resilient backend architectures.`,
      },
      {
        question: `Explain the CAP theorem. When building a distributed shopping cart or user profile system, would you prioritize AP or CP, and what concrete tradeoffs arise?`,
        category: 'Distributed Systems',
        topic: 'CAP Theorem & Eventual Consistency',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Network partition reality, PACELC theorem, conflict resolution strategies.',
        transitionPhrase: `Let's discuss distributed consistency and partitioning tradeoffs.`,
      },
      {
        question: `How do you handle database migration on a table with 200 million rows without taking downtime or locking tables for writes?`,
        category: 'Database Management',
        topic: 'Zero-Downtime Database Migrations',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Expand-contract pattern, shadow writes, backfill workers, feature flags.',
        transitionPhrase: `High-availability operations are critical at ${companyName}; let's explore table migrations.`,
      },
      {
        question: `Design a pub/sub event pipeline using Kafka or RabbitMQ. How do you prevent message loss, enforce ordering, and handle poison-pill messages?`,
        category: 'Event-Driven Architecture',
        topic: 'Message Queues & Dead Letter Queues',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Consumer acks, partition keys for ordering, Dead Letter Queues (DLQ).',
        transitionPhrase: `Let's evaluate your experience with asynchronous event streaming.`,
      },
    ],
    system_design: [
      {
        question: `Design a global URL shortener service (like Bitly) for ${companyName} capable of handling 50,000 write requests/sec and 500,000 read requests/sec with low latency.`,
        category: 'System Design',
        topic: 'High Scale URL Shortening',
        difficulty,
        timeLimit: 90,
        evaluationCriteria: 'Base62 encoding, distributed ID generation (Snowflake), Redis caching, DB sharding.',
        transitionPhrase: `Welcome to the System Design round at ${companyName}. Let's design a high-throughput URL shortening service.`,
      },
      {
        question: `How would you partition and shard the database for this system? What happens when a single partition becomes a hot spot?`,
        category: 'System Design',
        topic: 'Database Sharding & Hot Spots',
        difficulty,
        timeLimit: 90,
        evaluationCriteria: 'Consistent hashing with virtual nodes, salt keys for hot partitions.',
        transitionPhrase: `Let's zoom into database partitioning and hotspot mitigation.`,
      },
      {
        question: `Design a distributed rate limiter and DDoS shield that protects downstream microservices across multi-region data centers.`,
        category: 'System Design',
        topic: 'Multi-Region Rate Limiting',
        difficulty,
        timeLimit: 90,
        evaluationCriteria: 'Token bucket vs Leaky bucket, local edge clusters, asynchronous sync.',
        transitionPhrase: `Finally, let's explore API gateway protection and global traffic management.`,
      },
    ],
    hiring_manager: [
      {
        question: `Tell me about a time at your previous role when you had to advocate for a technical architectural decision that faced pushback from stakeholders or peers. How did you build consensus?`,
        category: 'Behavioral & Leadership',
        topic: 'Influence & Consensus Building',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'STAR format, objective data-driven argumentation, active listening.',
        transitionPhrase: `Hello, I'm the Engineering Hiring Manager for ${targetRole}. Let's discuss your engineering leadership.`,
      },
      {
        question: `Describe a production outage or catastrophic software bug you caused or investigated. What was the root cause, how did you resolve it under pressure, and what preventative guardrails did you institute?`,
        category: 'Behavioral & Leadership',
        topic: 'Post-Mortem & Incident Management',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Blameless post-mortem mindset, root cause analysis, automated guardrails.',
        transitionPhrase: `Production resilience is vital to our culture. Tell me about your incident response experience.`,
      },
      {
        question: `How do you prioritize technical debt versus shipping new product features when sprint timelines are compressed?`,
        category: 'Engineering Management',
        topic: 'Technical Debt & Delivery Tradeoffs',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Quantifying risk, allocating percentage time to maintenance, business alignment.',
        transitionPhrase: `Let's discuss balancing velocity with long-term software health.`,
      },
    ],
    behavioral: [
      {
        question: `Give me an example of a project where the requirements were ambiguous or rapidly shifting. How did you navigate the ambiguity to deliver meaningful impact?`,
        category: 'Behavioral',
        topic: 'Navigating Ambiguity',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Clear structured decomposition, iterative milestones, stakeholder check-ins.',
        transitionPhrase: `Welcome to our Behavioral and Culture round at ${companyName}.`,
      },
      {
        question: `Tell me about a time you went above and beyond your immediate job scope to solve an organizational or customer problem.`,
        category: 'Behavioral',
        topic: 'Ownership & Initiative',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Personal accountability, customer empathy, measurable outcome.',
        transitionPhrase: `Ownership is deeply valued at ${companyName}. Tell me about an example.`,
      },
      {
        question: `Describe a situation where you received critical or difficult feedback from a colleague or manager. How did you react and what changes did you make?`,
        category: 'Behavioral',
        topic: 'Growth Mindset & Receptiveness',
        difficulty,
        timeLimit: 60,
        evaluationCriteria: 'Emotional maturity, growth mindset, measurable behavioral adjustment.',
        transitionPhrase: `Let's discuss how you approach continuous feedback and personal growth.`,
      },
    ],
    final_hr: [
      {
        question: `Why are you interested in joining ${companyName} specifically at this point in your engineering career, and what excites you about our engineering challenges?`,
        category: 'Culture & Fit',
        topic: 'Company Motivation & Career Vision',
        difficulty: 'easy',
        timeLimit: 60,
        evaluationCriteria: 'Specific knowledge of company products, genuine career alignment.',
        transitionPhrase: `Welcome to the final HR round! Let's talk about your career aspirations at ${companyName}.`,
      },
      {
        question: `Where do you see your engineering journey evolving over the next 2 to 3 years in terms of technical specialization versus leadership?`,
        category: 'Career Development',
        topic: 'Long-term Goals & Growth',
        difficulty: 'easy',
        timeLimit: 60,
        evaluationCriteria: 'Clarity of vision, ambition grounded in realistic milestones.',
        transitionPhrase: `Let's explore your long-term engineering ambitions.`,
      },
      {
        question: `What kind of team culture enables you to do your best work, and what are your expectations from engineering leadership at ${companyName}?`,
        category: 'Culture & Fit',
        topic: 'Team Environment & Working Style',
        difficulty: 'easy',
        timeLimit: 60,
        evaluationCriteria: 'Collaborative instincts, proactive communication, psychological safety.',
        transitionPhrase: `Lastly, let's talk about the team dynamics that help you thrive.`,
      },
    ],
  };

  const pool = roundQuestionsMap[interviewRound] || roundQuestionsMap.technical_round_1;
  const selected = pool.slice(0, Math.min(count, pool.length));

  // If pool has fewer questions than requested, generate additional contextual questions
  while (selected.length < count) {
    const idx = selected.length + 1;
    selected.push({
      question: `How would you architect, test, and deploy a mission-critical feature for ${targetRole} at ${companyName} ensuring high reliability and minimal downtime?`,
      category: 'System Architecture',
      topic: 'Production Deployment & Reliability',
      difficulty,
      timeLimit: 60,
      evaluationCriteria: 'CI/CD pipelines, canary deployments, feature flags, monitoring & rollback.',
      transitionPhrase: `Let's continue with Question ${idx}.`,
    });
  }

  return {
    interviewerGreeting: `Hello! Welcome to ${companyName}'s ${interviewRound.replace(/_/g, ' ')} interview for the ${targetRole} position. I am looking forward to our discussion today.`,
    questions: selected,
  };
};

/**
 * Generates tailored company-specific interview questions via OpenRouter AI with deterministic fallback.
 */
export const generateCompanyQuestions = async ({
  companyProfile,
  targetRole = 'Software Engineer',
  experienceLevel = 'Intermediate',
  interviewRound = 'technical_round_1',
  roundTitle = 'Technical Round 1',
  requiredSkills = [],
  jobDescription = '',
  questionCount = 5,
  difficulty = 'medium',
  options = {},
}) => {
  const askAI = options.askAI || defaultAskAI;

  try {
    const { systemPrompt, userPrompt } = buildCompanyQuestionPrompt({
      companyProfile,
      targetRole,
      experienceLevel,
      interviewRound,
      roundTitle,
      requiredSkills,
      jobDescription,
      questionCount,
      difficulty,
    });

    const rawResponse = await askAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { max_tokens: 3500, temperature: 0.3 }
    );

    const { data } = safeParseJson(rawResponse);

    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
      const sanitized = data.questions.map((q, idx) => ({
        question: (q.question || `Question ${idx + 1}`).trim(),
        category: (q.category || 'Technical').trim(),
        topic: (q.topic || 'Engineering Fundamentals').trim(),
        difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty?.toLowerCase()) ? q.difficulty.toLowerCase() : difficulty,
        timeLimit: Number(q.timeLimit) || 60,
        evaluationCriteria: q.evaluationCriteria || '',
        transitionPhrase: q.transitionPhrase || `Let's proceed to question ${idx + 1}.`,
      }));

      return {
        interviewerGreeting: data.interviewerGreeting || `Welcome to ${companyProfile?.name || 'Company'} interview simulation.`,
        questions: sanitized,
        isFallback: false,
      };
    }
  } catch (err) {
    // Fall through to deterministic fallback
  }

  const fallback = getFallbackCompanyQuestions({
    companyName: companyProfile?.name || 'Technology Enterprise',
    targetRole,
    interviewRound,
    count: questionCount,
    difficulty,
  });

  return {
    ...fallback,
    isFallback: true,
  };
};
