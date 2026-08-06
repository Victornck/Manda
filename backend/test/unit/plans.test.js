import { test } from "node:test";
import assert from "node:assert/strict";
import { templateAllowed, hasPlan, proposalCap, hasFeature, FEATURES, PLAN_PRICES_BRL } from "../../src/lib/plans.js";

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

test("cota de propostas: Gratuito tem teto vitalício de 2; pagos são mensais", () => {
  assert.deepEqual(proposalCap("free"), { scope: "total", limit: 2 });
  assert.equal(proposalCap("basic").scope, "month");
  assert.equal(proposalCap("basic").limit, 5);
  assert.equal(proposalCap("pro").limit, 25);
  assert.equal(proposalCap("business").limit, Infinity);
});

test("recursos premium: Gratuito não tem calculadora nem follow-up; pagos têm", () => {
  assert.equal(hasFeature("free", FEATURES.CALCULATOR), false);
  assert.equal(hasFeature("free", FEATURES.FOLLOW_UP), false);
  assert.equal(hasFeature("basic", FEATURES.CALCULATOR), true);
  assert.equal(hasFeature("pro", FEATURES.FOLLOW_UP), true);
  assert.equal(hasFeature("business", FEATURES.CALCULATOR), true);
});

test("preços dos planos são consistentes (server-side)", () => {
  assert.equal(PLAN_PRICES_BRL.basic.month, 12);
  assert.equal(PLAN_PRICES_BRL.pro.year, 312);
  assert.equal(PLAN_PRICES_BRL.business.month, 97);
});
