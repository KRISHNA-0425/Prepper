# ⚡ Module 3: Adaptive Questioning & Real-Time Steering Engine

## Overview
Module 3 transforms static mock interviews into adaptive technical evaluations by dynamically steering question difficulty based on real-time candidate answers.

## Key Subsystems
- **Difficulty Tiers**:
  - `Beginner`: Definitions, basic patterns, core framework syntax.
  - `Intermediate`: Real-world implementation, trade-offs, edge-cases.
  - `Advanced`: Concurrency, distributed failures, internal runtimes, high-scale architecture.
- **Streak Evaluation Rules**:
  - Promotion: 2 consecutive answers with scores $\ge 80$ elevate the tier.
  - Demotion (Scaffolding): 2 consecutive answers with scores $< 50$ reduce the tier.
- **Anti-Looping Protection**:
  - Limits consecutive questions on a single topic to 2.
  - Automatically triggers topic cooldown and steers toward untested competencies.
- **Live UI Transition Banners**: Displays contextual feedback banners during tier transitions.
- **Section F Analytics**: Visualizes the candidate's trajectory progression, topic mastery heat maps, and steering decision trails.
