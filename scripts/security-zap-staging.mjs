#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const planPath = path.resolve(process.cwd(), 'security/zap/staging-plan.yaml');
const plan = await readFile(planPath, 'utf8');

const deniedTargets = ['cybersentinels.com', 'www.cybersentinels.com', 'production.cybersentinels.example'];
const target = process.env.ZAP_TARGET?.trim() || '';

if (!target) {
  console.error('ZAP target is required.');
  process.exit(1);
}

const isDenied = deniedTargets.some((entry) => target.includes(entry));
const isStaging = target.includes('staging');

if (!isStaging || isDenied) {
  console.error(`Refusing unsafe ZAP target: ${target}`);
  process.exit(1);
}

if (!plan.includes('scanMode: passive')) {
  console.error('Staging ZAP plan is not configured for passive scanning.');
  process.exit(1);
}

console.log(`Staging ZAP plan accepted for ${target}`);
