import { describe, it, expect } from "vitest";
import { ALL_JOB_STATUSES, STATUS_STYLE, GROUPS } from "./status";
import en from "@/i18n/messages/en.json";
import hi from "@/i18n/messages/hi.json";
import hiLatn from "@/i18n/messages/hi-Latn.json";

describe("Job Status and Styles", () => {
  it("every JobStatus has a defined style with badge and dot classes", () => {
    expect(ALL_JOB_STATUSES).toHaveLength(10);

    for (const status of ALL_JOB_STATUSES) {
      const style = STATUS_STYLE[status];
      expect(style, `Missing STATUS_STYLE for ${status}`).toBeDefined();
      expect(style.badge).toBeTruthy();
      expect(style.dot).toBeTruthy();
    }
  });

  it("every JobStatus has a translation key in all 3 locales", () => {
    const locales = [
      { name: "en", json: en },
      { name: "hi", json: hi },
      { name: "hi-Latn", json: hiLatn },
    ];

    for (const { name, json } of locales) {
      const jobsStatus = (json as Record<string, unknown>).jobs as {
        status?: Record<string, string>;
      };
      expect(jobsStatus, `Missing jobs namespace in ${name}.json`).toBeDefined();
      expect(jobsStatus.status, `Missing jobs.status in ${name}.json`).toBeDefined();

      for (const status of ALL_JOB_STATUSES) {
        const text = jobsStatus.status?.[status];
        expect(text, `Missing jobs.status.${status} in ${name}.json`).toBeTruthy();
      }
    }
  });

  it("every group in GROUPS contains valid JobStatus values", () => {
    const expectedGroups = ["pending", "in_progress", "repaired", "delivered", "closed"];
    expect(Object.keys(GROUPS)).toEqual(expect.arrayContaining(expectedGroups));

    for (const [groupName, statuses] of Object.entries(GROUPS)) {
      expect(statuses.length, `Group ${groupName} should not be empty`).toBeGreaterThan(0);
      for (const s of statuses) {
        expect(ALL_JOB_STATUSES).toContain(s);
      }
    }
  });
});
