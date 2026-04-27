import type { CandidateReplay, Challenge } from "@/lib/types";
import { roughChallengePacks } from "@/data/roughChallenges";

export const challenge: Challenge = {
  id: "construction-upload-ai-slop",
  title: "AI Slop Review: Contractor Safety Document Upload",
  role: "Full-stack Developer",
  timeboxMinutes: 25,
  evaluatorSignal:
    "Strong practical reviewer. Probe cross-tenant security depth and operational hardening before final offer.",
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
      severity: "low",
      body:
        "The upload middleware is very permissive. I would at least think about file size limits and some validation before accepting arbitrary contractor document uploads."
    },
    {
      id: "c4",
      filePath: "server/routes/projectDocuments.ts",
      lineStart: 49,
      lineEnd: 67,
      category: "maintainability",
      severity: "medium",
      body:
        "This lower block is doing several responsibilities in one handler. It may be easier to maintain if storage and document persistence were extracted into a service."
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

export const vampiChallenge: Challenge = {
  id: "vampi-api-security-review",
  title: "API Security Review: VAmPI",
  role: "Backend/API Engineer",
  timeboxMinutes: 55,
  sourceName: "erev0s/VAmPI",
  sourceUrl: "https://github.com/erev0s/VAmPI",
  licenseNote: "Curated demo fixture inspired by VAmPI, an MIT-licensed vulnerable Flask REST API.",
  evaluatorSignal:
    "Strong API security review signal; follow up on authorization modeling and negative-path test depth.",
  scenario:
    "A compact Flask REST API based on the VAmPI vulnerable API training project is being reviewed before internal teams use it as a starter service. Review the scoped auth, user, and book endpoints for OWASP API risks.",
  files: [
    {
      path: "vampi/app.py",
      language: "py",
      code: `from flask import Flask, jsonify, request
import jwt
import sqlite3
from werkzeug.security import check_password_hash

app = Flask(__name__)
JWT_SECRET = "vampi-secret"

def db():
    return sqlite3.connect("vampi.db")

def current_user():
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "")
    if not token:
        return None
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        return None

@app.post("/users/v1/login")
def login():
    payload = request.get_json(force=True)
    row = db().execute(
        "select id, username, password_hash, is_admin from users where username = ?",
        (payload.get("username"),),
    ).fetchone()
    if not row or not check_password_hash(row[2], payload.get("password", "")):
        return jsonify({"error": "invalid username or password"}), 401
    token = jwt.encode({"id": row[0], "username": row[1], "admin": row[3]}, JWT_SECRET, algorithm="HS256")
    return jsonify({"auth_token": token})

@app.get("/users/v1")
def list_users():
    rows = db().execute("select id, username, email, password_hash, is_admin from users").fetchall()
    users = [
        {"id": r[0], "username": r[1], "email": r[2], "password_hash": r[3], "admin": r[4]}
        for r in rows
    ]
    return jsonify({"users": users})

@app.get("/books/v1/<book_id>")
def get_book(book_id):
    user = current_user()
    if not user:
        return jsonify({"error": "missing token"}), 401
    row = db().execute("select id, owner_id, title, secret from books where id = ?", (book_id,)).fetchone()
    if not row:
        return jsonify({"error": "book not found"}), 404
    return jsonify({"id": row[0], "owner_id": row[1], "title": row[2], "secret": row[3]})

@app.post("/users/v1/register")
def register():
    payload = request.get_json(force=True)
    db().execute(
        "insert into users(username, email, password_hash, is_admin) values (?, ?, ?, ?)",
        (payload["username"], payload["email"], payload["password"], payload.get("is_admin", False)),
    )
    db().commit()
    return jsonify(payload), 201

@app.get("/books/v1/search")
def search_books():
    title = request.args.get("title", "")
    sql = f"select id, title, owner_id from books where title like '%{title}%'"
    rows = db().execute(sql).fetchall()
    return jsonify({"books": [{"id": r[0], "title": r[1], "owner_id": r[2]} for r in rows]})`
    },
    {
      path: "vampi/test_api_security.py",
      language: "py",
      code: `def test_login_returns_token(client):
    response = client.post("/users/v1/login", json={"username": "alice", "password": "Password1"})
    assert response.status_code == 200
    assert "auth_token" in response.get_json()

def test_user_can_read_book(client, auth_headers):
    response = client.get("/books/v1/1", headers=auth_headers)
    assert response.status_code == 200
    assert response.get_json()["title"] == "alice private book"

def test_register_user(client):
    response = client.post(
        "/users/v1/register",
        json={"username": "new-user", "email": "new@example.com", "password": "Password1"},
    )
    assert response.status_code == 201`
    }
  ],
  rubric: [
    {
      id: "vampi-static-secret",
      title: "JWT signing secret is hardcoded and tokens have no expiry",
      category: "security",
      severity: "high",
      weight: 17,
      filePath: "vampi/app.py",
      lineStart: 7,
      lineEnd: 31,
      expectedEvidence:
        "The API signs tokens with a hardcoded secret and does not set exp, issuer, audience, rotation, or revocation controls.",
      seniorSignal:
        "A strong reviewer asks for environment-managed secrets, token expiry, explicit verification claims, and rotation strategy."
    },
    {
      id: "vampi-user-enumeration",
      title: "User listing exposes sensitive account fields",
      category: "security",
      severity: "critical",
      weight: 21,
      filePath: "vampi/app.py",
      lineStart: 34,
      lineEnd: 41,
      expectedEvidence:
        "The unauthenticated user listing returns emails, password hashes, and admin flags for every account.",
      seniorSignal:
        "A senior candidate calls out excessive data exposure and requires auth, field-level response allowlists, and admin-only access."
    },
    {
      id: "vampi-bola",
      title: "Book secret endpoint lacks object-level authorization",
      category: "security",
      severity: "critical",
      weight: 24,
      filePath: "vampi/app.py",
      lineStart: 43,
      lineEnd: 51,
      expectedEvidence:
        "Any authenticated user can request any book by id and receive owner_id and secret because the query never scopes the book to the current user.",
      seniorSignal:
        "A strong reviewer names BOLA/IDOR and suggests querying by both book id and current user id unless an admin policy explicitly allows access."
    },
    {
      id: "vampi-mass-assignment",
      title: "Registration trusts client-controlled privilege fields",
      category: "security",
      severity: "high",
      weight: 15,
      filePath: "vampi/app.py",
      lineStart: 53,
      lineEnd: 61,
      expectedEvidence:
        "The register endpoint accepts is_admin directly from the request payload, allowing privilege escalation through mass assignment.",
      seniorSignal:
        "A senior candidate asks for request allowlists, server-side role assignment, password hashing, and no echoing of raw payloads."
    },
    {
      id: "vampi-sql-injection",
      title: "Search query is assembled with unsanitized user input",
      category: "security",
      severity: "high",
      weight: 17,
      filePath: "vampi/app.py",
      lineStart: 63,
      lineEnd: 68,
      expectedEvidence:
        "The title parameter is interpolated into a SQL string, so a crafted query can alter the statement.",
      seniorSignal:
        "A strong reviewer requires parameterized queries and points out that validation alone is not the primary defense."
    },
    {
      id: "vampi-negative-tests",
      title: "Tests miss authorization and attack-path cases",
      category: "testing",
      severity: "medium",
      weight: 11,
      filePath: "vampi/test_api_security.py",
      lineStart: 1,
      lineEnd: 16,
      expectedEvidence:
        "The tests only cover happy paths and do not assert cross-user book access is forbidden, user listing is protected, admin registration is blocked, or SQL injection payloads are rejected.",
      seniorSignal:
        "A useful test review names concrete negative tests tied to OWASP API risks rather than generic coverage comments."
    }
  ]
};

export const vampiCandidateReplay: CandidateReplay = {
  candidate: {
    name: "Arjun Patel",
    role: "Backend/API Engineer",
    assessment: "API Security Review",
    submittedAt: "VAmPI replay"
  },
  comments: [
    {
      id: "vampi-c1",
      filePath: "vampi/app.py",
      lineStart: 43,
      lineEnd: 51,
      category: "security",
      severity: "critical",
      body:
        "This is a classic object-level authorization problem. The query fetches a book by id after only checking that a token exists, so any user can read another owner's secret. Scope by current user id or enforce an explicit admin policy."
    },
    {
      id: "vampi-c2",
      filePath: "vampi/app.py",
      lineStart: 36,
      lineEnd: 41,
      category: "security",
      severity: "critical",
      body:
        "The public user list exposes email, password_hash, and admin flags. That is excessive data exposure and account enumeration. This should require authorization and return an allowlisted response shape."
    },
    {
      id: "vampi-c3",
      filePath: "vampi/app.py",
      lineStart: 63,
      lineEnd: 68,
      category: "security",
      severity: "high",
      body:
        "The search endpoint builds SQL with an f-string using the title query parameter. Use a parameterized LIKE query instead of interpolating request input."
    },
    {
      id: "vampi-c4",
      filePath: "vampi/app.py",
      lineStart: 53,
      lineEnd: 61,
      category: "maintainability",
      severity: "medium",
      body:
        "Registration is trusting too much of the request payload, including admin-like fields. I would move this to an explicit allowlist and keep role assignment on the server side."
    },
    {
      id: "vampi-c5",
      filePath: "vampi/test_api_security.py",
      lineStart: 1,
      lineEnd: 16,
      category: "testing",
      severity: "medium",
      body:
        "These tests only cover happy paths. Add negative tests for unauthorized book access, user-list exposure, admin self-registration, and SQL injection payloads."
    }
  ]
};

export const reviewChallenges = [
  {
    challenge,
    replay: candidateReplay
  },
  {
    challenge: vampiChallenge,
    replay: vampiCandidateReplay
  },
  ...roughChallengePacks
];
