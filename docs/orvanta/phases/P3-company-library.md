# P3 — Lưu / Tải công ty (user library)

**Demo:** Ở `D:\orvanta` đã có đội 3 agent → Lưu tên `orvanta-core` → thấy `C:\Users\<bạn>\.orvanta\companies\orvanta-core\` (purpose + org, **không** state) → mở folder trống → Tải `orvanta-core` → Home đủ 3 agent + cùng prompt.

**Đọc:** [09-two-stores.md](../09-two-stores.md), [SPEC-company-library.md](../SPEC-company-library.md)

**Cấm P3:** copy `state/` `inbox/` `runs/` `secrets/` `memory/`; auto-save; merge roster; spawn.

## Code

```
sdk/packages/shared/src/orvanta/library.ts
  slugify(name): string
  LibraryIndex, LibraryMeta types + Zod
  SNAPSHOT_FILES allowlist

apps/vscode/src/orvanta/user-library-store.ts
  list(), save({ name, slug?, overwrite? }), load(slug, { replace })
  remove(slug)
  paths via homedir()
```

`save`:

1. `getCompany` workspace phải `ready` (P2 profiles gồm trong org/agents)
2. Atomic write snapshot allowlist
3. Roster snapshot: mọi status → `idle`, bỏ pending_*
4. `company.json` snapshot: bỏ `workspaceRoot` hoặc `""`
5. Patch `library.json`

`load`:

1. Validate snapshot (purpose + company + ≥1 lead)
2. Nếu workspace ready và `!replace` → error `needs_replace`
3. Nếu replace: `rm` workspace `.orvanta` rồi write
4. New `company.id`, timestamps, `workspaceRoot`, agents idle
5. subscribeCompany emit ready

Proto:

```proto
rpc listLibrary(EmptyRequest) returns (OrvantaLibraryList);
rpc saveCompanyToLibrary(OrvantaSaveLibraryRequest) returns (OrvantaLibraryList);
rpc loadCompanyFromLibrary(OrvantaLoadLibraryRequest) returns (OrvantaCompanyResponse);
rpc deleteLibraryCompany(StringRequest) returns (OrvantaLibraryList);

message OrvantaSaveLibraryRequest {
  string name = 1;
  string slug = 2; // empty = slugify(name)
  bool overwrite = 3;
}
message OrvantaLoadLibraryRequest {
  string slug = 1;
  bool replace = 2;
}
```

UI: `LibraryDialog.tsx` từ Home `···` và empty secondary. Dialog Lưu: name, slug preview, “N agent, không lưu task”. Dialog Tải: list + Tải + Xóa. `needs_replace` → modal confirm gọi lại `replace=true`.

## Tests

- slugify: `"Orvanta Core"` → `orvanta-core`
- save temp workspace → dest không chứa `inbox` / `state`
- save two slugs isolated
- overwrite false + exists → error
- load → new id, idle, purpose equal
- load replace true xóa inbox cũ
- `userOrvantaRoot()` kết thúc bằng `.orvanta` dưới `homedir()`

Dùng `os.tmpdir()` cho homedir giả: **inject** `rootDir` vào store constructor, test không ghi homedir thật. Production: `homedir()`.

```ts
export class UserLibraryStore {
  constructor(private readonly root = userOrvantaRoot()) {}
}
```

## Tasks

- [ ] Task: library types + slugify + test shared  
  - Verify: `bun -F @cline/shared test` + `build:sdk`

- [ ] Task: UserLibraryStore inject root + test  
  - Verify: unit vscode; sau test không còn rác `~/.orvanta/companies/orvanta-test-*` (dùng tmp)

- [ ] Task: proto + handlers  
  - Verify: `bun run protos`

- [ ] Task: LibraryDialog  
  - Verify tay: Lưu / Tải folder trống / Tải đè (cancel + confirm) / hai slug

## Done P3

- [ ] Demo sentence trên Windows path thật
- [ ] Explorer hiện đúng allowlist
- [ ] Workspace sau Load không có task nguồn
