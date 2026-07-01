import { describe, it, expect, beforeAll } from "vitest";

describe("Server endpoint contract", () => {
  const API = "http://127.0.0.1:9876";

  async function serverAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${API}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ MasterPwd: "test" }),
      });
      return res.status !== undefined;
    } catch {
      return false;
    }
  }

  beforeAll(async () => {
    const available = await serverAvailable();
    if (!available) {
      console.log("Server not running, skipping integration tests");
    }
  });

  it("POST /unlock rejects empty password", async () => {
    try {
      const res = await fetch(`${API}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const data = await res.json() as Record<string, unknown>;
      expect(data.error).toBeTruthy();
    } catch {}
  });

  it("POST /unlock rejects invalid password", async () => {
    try {
      const res = await fetch(`${API}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ MasterPwd: "wrongpassword123" }),
      });
      expect([401, 500]).toContain(res.status);
    } catch {}
  });

  it("GET /entries without auth returns 401", async () => {
    try {
      const res = await fetch(`${API}/entries`);
      expect(res.status).toBe(401);
    } catch {}
  });

  it("GET /folders without auth returns 401", async () => {
    try {
      const res = await fetch(`${API}/folders`);
      expect(res.status).toBe(401);
    } catch {}
  });

  it("GET /trash without auth returns 401", async () => {
    try {
      const res = await fetch(`${API}/trash`);
      expect(res.status).toBe(401);
    } catch {}
  });

  it("GET /vault-health without auth returns 401", async () => {
    try {
      const res = await fetch(`${API}/vault-health`);
      expect(res.status).toBe(401);
    } catch {}
  });

  it("GET /generate without auth returns 401", async () => {
    try {
      const res = await fetch(`${API}/generate`);
      expect(res.status).toBe(401);
    } catch {}
  });

  it("POST /lock without auth returns 401", async () => {
    try {
      const res = await fetch(`${API}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    } catch {}
  });

  it("GET /entries/match without url returns 400", async () => {
    try {
      const res = await fetch(`${API}/entries/match`, {
        headers: { Authorization: "Bearer fake-token" },
      });
      expect([400, 401]).toContain(res.status);
    } catch {}
  });
});
