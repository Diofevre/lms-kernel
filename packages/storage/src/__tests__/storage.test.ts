import { describe, it, expect } from "vitest";
import { buildS3Key } from "../upload.js";
import { detectMimeType, validateFile } from "../mime-validator.js";

describe("buildS3Key", () => {
  it("should create a key with prefix/uuid/filename format", () => {
    const key = buildS3Key("uploads", "report.pdf");
    const parts = key.split("/");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("uploads");
    expect(parts[1]).toMatch(/^[a-f0-9-]{36}$/); // UUID
    expect(parts[2]).toBe("report.pdf");
  });

  it("should sanitize special characters in filenames", () => {
    const key = buildS3Key("docs", "file with spaces & (special) chars!.pdf");
    const filename = key.split("/")[2]!;
    expect(filename).not.toContain(" ");
    expect(filename).not.toContain("&");
    expect(filename).not.toContain("(");
    expect(filename).not.toContain("!");
  });

  it("should truncate filenames longer than 200 chars", () => {
    const longName = "a".repeat(300) + ".pdf";
    const key = buildS3Key("docs", longName);
    const filename = key.split("/")[2]!;
    expect(filename.length).toBeLessThanOrEqual(200);
  });

  it("should generate unique keys for the same filename", () => {
    const k1 = buildS3Key("uploads", "file.pdf");
    const k2 = buildS3Key("uploads", "file.pdf");
    expect(k1).not.toBe(k2); // Different UUIDs
  });

  it("should preserve safe characters (dots, hyphens, underscores)", () => {
    const key = buildS3Key("uploads", "my-file_v2.0.pdf");
    const filename = key.split("/")[2]!;
    expect(filename).toBe("my-file_v2.0.pdf");
  });
});

describe("detectMimeType", () => {
  it("should detect JPEG from magic bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectMimeType(buf)).toBe("image/jpeg");
  });

  it("should detect PNG from magic bytes", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    expect(detectMimeType(buf)).toBe("image/png");
  });

  it("should detect GIF from magic bytes", () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39]);
    expect(detectMimeType(buf)).toBe("image/gif");
  });

  it("should detect PDF from magic bytes", () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(detectMimeType(buf)).toBe("application/pdf");
  });

  it("should detect ZIP from magic bytes", () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(detectMimeType(buf)).toBe("application/zip");
  });

  it("should return null for unknown types", () => {
    const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectMimeType(buf)).toBeNull();
  });

  it("should return null for too-short buffers", () => {
    const buf = Buffer.from([0xff, 0xd8]);
    expect(detectMimeType(buf)).toBeNull();
  });
});

describe("validateFile", () => {
  const options = {
    allowedTypes: ["image/jpeg", "image/png", "application/pdf"],
    maxSizeBytes: 1024,
  };

  it("should accept a valid JPEG file", () => {
    const buf = Buffer.alloc(100);
    buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff;
    const result = validateFile(buf, "image/jpeg", options);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject a file exceeding maxSizeBytes", () => {
    const buf = Buffer.alloc(2048);
    const result = validateFile(buf, "image/jpeg", options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("maximum size");
  });

  it("should reject a disallowed MIME type", () => {
    const buf = Buffer.alloc(100);
    const result = validateFile(buf, "text/plain", options);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("not allowed");
  });

  it("should use detected MIME over declared when magic bytes match", () => {
    // Buffer with PDF magic bytes but declared as text/plain
    const buf = Buffer.alloc(100);
    buf[0] = 0x25; buf[1] = 0x50; buf[2] = 0x44; buf[3] = 0x46;
    const result = validateFile(buf, "text/plain", options);
    // detectMimeType returns "application/pdf" which IS allowed
    expect(result.valid).toBe(true);
  });
});
