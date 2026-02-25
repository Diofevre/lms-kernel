# Mission 03 — Video Courses Module

**Branch**: `feature/03-courses-video`
**Estimated complexity**: High
**Prerequisites**: Missions 01 + 02 completed and merged

---

## Objective

Implement the `courses-video` LMS module: upload, transcode, stream, and track progress.

## Module structure to create

```
modules/courses-video/
├── package.json         (@lms/courses-video)
├── src/
│   ├── module.ts        (KernelModule)
│   ├── courses-video.module.ts   (NestJS module)
│   ├── courses-video.controller.ts
│   ├── courses-video.service.ts
│   ├── video-upload.service.ts   (S3 multipart upload)
│   ├── transcode.job.ts          (BullMQ job)
│   └── dto/
│       ├── create-course.dto.ts
│       └── course-response.dto.ts
```

## Key requirements

### Storage
- Videos stored in S3 `ca-central-1` (Loi 25)
- Multipart upload for large files (> 100MB)
- Pre-signed URLs for secure streaming (expire in 1h)
- Never expose S3 URLs directly to clients

### Transcoding
- BullMQ job triggers FFmpeg transcoding after upload
- Output: 480p, 720p, 1080p HLS streams
- Progress tracked in DB

### Access control
- Students can only access courses they're enrolled in
- Instructors can upload to their courses only
- `tenant_admin` can see all courses in their tenant
- `super_admin` can see across tenants

### Accessibility (WCAG)
- Video player MUST support captions (WebVTT)
- Captions upload endpoint required
- Player must be keyboard-navigable (use accessible video player library)
- Transcript auto-generation endpoint (optional bonus)

### Database entities (add to Prisma schema)
```prisma
model Course {
  id          String   @id @default(uuid())
  tenantId    String
  title       String
  description String?
  instructorId String
  status      CourseStatus @default(DRAFT)
  videos      Video[]
  enrollments Enrollment[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?
  @@index([tenantId])
}

model Video {
  id        String      @id @default(uuid())
  courseId  String
  tenantId  String
  title     String
  s3Key     String      // private — never exposed directly
  duration  Int?        // seconds
  status    VideoStatus @default(PROCESSING)
  captionsS3Key String?
  createdAt DateTime    @default(now())
  @@index([courseId])
}

model Enrollment {
  id        String   @id @default(uuid())
  tenantId  String
  // @RetentionPolicy(days: 2555) — academic records 7 years
  userId    String
  courseId  String
  consentId String   // Loi 25: academic PII
  enrolledAt DateTime @default(now())
  @@unique([userId, courseId])
}
```

## Privacy / Loi 25

- Enrollment data = academic PII → `consentId` required
- Retention: academic records 7 years (2555 days)
- Create `PRIVACY_IMPACT.md` in module root

## Events to emit

```typescript
ctx.emit({ type: "course.published", payload: { courseId, tenantId, instructorId } })
ctx.emit({ type: "video.processing_complete", payload: { videoId, courseId } })
ctx.emit({ type: "student.enrolled", payload: { userId, courseId, tenantId } })
```

## Tests required

- [ ] Upload endpoint returns pre-signed S3 URL
- [ ] Only enrolled students can access video stream
- [ ] WCAG: video player has captions support
- [ ] BullMQ transcode job is queued on upload
- [ ] Cross-tenant access is blocked (RLS)
