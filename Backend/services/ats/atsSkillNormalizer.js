/**
 * @file atsSkillNormalizer.js
 * Canonical skill dictionary and normalization engine for Module 7: AI Resume-to-Job ATS Intelligence.
 * Resolves aliases, casing variations, punctuation, and synonyms while preventing false merges.
 */

export const CANONICAL_SKILL_MAP = Object.freeze({
  // JavaScript & Frameworks
  'react': 'React',
  'react.js': 'React',
  'reactjs': 'React',
  'react native': 'React Native',
  'react-native': 'React Native',
  'next': 'Next.js',
  'next.js': 'Next.js',
  'nextjs': 'Next.js',
  'node': 'Node.js',
  'node.js': 'Node.js',
  'nodejs': 'Node.js',
  'express': 'Express.js',
  'express.js': 'Express.js',
  'expressjs': 'Express.js',
  'vue': 'Vue.js',
  'vue.js': 'Vue.js',
  'vuejs': 'Vue.js',
  'angular': 'Angular',
  'angular.js': 'Angular',
  'angularjs': 'Angular',
  'svelte': 'Svelte',
  'sveltekit': 'SvelteKit',
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  'javascript': 'JavaScript',
  'js': 'JavaScript',
  'redux': 'Redux',
  'redux toolkit': 'Redux Toolkit',
  'rtk': 'Redux Toolkit',

  // CSS & Styling
  'tailwind': 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'tailwindcss': 'Tailwind CSS',
  'bootstrap': 'Bootstrap',
  'sass': 'Sass',
  'scss': 'Sass',
  'material ui': 'Material UI',
  'mui': 'Material UI',

  // Python & Data Science
  'python': 'Python',
  'py': 'Python',
  'python3': 'Python',
  'django': 'Django',
  'flask': 'Flask',
  'fastapi': 'FastAPI',
  'fast-api': 'FastAPI',
  'numpy': 'NumPy',
  'pandas': 'Pandas',
  'scikit-learn': 'Scikit-Learn',
  'sklearn': 'Scikit-Learn',
  'pytorch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  'keras': 'Keras',

  // Java & JVM
  'java': 'Java',
  'spring': 'Spring',
  'spring boot': 'Spring Boot',
  'springboot': 'Spring Boot',
  'kotlin': 'Kotlin',
  'scala': 'Scala',

  // C / C++ / Systems
  'c': 'C',
  'c++': 'C++',
  'cpp': 'C++',
  'c#': 'C#',
  'csharp': 'C#',
  '.net': '.NET',
  'dotnet': '.NET',
  'rust': 'Rust',
  'go': 'Go',
  'golang': 'Go',

  // Databases
  'mongodb': 'MongoDB',
  'mongo db': 'MongoDB',
  'mongo': 'MongoDB',
  'postgresql': 'PostgreSQL',
  'postgres': 'PostgreSQL',
  'mysql': 'MySQL',
  'sql server': 'SQL Server',
  'mssql': 'SQL Server',
  'sqlite': 'SQLite',
  'redis': 'Redis',
  'dynamodb': 'DynamoDB',
  'cassandra': 'Cassandra',
  'neo4j': 'Neo4j',
  'elasticsearch': 'Elasticsearch',

  // Cloud & DevOps
  'aws': 'AWS',
  'amazon web services': 'AWS',
  'gcp': 'GCP',
  'google cloud': 'GCP',
  'google cloud platform': 'GCP',
  'azure': 'Azure',
  'microsoft azure': 'Azure',
  'docker': 'Docker',
  'containerization': 'Docker',
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  'terraform': 'Terraform',
  'ansible': 'Ansible',
  'jenkins': 'Jenkins',
  'github actions': 'GitHub Actions',
  'ci/cd': 'CI/CD',
  'cicd': 'CI/CD',

  // Architecture & APIs
  'rest': 'REST API',
  'restful': 'REST API',
  'rest api': 'REST API',
  'graphql': 'GraphQL',
  'grpc': 'gRPC',
  'websocket': 'WebSockets',
  'websockets': 'WebSockets',
  'microservices': 'Microservices',
  'kafka': 'Apache Kafka',
  'apache kafka': 'Apache Kafka',
  'rabbitmq': 'RabbitMQ',
});

/**
 * Normalizes an arbitrary skill string to canonical standard format.
 * @param {string} skill
 * @returns {string}
 */
export const normalizeSkill = (skill = '') => {
  if (typeof skill !== 'string') return '';
  const trimmed = skill.trim();
  if (!trimmed) return '';

  const lookupKey = trimmed
    .toLowerCase()
    .replace(/[,\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (CANONICAL_SKILL_MAP[lookupKey]) {
    return CANONICAL_SKILL_MAP[lookupKey];
  }

  // Preserve casing if title-cased or capitalized acronym, else capitalize words
  return trimmed.length <= 4 && trimmed === trimmed.toUpperCase()
    ? trimmed
    : trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

/**
 * Normalizes an array of skills, removes duplicates, and trims.
 * @param {string[]} skills
 * @returns {string[]}
 */
export const normalizeSkillList = (skills = []) => {
  if (!Array.isArray(skills)) return [];
  const set = new Set();
  const result = [];

  for (const s of skills) {
    const norm = normalizeSkill(s);
    if (norm && !set.has(norm.toLowerCase())) {
      set.add(norm.toLowerCase());
      result.push(norm);
    }
  }

  return result;
};

/**
 * Determines whether candidate has matched a required skill.
 * Checks normalized exact match, alias match, or word-boundary substring.
 *
 * @param {string} targetSkill
 * @param {string[]} candidateSkills
 * @param {string} [candidateSourceText='']
 * @returns {{ isMatched: boolean, matchedSkill: string | null, evidenceSource: string }}
 */
export const checkSkillMatch = (targetSkill, candidateSkills = [], candidateSourceText = '') => {
  const normTarget = normalizeSkill(targetSkill).toLowerCase();
  const normCandidateList = candidateSkills.map((s) => normalizeSkill(s).toLowerCase());

  // 1. Direct normalized skill list match
  const directIdx = normCandidateList.indexOf(normTarget);
  if (directIdx !== -1) {
    return {
      isMatched: true,
      matchedSkill: candidateSkills[directIdx],
      evidenceSource: 'skills_list',
    };
  }

  // 2. Substring or boundary match in candidate skills
  for (let i = 0; i < candidateSkills.length; i++) {
    const cSkill = normalizeSkill(candidateSkills[i]).toLowerCase();
    if (cSkill.includes(normTarget) || normTarget.includes(cSkill)) {
      return {
        isMatched: true,
        matchedSkill: candidateSkills[i],
        evidenceSource: 'skills_variation',
      };
    }
  }

  // 3. Search raw text with word boundaries
  if (candidateSourceText && typeof candidateSourceText === 'string') {
    const lowerText = candidateSourceText.toLowerCase();
    const regex = new RegExp(`\\b${normTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      return {
        isMatched: true,
        matchedSkill: normalizeSkill(targetSkill),
        evidenceSource: 'resume_body_text',
      };
    }
  }

  return {
    isMatched: false,
    matchedSkill: null,
    evidenceSource: 'none',
  };
};
