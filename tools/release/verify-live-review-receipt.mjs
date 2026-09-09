// Exercise the existing production row mapper against the live synthetic result.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = fs.readFileSync('lib/trust-transaction/server.ts', 'utf8');
const ast = ts.createSourceFile('server.ts', source, ts.ScriptTarget.Latest, true);
const mapper = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'receiptFromRow');
assert.ok(mapper, 'Existing receipt mapper must exist');
const code = ts.transpileModule(mapper.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const evidence = JSON.parse(fs.readFileSync('docs/release/v1-database-reconciliation/live-outcome-review.json', 'utf8'));
const receipt = vm.runInNewContext(code + '\nreceiptFromRow(row)', { row: evidence.row }, { timeout: 1000 });
assert.equal(receipt.decision, 'ALLOW');
assert.equal(receipt.decisionOutcomeReview.originalDecision, 'ALLOW');
assert.equal(receipt.decisionOutcomeReview.adjudicatedOutcome, 'DENY');
assert.equal(receipt.decisionOutcomeReview.evaluationStatus, 'CONTRADICTED');
assert.ok(receipt.replayReference);
assert.ok(receipt.trustMemoryReference);
console.log(JSON.stringify({ receiptReconstruction: 'PASS', originalDecision: receipt.decision, adjudicatedOutcome: receipt.decisionOutcomeReview.adjudicatedOutcome, evaluationStatus: receipt.decisionOutcomeReview.evaluationStatus }));
