import assert from "node:assert/strict";
import { test } from "node:test";
import i18n from "./i18n.js";

test("picked-up timeline label resolves in English and Swahili", () => {
  assert.equal(i18n.getFixedT("en")("tracking_timeline_picked_up"), "Picked up");
  assert.equal(i18n.getFixedT("sw")("tracking_timeline_picked_up"), "Imechukuliwa");
});
