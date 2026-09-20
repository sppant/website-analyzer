import { describe, expect, it } from "vitest";

import { canonicalHost, normalizeUrl, sameSite } from "../normalize.js";

describe("normalizeUrl", () => {
  it("drops the fragment", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe(
      "https://example.com/page",
    );
    expect(normalizeUrl("https://example.com/page#a")).toBe(
      normalizeUrl("https://example.com/page#b"),
    );
  });

  it("drops a trailing slash except on the root", () => {
    expect(normalizeUrl("https://example.com/about/")).toBe(
      "https://example.com/about",
    );
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("collapses /page, /page/ and /page#x to one", () => {
    const a = normalizeUrl("https://example.com/page");
    const b = normalizeUrl("https://example.com/page/");
    const c = normalizeUrl("https://example.com/page#section");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it("resolves relative URLs against a base", () => {
    expect(normalizeUrl("/about", "https://example.com/blog/post")).toBe(
      "https://example.com/about",
    );
    expect(normalizeUrl("../team", "https://example.com/blog/post")).toBe(
      "https://example.com/team",
    );
  });

  it("keeps query strings but sorts the parameters", () => {
    expect(normalizeUrl("https://example.com/s?b=2&a=1")).toBe(
      "https://example.com/s?a=1&b=2",
    );
    // Different values are still different pages.
    expect(normalizeUrl("https://example.com/p?id=1")).not.toBe(
      normalizeUrl("https://example.com/p?id=2"),
    );
  });

  it("lower-cases the host and drops a default port", () => {
    expect(normalizeUrl("https://EXAMPLE.com:443/x")).toBe(
      "https://example.com/x",
    );
    expect(normalizeUrl("http://Example.com:80/x")).toBe(
      "http://example.com/x",
    );
  });

  it("rejects non-http(s) and unparseable URLs", () => {
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("sameSite / canonicalHost", () => {
  it("treats www and bare host as the same site", () => {
    expect(
      sameSite(
        new URL("https://www.example.com/a"),
        new URL("https://example.com/b"),
      ),
    ).toBe(true);
  });

  it("treats a different host / subdomain as a different site", () => {
    expect(
      sameSite(
        new URL("https://blog.example.com"),
        new URL("https://example.com"),
      ),
    ).toBe(false);
    expect(
      sameSite(
        new URL("https://facebook.com"),
        new URL("https://example.com"),
      ),
    ).toBe(false);
  });

  it("canonicalHost strips one leading www. and lower-cases", () => {
    expect(canonicalHost("WWW.Example.com")).toBe("example.com");
  });
});
