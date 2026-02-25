# Module Contract — How to create a LMS Kernel module

> Every module MUST follow this contract. The CI compliance gate enforces it.

## 1. File structure

```
modules/your-module/
├── package.json          ← name: "@lms/your-module"
├── tsconfig.json
├── src/
│   ├── module.ts         ← KernelModule implementation (REQUIRED)
│   ├── your-module.module.ts   ← NestJS module
│   ├── your-module.controller.ts
│   ├── your-module.service.ts
│   └── dto/
│       ├── create-*.dto.ts
│       └── update-*.dto.ts
├── tests/
│   ├── unit/
│   └── e2e/
└── PRIVACY_IMPACT.md     ← Required if module collects PII
```

## 2. KernelModule implementation (module.ts)

```typescript
import type { KernelModule, KernelContext } from "@lms/core";

export const yourModule: KernelModule = {
  id: "your-module",              // Unique ID — kebab-case
  name: "Your Module Name",
  version: "0.1.0",
  dependencies: ["auth"],         // Other module IDs required before init

  async onInit(ctx: KernelContext) {
    ctx.logger.info("Initializing");
    // Subscribe to events from other modules
    ctx.on("user.created", async (event) => {
      // Handle user creation
    });
  },

  async onReady(ctx: KernelContext) {
    // Called after all modules are initialized
    ctx.logger.info("Ready");
  },

  async onDestroy() {
    // Cleanup: close connections, flush buffers
  },
};
```

## 3. NestJS module rules

- Every controller route MUST have `@UseGuards(AuthGuard)` unless explicitly `@Public()`
- Every mutating route must have a Swagger `@ApiOperation` description
- All input must go through a DTO with `class-validator` decorators
- Never return `any` — always typed response

```typescript
@Post()
@UseGuards(AuthGuard)
@Roles("instructor", "tenant_admin")
@ApiOperation({ summary: "Create course" })
async createCourse(@Body() dto: CreateCourseDto): Promise<CourseResponseDto> {
  // ...
}
```

## 4. Database / Prisma rules

- Every entity MUST have: `id`, `tenantId`, `createdAt`, `updatedAt`
- Entities with PII MUST have: `consentId` (FK to consent table)
- Every PII field MUST have a `@RetentionPolicy` comment (days)
- Soft-delete only (`deletedAt: DateTime?`) — never hard-delete

```prisma
model Course {
  id        String   @id @default(uuid())
  tenantId  String   // RLS enforced at DB level
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Soft delete only

  @@index([tenantId])
}
```

## 5. Loi 25 compliance checklist

For any module that collects personal data:

- [ ] `PRIVACY_IMPACT.md` created and filled
- [ ] Consent collected before PII storage (`consent_id` FK)
- [ ] Retention policy declared for each PII field (days)
- [ ] Data subject API endpoints exist (access, correction, deletion)
- [ ] PII encrypted at rest (AES-256 for sensitive fields)
- [ ] Biometric data (proctoring) requires explicit ÉFVP annotation

## 6. WCAG 2.1 AA checklist (frontend components)

- [ ] Use Shadcn/Radix components — accessible by default
- [ ] All interactive elements have visible focus indicator
- [ ] All images have meaningful `alt` text (empty `alt=""` for decorative)
- [ ] All form inputs have associated `<label>` or `aria-label`
- [ ] Color contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- [ ] No content flashes more than 3 times per second
- [ ] All functionality available via keyboard

## 7. Eventing (inter-module communication)

Modules MUST NOT import from each other directly. Use the event bus:

```typescript
// Emitting (in courses module)
await ctx.emit({
  type: "course.published",
  payload: { courseId, tenantId },
  timestamp: new Date().toISOString(),
  source: "courses-video",
  correlationId: randomUUID(),
});

// Subscribing (in notification module)
ctx.on<{ courseId: string; tenantId: string }>("course.published", async (event) => {
  // Send notifications
});
```

## 8. Package.json template

```json
{
  "name": "@lms/your-module",
  "version": "0.1.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint src --ext .ts",
    "test": "vitest run --coverage"
  },
  "dependencies": {
    "@lms/core": "workspace:*"
  }
}
```
