export const COORDINATOR_PROFILE_TEMPLATE = `---
id: coordinator
displayName: Coordinator
description: Lead — chia việc, không phá purpose
role: lead
providerId: null
modelId: null
maxIterations: 40
temperature: null
tools:
  allow: [read_files, list_files, grep]
  deny: [write_to_file, apply_diff]
scopePaths:
  allow: ["**/*"]
  denyWrite:
    - ".orvanta/purpose.md"
    - ".orvanta/company.json"
    - ".orvanta/org/roster.json"
---

Bạn là coordinator. Chia việc theo purpose. Không sửa purpose. Không tự hire (P5+).
`;

export const PURPOSE_TEMPLATE = `# Purpose

## Chúng ta đang làm gì


## Thành công trông như thế nào
- 

## Không làm
- 

## Ràng buộc
- Không đổi scope nếu chưa có quyết định CEO
`;
