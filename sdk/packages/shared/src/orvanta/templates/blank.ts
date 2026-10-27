export const BLANK_PROFILE_TEMPLATE = `---
id: new_agent
displayName: New Agent
description: ""
role: teammate
providerId: null
modelId: null
maxIterations: 40
temperature: null
tools:
  allow: [read_files, grep, list_files]
  deny: [team_spawn_teammate]
scopePaths:
  allow: ["**/*"]
  denyWrite:
    - ".orvanta/purpose.md"
    - ".orvanta/company.json"
    - ".orvanta/org/roster.json"
---

Mô tả vai trò và nhiệm vụ của agent này.
`;
