import { describe, expect, test } from "bun:test";
import { tryDecodeBase64ItemText } from "./base64";

const QUIVER_BASE64 =
  "SXRlbSBDbGFzczogUXVpdmVycwpSYXJpdHk6IFJhcmUKS3Jha2VuIEJvbHQKUGVuZXRyYXRpbmcgUXVpdmVyCi0tLS0tLS0tClJlcXVpcmVzOiBMZXZlbCA1NQotLS0tLS0tLQpJdGVtIExldmVsOiA3NQotLS0tLS0tLQoxMDAlIGNoYW5jZSB0byBQaWVyY2UgYW4gRW5lbXkgKGltcGxpY2l0KQotLS0tLS0tLQpBZGRzIDkgdG8gMTQgUGh5c2ljYWwgRGFtYWdlIHRvIEF0dGFja3MKQWRkcyAxMyB0byAxOCBDb2xkIGRhbWFnZSB0byBBdHRhY2tzCkFkZHMgMSB0byAzNiBMaWdodG5pbmcgZGFtYWdlIHRvIEF0dGFja3MKMTMlIGNoYW5jZSB0byBQaWVyY2UgYW4gRW5lbXkKLS0tLS0tLS0KTm90ZTogfmIvbyAzIHJlZ2Fs";

const QUIVER_DECODED = `Item Class: Quivers
Rarity: Rare
Kraken Bolt
Penetrating Quiver
--------
Requires: Level 55
--------
Item Level: 75
--------
100% chance to Pierce an Enemy (implicit)
--------
Adds 9 to 14 Physical Damage to Attacks
Adds 13 to 18 Cold damage to Attacks
Adds 1 to 36 Lightning damage to Attacks
13% chance to Pierce an Enemy
--------
Note: ~b/o 3 regal`;

describe("tryDecodeBase64ItemText", () => {
  test("decodes valid base64 item text", () => {
    const result = tryDecodeBase64ItemText(QUIVER_BASE64);
    expect(result).toBe(QUIVER_DECODED);
  });

  test("decodes base64 with whitespace padding", () => {
    const result = tryDecodeBase64ItemText(`  ${QUIVER_BASE64}  `);
    expect(result).toBe(QUIVER_DECODED);
  });

  test("returns original if text already has newlines", () => {
    const originalText = "Item Class: Quivers\nRarity: Rare";
    const result = tryDecodeBase64ItemText(originalText);
    expect(result).toBe(originalText);
  });

  test("returns original for non-base64 text", () => {
    const plainText = "just some random text";
    const result = tryDecodeBase64ItemText(plainText);
    expect(result).toBe(plainText);
  });

  test("returns original for invalid base64", () => {
    const invalidBase64 = "!!!not-valid-base64!!!";
    const result = tryDecodeBase64ItemText(invalidBase64);
    expect(result).toBe(invalidBase64);
  });

  test("returns original for base64 that decodes to non-item text", () => {
    // "Hello World" in base64
    const helloBase64 = "SGVsbG8gV29ybGQ=";
    const result = tryDecodeBase64ItemText(helloBase64);
    expect(result).toBe(helloBase64);
  });

  test("returns original for empty string", () => {
    const result = tryDecodeBase64ItemText("");
    expect(result).toBe("");
  });
});
