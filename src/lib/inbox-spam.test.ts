import { describe, expect, it } from "vitest";
import { looksLikeSpam } from "./inbox-spam";

describe("looksLikeSpam", () => {
  it("flags the real contact-form spam pattern this was built for", () => {
    expect(
      looksLikeSpam({
        name: "Dear http://city2ranch.com/fekal0911 Admin",
        email: "pirduhina96@gmail.com",
        context: "Contact / Support",
        message: "Hi http://city2ranch.com/fekal0911 Owner\n\nHi http://city2ranch.com/fekal0911 Owner",
      })
    ).toBe(true);
  });

  it("does not flag a genuine customer contact message", () => {
    expect(
      looksLikeSpam({
        name: "Maria Gonzalez",
        email: "maria.gonzalez@gmail.com",
        context: "Question about recurring delivery",
        message: "Hi, I'd like to switch my weekly delivery to Tuesdays instead of Mondays if possible. Thanks!",
      })
    ).toBe(false);
  });

  it("does not flag a genuine customer mentioning a store's website", () => {
    expect(
      looksLikeSpam({
        name: "James Carter",
        email: "james.carter@outlook.com",
        context: "Can you shop from https://www.centralmarket.com next time?",
        message: null,
      })
    ).toBe(false);
  });

  it("flags a message with two or more raw links even without a URL in the name", () => {
    expect(
      looksLikeSpam({
        name: "Digital Marketing Team",
        email: "outreach@example.com",
        context: "Partnership opportunity",
        message: "Check out https://example.com/one and also https://example.com/two for more info.",
      })
    ).toBe(true);
  });

  it("does not flag a single unrelated mention of SEO without a URL", () => {
    expect(
      looksLikeSpam({
        name: "Pat Rivera",
        email: "pat@example.com",
        context: "Do you offer SEO services too?",
        message: null,
      })
    ).toBe(false);
  });
});
