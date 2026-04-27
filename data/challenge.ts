import type { CandidateReplay, Challenge } from "@/lib/types";

export const challenge: Challenge = {
  id: "construction-upload-ai-slop",
  title: "AI Slop Review: Contractor Safety Document Upload",
  role: "Full-stack Developer",
  timeboxMinutes: 25,
  scenario:
    "An AI assistant generated an Express endpoint for uploading contractor safety and insurance documents to a construction project portal. Review it before it ships to production.",
  files: [
    {
      path: "server/routes/projectDocuments.ts",
      language: "ts",
      code: `import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db } from "../db";
import { requireUser } from "../middleware/auth";

const router = express.Router();
const upload = multer({ dest: "/tmp/proveit-uploads" });

router.post(
  "/projects/:projectId/contractors/:contractorId/documents",
  requireUser,
  upload.single("document"),
  async (req, res) => {
    const { projectId, contractorId } = req.params;
    const user = req.user!;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Missing document" });
    }

    const contractor = await db.contractors.findById(contractorId);
    if (!contractor) {
      return res.status(404).json({ error: "Contractor not found" });
    }

    console.log(
      "uploading safety doc",
      user.email,
      contractor.legalName,
      file.originalname
    );

    const safeName = file.originalname;
    const targetPath = path.join(
      process.env.DOCUMENT_ROOT || "/var/app/documents",
      projectId,
      contractorId,
      safeName
    );

    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    res.status(201).json({
      ok: true,
      url: \`/documents/\${projectId}/\${contractorId}/\${safeName}\`
    });

    await fs.rename(file.path, targetPath);

    await db.documents.insert({
      projectId,
      contractorId,
      uploadedBy: user.id,
      fileName: safeName,
      path: targetPath,
      status: "pending_review"
    });
  }
);

export default router;`
    },
    {
      path: "server/routes/projectDocuments.test.ts",
      language: "ts",
      code: `import request from "supertest";
import app from "../app";

describe("contractor document upload", () => {
  it("uploads a contractor document", async () => {
    const response = await request(app)
      .post("/projects/p-100/contractors/c-200/documents")
      .set("Authorization", "Bearer valid-token")
      .attach("document", Buffer.from("fake pdf"), "clearance-letter.pdf");

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.url).toContain("clearance-letter.pdf");
  });
});`
    }
  ],
  rubric: [
    {
      id: "tenant-auth",
      title: "Missing project membership and tenant authorization",
      category: "security",
      severity: "critical",
      weight: 24,
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 20,
      lineEnd: 24,
      expectedEvidence:
        "The endpoint trusts projectId and contractorId from the URL after only checking authentication. It never verifies the user belongs to the project or that the contractor belongs to that project.",
      seniorSignal:
        "A strong reviewer calls out cross-tenant document access and requires a scoped lookup such as findContractorForProject(projectId, contractorId, user.orgId)."
    },
    {
      id: "path-traversal",
      title: "Original filename is used as a filesystem path segment",
      category: "security",
      severity: "critical",
      weight: 22,
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 37,
      lineEnd: 45,
      expectedEvidence:
        "file.originalname can contain path separators or hostile names. Passing it through path.join can write outside the intended document directory or overwrite sensitive files.",
      seniorSignal:
        "A senior candidate suggests server-generated object keys, basename normalization is not enough, and storage outside web-served paths."
    },
    {
      id: "file-validation",
      title: "No file type, size, or malware-oriented validation",
      category: "security",
      severity: "high",
      weight: 17,
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 8,
      lineEnd: 18,
      expectedEvidence:
        "multer is configured without file size limits or MIME/content checks, and the route accepts any uploaded bytes as a contractor safety document.",
      seniorSignal:
        "A useful finding names both size limits and content validation, not only checking the file extension."
    },
    {
      id: "pii-logging",
      title: "Sensitive company and user data is logged",
      category: "maintainability",
      severity: "medium",
      weight: 9,
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 26,
      lineEnd: 32,
      expectedEvidence:
        "The route logs user email, contractor legal name, and original filename, which may contain sensitive worker or company information.",
      seniorSignal:
        "A strong reviewer proposes structured logs with request IDs and redacted identifiers."
    },
    {
      id: "success-before-durability",
      title: "Success response is sent before storage and database writes complete",
      category: "correctness",
      severity: "high",
      weight: 16,
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 49,
      lineEnd: 67,
      expectedEvidence:
        "The API returns 201 before fs.rename and db.documents.insert. The client may see success even if storage or persistence fails.",
      seniorSignal:
        "The candidate should notice response timing and suggest moving the response after durable operations with error handling."
    },
    {
      id: "overwrite-idempotency",
      title: "Repeated uploads can overwrite existing documents",
      category: "correctness",
      severity: "medium",
      weight: 8,
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 37,
      lineEnd: 59,
      expectedEvidence:
        "The storage path is projectId/contractorId/originalname, so two uploads with the same name collide and a retry can overwrite a previous document.",
      seniorSignal:
        "A stronger answer proposes unique object keys, versioning, or idempotency keys."
    },
    {
      id: "happy-path-tests",
      title: "Test suite only verifies the happy path",
      category: "testing",
      severity: "medium",
      weight: 12,
      filePath: "server/routes/projectDocuments.test.ts",
      lineStart: 4,
      lineEnd: 14,
      expectedEvidence:
        "The test does not cover authorization boundaries, upload validation, storage failures, path traversal attempts, or database insert failures.",
      seniorSignal:
        "A useful test review names at least two production-risk cases and ties them to the rubric issues."
    }
  ]
};

export const candidateReplay: CandidateReplay = {
  candidate: {
    name: "Maya Chen",
    role: "Full-stack Developer",
    assessment: "AI Slop Review",
    submittedAt: "BuildDay replay"
  },
  comments: [
    {
      id: "c1",
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 20,
      lineEnd: 24,
      category: "security",
      severity: "critical",
      body:
        "This only confirms the user is authenticated. It does not prove the contractor belongs to the project or that this user can upload documents for that tenant. I would scope this lookup by projectId and the user's org/project membership."
    },
    {
      id: "c2",
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 37,
      lineEnd: 45,
      category: "security",
      severity: "critical",
      body:
        "Using originalname directly in the storage path is unsafe. A crafted filename can traverse directories or cause collisions. Generate a server-side object key and store the display name separately."
    },
    {
      id: "c3",
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 8,
      lineEnd: 18,
      category: "security",
      severity: "high",
      body:
        "multer has no file size limit or MIME/content validation. For safety documents, reject unexpected types and enforce size limits before accepting bytes."
    },
    {
      id: "c4",
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 49,
      lineEnd: 67,
      category: "correctness",
      severity: "high",
      body:
        "The route returns 201 before the file move and database insert complete. If either operation fails, the caller still sees success. Response should happen after durable storage and persistence."
    },
    {
      id: "c5",
      filePath: "server/routes/projectDocuments.test.ts",
      lineStart: 4,
      lineEnd: 14,
      category: "testing",
      severity: "medium",
      body:
        "The test only proves the happy path. I would add cases for unauthorized project access, bad file names, oversized files, and storage/database failure."
    },
    {
      id: "c6",
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 26,
      lineEnd: 32,
      category: "reasoning",
      severity: "low",
      body:
        "This log is useful for debugging, but I would make it structured and avoid printing raw email addresses in a shared log sink."
    }
  ]
};
