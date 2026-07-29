import { test } from "node:test";
import assert from "node:assert/strict";
import { templateAllowed, hasPlan, PLAN_LIMITS, PLAN_PRICES_BRL } from "../../src/lib/plans.js";

test("templateAllowed: Básico só libera minimal/bold", () => {
  assert.equal(templateAllowed("basic", "minimal"), true);
  assert.equal(templateAllowed("basic", "bold"), true);
  assert.equal(templateAllowed("basic", "aurora"), false);
});

test("templateAllowed: Pro e Business liberam qualquer template", () => {
  assert.equal(templateAllowed("pro", "aurora"), true);
  assert.equal(templateAllowed("business", "grande"), true);
});

test("hasPlan respeita a hierarquia dos planos", () => {
  assert.equal(hasPlan("pro", "basic"), true);
  assert.equal(hasPlan("basic", "pro"), false);
  assert.equal(hasPlan("business", "business"), true);
  assert.equal(hasPlan("free", "basic"), false);
});

test("limites de cota por plano", () => {
  assert.equal(PLAN_LIMITS.free.proposalsPerMonth, 0);
  assert.equal(PLAN_LIMITS.basic.proposalsPerMonth, 5);
  assert.equal(PLAN_LIMITS.pro.proposalsPerMonth, 25);
  assert.equal(PLAN_LIMITS.business.proposalsPerMonth, Infinity);
});

test("preços dos planos são consistentes (server-side)", () => {
  assert.equal(PLAN_PRICES_BRL.basic.month, 12);
  assert.equal(PLAN_PRICES_BRL.pro.year, 312);
  assert.equal(PLAN_PRICES_BRL.business.month, 97);
});
