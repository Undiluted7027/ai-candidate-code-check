import type { CandidateReplay, Challenge } from "@/lib/types";

export const javaXxeChallenge: Challenge = {
  id: "java-xml-intake-review",
  title: "Vibe Coded OWASP XXE Vuln: Java XML Intake",
  role: "Application Security Engineer",
  timeboxMinutes: 50,
  sourceName: ".rough/challenge-05",
  licenseNote:
    "Curated ProveIt fixture expanded from the local secure-code-review-challenges XXE prototype in .rough.",
  evaluatorSignal:
    "Strong secure-code-review signal if the candidate catches XXE plus parser hardening, error handling, and negative tests.",
  scenario:
    "A vendor onboarding service accepts XML metadata from contractors and echoes a normalized XML document back to an internal workflow. Review the scoped Spring Boot controller and tests before the endpoint is reused in production.",
  files: [
    {
      path: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      language: "java",
      code: `package com.proveit.vendor;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.w3c.dom.Document;
import org.xml.sax.InputSource;

import java.io.StringReader;
import java.io.StringWriter;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

@RestController
public class XmlIntakeController {
    private final AuditLog auditLog = new AuditLog();

    @PostMapping(
        value = "/vendors/xml-intake",
        consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE,
        produces = MediaType.APPLICATION_XML_VALUE
    )
    public String processVendorXml(@RequestParam("inputXml") String inputXml) {
        if (inputXml == null || inputXml.isBlank()) {
            return "<error>Provide inputXml</error>";
        }

        try {
            auditLog.record("xml-intake-bytes=" + inputXml.length());

            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document document = builder.parse(new InputSource(new StringReader(inputXml)));

            document.getDocumentElement().normalize();
            auditLog.record("root=" + document.getDocumentElement().getNodeName());

            return toXml(document);
        } catch (Exception ex) {
            ex.printStackTrace();
            return "<error>" + ex.getMessage() + "</error>";
        }
    }

    private String toXml(Document document) {
        try {
            TransformerFactory transformerFactory = TransformerFactory.newInstance();
            Transformer transformer = transformerFactory.newTransformer();
            transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
            StringWriter writer = new StringWriter();
            transformer.transform(new DOMSource(document), new StreamResult(writer));
            return writer.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Could not serialize vendor XML", ex);
        }
    }
}

class AuditLog {
    void record(String message) {
        System.out.println(message);
    }
}`
    },
    {
      path: "src/test/java/com/proveit/vendor/XmlIntakeControllerTest.java",
      language: "java",
      code: `package com.proveit.vendor;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class XmlIntakeControllerTest {
    private final XmlIntakeController controller = new XmlIntakeController();

    @Test
    void normalizesVendorXml() {
        String result = controller.processVendorXml("<vendor><name>BuildCo</name></vendor>");
        assertThat(result).contains("<vendor>");
        assertThat(result).contains("BuildCo");
    }

    @Test
    void returnsErrorWhenInputIsBlank() {
        String result = controller.processVendorXml(" ");
        assertThat(result).contains("Provide inputXml");
    }
}`
    }
  ],
  rubric: [
    {
      id: "java-xxe-doctype",
      title: "XML parser allows doctypes and external entity expansion",
      category: "security",
      severity: "critical",
      weight: 25,
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 37,
      lineEnd: 40,
      expectedEvidence:
        "DocumentBuilderFactory is created without disabling doctypes, external general/parameter entities, external DTDs, XInclude, or entity expansion.",
      seniorSignal:
        "A strong reviewer names XXE and asks for explicit parser features plus secure processing before parsing untrusted XML."
    },
    {
      id: "java-xml-size-dos",
      title: "Untrusted XML has no size or entity-expansion limits",
      category: "security",
      severity: "high",
      weight: 16,
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 29,
      lineEnd: 40,
      expectedEvidence:
        "The endpoint accepts the entire form value and parses it synchronously with no payload size guard, parse timeout, or protection against entity expansion denial of service.",
      seniorSignal:
        "A senior candidate connects parser hardening with request-size limits and denial-of-service controls, not only data exfiltration."
    },
    {
      id: "java-error-disclosure",
      title: "Exception details are logged and returned to the caller",
      category: "maintainability",
      severity: "medium",
      weight: 10,
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 46,
      lineEnd: 48,
      expectedEvidence:
        "The controller prints stack traces and returns raw exception messages inside XML, potentially exposing filesystem paths, parser configuration, or internals.",
      seniorSignal:
        "A useful review asks for structured server-side logging with request IDs and a generic client-facing error."
    },
    {
      id: "java-transformer-hardening",
      title: "TransformerFactory is not hardened for XML serialization",
      category: "security",
      severity: "medium",
      weight: 12,
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 54,
      lineEnd: 58,
      expectedEvidence:
        "TransformerFactory is created without secure processing or external stylesheet/access restrictions, leaving another XML processing surface unconfigured.",
      seniorSignal:
        "A strong candidate recognizes parser hardening must cover every XML processor, not just DocumentBuilderFactory."
    },
    {
      id: "java-content-type",
      title: "Endpoint accepts XML through form encoding without schema validation",
      category: "correctness",
      severity: "medium",
      weight: 9,
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 24,
      lineEnd: 29,
      expectedEvidence:
        "The endpoint advertises form-urlencoded input and accepts arbitrary XML text without validating expected schema or media type boundaries.",
      seniorSignal:
        "A good reviewer suggests explicit XML media type, schema validation when business rules require it, and rejecting unexpected shapes."
    },
    {
      id: "java-xml-tests",
      title: "Tests only cover normal XML and blank input",
      category: "testing",
      severity: "medium",
      weight: 12,
      filePath: "src/test/java/com/proveit/vendor/XmlIntakeControllerTest.java",
      lineStart: 10,
      lineEnd: 20,
      expectedEvidence:
        "The tests do not cover XXE payloads, doctypes, oversized XML, malformed XML, or generic error responses.",
      seniorSignal:
        "A senior review proposes negative tests for malicious XML and confirms secure parser configuration is observable."
    }
  ]
};

export const javaXxeReplay: CandidateReplay = {
  candidate: {
    name: "Nora Singh",
    role: "Application Security Engineer",
    assessment: "Secure Code Review",
    submittedAt: "XXE replay"
  },
  comments: [
    {
      id: "java-c1",
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 37,
      lineEnd: 40,
      category: "security",
      severity: "critical",
      body:
        "This parser accepts untrusted XML without disabling doctypes or external entities, so it is vulnerable to XXE. Configure DocumentBuilderFactory to disallow doctypes, disable external general and parameter entities, disable external DTD loading, turn off XInclude, and enable secure processing."
    },
    {
      id: "java-c2",
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 29,
      lineEnd: 40,
      category: "correctness",
      severity: "medium",
      body:
        "This endpoint accepts the whole payload and parses it synchronously. I would add size limits because large documents or expansion patterns could create availability problems."
    },
    {
      id: "java-c3",
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 46,
      lineEnd: 48,
      category: "maintainability",
      severity: "medium",
      body:
        "Returning ex.getMessage() and printing the stack trace can leak parser internals. Log a request id server-side and return a generic malformed XML error."
    },
    {
      id: "java-c4",
      filePath: "src/main/java/com/proveit/vendor/XmlIntakeController.java",
      lineStart: 54,
      lineEnd: 58,
      category: "maintainability",
      severity: "low",
      body:
        "This serialization helper is doing low-level XML work inline. It may be cleaner to wrap it in a shared utility with consistent behavior."
    },
    {
      id: "java-c5",
      filePath: "src/test/java/com/proveit/vendor/XmlIntakeControllerTest.java",
      lineStart: 10,
      lineEnd: 20,
      category: "testing",
      severity: "medium",
      body:
        "The tests only cover normal XML and blank input. Add negative tests for XXE payloads, disallowed doctypes, oversized XML, and malformed XML."
    }
  ]
};

export const goCommandInjectionChallenge: Challenge = {
  id: "go-diagnostics-command-review",
  title: "AI Taking Over Your OS: Go Diagnostics API",
  role: "Backend Security Engineer",
  timeboxMinutes: 50,
  sourceName: ".rough/challenge-17",
  licenseNote:
    "Curated ProveIt fixture expanded from the local secure-code-review-challenges command-injection prototype in .rough.",
  evaluatorSignal:
    "Strong backend security signal if the candidate catches shell injection, weak admin controls, resource limits, and test gaps.",
  scenario:
    "A small internal diagnostics service lets support engineers ping customer infrastructure during incident triage. Review the scoped Go service and tests before it is deployed into a private operations network.",
  files: [
    {
      path: "cmd/diagnostics/main.go",
      language: "go",
      code: `package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
)

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		expected := os.Getenv("ADMIN_TOKEN")
		if expected == "" {
			expected = "dev-admin"
		}
		if r.Header.Get("X-Admin-Token") != expected {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		next(w, r)
	}
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	count := r.URL.Query().Get("count")
	if host == "" {
		http.Error(w, "Please provide a host", http.StatusBadRequest)
		return
	}
	if count == "" {
		count = "3"
	}

	command := fmt.Sprintf("ping -c %s %s", count, host)
	log.Printf("running diagnostic command: %s", command)
	cmd := exec.Command("sh", "-c", command)
	output, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, fmt.Sprintf("diagnostic failed: %s", output), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain")
	w.WriteHeader(http.StatusOK)
	w.Write(output)
}

func traceHandler(w http.ResponseWriter, r *http.Request) {
	host := r.URL.Query().Get("host")
	if host == "" {
		http.Error(w, "Please provide a host", http.StatusBadRequest)
		return
	}

	cmd := exec.Command("sh", "-c", fmt.Sprintf("traceroute %s", host))
	output, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, fmt.Sprintf("trace failed: %v %s", err, output), http.StatusInternalServerError)
		return
	}
	w.Write(output)
}

func main() {
	http.HandleFunc("/diagnostics/ping", requireAdmin(pingHandler))
	http.HandleFunc("/diagnostics/trace", requireAdmin(traceHandler))

	fmt.Println("Diagnostics service running on port 5000")
	log.Fatal(http.ListenAndServe(":5000", nil))
}`
    },
    {
      path: "cmd/diagnostics/main_test.go",
      language: "go",
      code: `package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPingRequiresHost(t *testing.T) {
	req := httptest.NewRequest("GET", "/diagnostics/ping", nil)
	req.Header.Set("X-Admin-Token", "dev-admin")
	rr := httptest.NewRecorder()

	requireAdmin(pingHandler)(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", rr.Code)
	}
}

func TestAdminTokenAllowsRequest(t *testing.T) {
	req := httptest.NewRequest("GET", "/diagnostics/ping?host=127.0.0.1&count=1", nil)
	req.Header.Set("X-Admin-Token", "dev-admin")
	rr := httptest.NewRecorder()

	requireAdmin(pingHandler)(rr, req)

	if rr.Code == http.StatusUnauthorized {
		t.Fatalf("expected authorized request")
	}
}`
    }
  ],
  rubric: [
    {
      id: "go-command-injection-shell",
      title: "Host and count are interpolated into a shell command",
      category: "security",
      severity: "critical",
      weight: 26,
      filePath: "cmd/diagnostics/main.go",
      lineStart: 36,
      lineEnd: 39,
      expectedEvidence:
        "The handler builds a command string from query parameters and executes it through sh -c, allowing shell metacharacters in host or count to run arbitrary commands.",
      seniorSignal:
        "A strong reviewer recommends avoiding shell execution, using a safe library where possible, or invoking a binary directly with strict allowlisted arguments."
    },
    {
      id: "go-unbounded-process",
      title: "Diagnostics commands have no timeout or resource guard",
      category: "correctness",
      severity: "high",
      weight: 15,
      filePath: "cmd/diagnostics/main.go",
      lineStart: 25,
      lineEnd: 39,
      expectedEvidence:
        "count is not bounded and exec.Command is used without context or timeout, so requests can hang or consume resources.",
      seniorSignal:
        "A senior candidate suggests context.WithTimeout, maximum counts, request cancellation, and concurrency limits."
    },
    {
      id: "go-weak-admin-token",
      title: "Admin authorization falls back to a hardcoded default token",
      category: "security",
      severity: "high",
      weight: 18,
      filePath: "cmd/diagnostics/main.go",
      lineStart: 11,
      lineEnd: 20,
      expectedEvidence:
        "If ADMIN_TOKEN is missing, the service accepts the hardcoded dev-admin token in production-like paths.",
      seniorSignal:
        "A strong reviewer asks the service to fail closed when secrets are missing and use proper internal auth rather than a shared header token."
    },
    {
      id: "go-network-recon",
      title: "Endpoint can be abused for internal network reconnaissance",
      category: "security",
      severity: "medium",
      weight: 12,
      filePath: "cmd/diagnostics/main.go",
      lineStart: 50,
      lineEnd: 58,
      expectedEvidence:
        "The trace endpoint also accepts arbitrary hosts, so a caller with the token can scan internal addresses and metadata endpoints from the service network.",
      seniorSignal:
        "A useful review proposes target allowlists, customer/account scoping, rate limiting, and audit trails."
    },
    {
      id: "go-output-disclosure",
      title: "Raw command output and errors are returned to callers",
      category: "maintainability",
      severity: "medium",
      weight: 10,
      filePath: "cmd/diagnostics/main.go",
      lineStart: 57,
      lineEnd: 63,
      expectedEvidence:
        "The trace endpoint returns raw command output and command failure details, which can expose internal hostnames, routes, or environment-specific errors.",
      seniorSignal:
        "A strong reviewer separates operator-safe diagnostics from client responses and stores raw output behind audited access."
    },
    {
      id: "go-negative-tests",
      title: "Tests miss injection, auth failure, and timeout cases",
      category: "testing",
      severity: "medium",
      weight: 11,
      filePath: "cmd/diagnostics/main_test.go",
      lineStart: 9,
      lineEnd: 31,
      expectedEvidence:
        "The tests cover missing host and nominal authorization but not command injection payloads, missing/incorrect token, large count, timeout, or internal target blocking.",
      seniorSignal:
        "A good test review maps negative cases to the attack paths rather than simply asking for more coverage."
    }
  ]
};

export const goCommandInjectionReplay: CandidateReplay = {
  candidate: {
    name: "Mateo Alvarez",
    role: "Backend Security Engineer",
    assessment: "Secure Code Review",
    submittedAt: "Command injection replay"
  },
  comments: [
    {
      id: "go-c1",
      filePath: "cmd/diagnostics/main.go",
      lineStart: 36,
      lineEnd: 39,
      category: "security",
      severity: "critical",
      body:
        "This is OS command injection. host and count are interpolated into a shell command and run with sh -c. Avoid the shell entirely; call ping directly with validated arguments or use a library."
    },
    {
      id: "go-c2",
      filePath: "cmd/diagnostics/main.go",
      lineStart: 11,
      lineEnd: 20,
      category: "security",
      severity: "high",
      body:
        "The admin check falls back to a hardcoded dev-admin token when ADMIN_TOKEN is missing. The service should fail closed and use real internal auth rather than a shared header secret."
    },
    {
      id: "go-c3",
      filePath: "cmd/diagnostics/main.go",
      lineStart: 25,
      lineEnd: 39,
      category: "correctness",
      severity: "low",
      body:
        "The request controls count and the process has no timeout. I would clamp count and add a context timeout so the diagnostic command cannot run forever."
    },
    {
      id: "go-c4",
      filePath: "cmd/diagnostics/main.go",
      lineStart: 25,
      lineEnd: 39,
      category: "maintainability",
      severity: "low",
      body:
        "The handler has a lot of request parsing and command assembly in one place. It would be easier to maintain if the diagnostic target handling were extracted."
    },
    {
      id: "go-c5",
      filePath: "cmd/diagnostics/main_test.go",
      lineStart: 9,
      lineEnd: 31,
      category: "testing",
      severity: "medium",
      body:
        "The tests miss the attack paths: injection payloads, wrong/missing token, huge count, timeout behavior, and internal target blocking."
    }
  ]
};

export const roughChallengePacks = [
  {
    challenge: javaXxeChallenge,
    replay: javaXxeReplay
  },
  {
    challenge: goCommandInjectionChallenge,
    replay: goCommandInjectionReplay
  }
];
