# P9 — War room D-full

**Demo:** Card implementer hiện chữ đang stream.

**Phụ thuộc:** host có assistant delta của teammate. Trước khi code: đọc `AgentTeamsRuntime` / hub events. **Không có surface → dừng, ghi ADR, không giả stream bằng poll transcript.**

## Việc

- Bridge event teammate → card
- Virtualize > 12
- Layout 1/2/3 cột
- Cost trên expand nếu có

## Tasks

- [ ] Task: spike ½ ngày — event có/không (ghi kết quả vào PR)  
- [ ] Task: stream UI chỉ khi spike OK  
- [ ] Verify D-full checklist

## Done P9

- [ ] Live token hoặc tài liệu “không ship vì runtime”
