import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import swaggerJSDoc from 'swagger-jsdoc';
import { components } from '../docs/openapi-components.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

// Absolute path to backend/src — independent of process.cwd(), so the glob below
// works whether the process is started from backend/ or the repo root.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..');

/**
 * Builds the OpenAPI 3.0 spec by scanning @openapi JSDoc blocks in every
 * *.routes.js file under src/modules/ (via swagger-jsdoc's `apis` glob) and
 * merging them with the shared component schemas in ../docs/openapi-components.js.
 *
 * Served by src/app.js at:
 *   GET /api/docs       — swagger-ui-express HTML UI
 *   GET /api/docs.json  — raw JSON spec
 *
 * This module has NO dependency on DB/Redis/S3 — it only reads route-file
 * source text on disk, so the spec can be built standalone even without a
 * reachable database (see scratch verification script used during setup).
 */
const definition = {
  openapi: '3.0.3',
  info: {
    title: 'LevelUp Academy API',
    version: pkg.version,
    description:
      'Multi-tenant Educational CRM backend for LevelUp Academy. Roles: main_admin, ' +
      'ceo, admin, mentor, student, parent, methodist. Auth via JWT bearer ' +
      'access tokens (15 min TTL) + httpOnly refresh-token cookie (30 days, rotated).',
  },
  servers: [
    { url: '/', description: 'Current origin (respects reverse proxy / Render URL)' },
    { url: 'http://localhost:4000', description: 'Local dev' },
  ],
  tags: [
    { name: 'Auth', description: 'Login (main/staff/member), Google OAuth, refresh, logout, password reset' },
    { name: 'Leads', description: 'Public landing-page lead submission' },
    { name: 'Main Admin', description: 'Platform owner: partner onboarding, pricing, leads, platform dashboard' },
    { name: 'CEO', description: 'Organization owner: branches, admins, methodists, org dashboard' },
    { name: 'Admin', description: 'Branch admin: dashboard, expenses, students, mentors, groups' },
    { name: 'Admin Payments', description: 'K-PAY: invoices, ad-hoc payments, refunds/voids, receipts' },
    { name: 'Admin Reports', description: 'K-PAY: branch revenue/debt report by group' },
    { name: 'Mentor Groups', description: "Mentor's own groups + roster (read-only; CRUD is Admin-side)" },
    { name: 'Mentor Attendance', description: 'Mentor: mark/read attendance for own groups' },
    { name: 'Mentor Homework', description: 'Mentor: create homework, list submissions, grade' },
    { name: 'Mentor Tests', description: 'Mentor: create tests, list results' },
    { name: 'Mentor Salary', description: 'Mentor salary suggestion/records (mentor self-view; admin manages)' },
    { name: 'Mentor Coins', description: 'Mentor/Admin manual coin grants + student coin history' },
    { name: 'Student', description: "Student's own home dashboard, homework, tests, videos, leaderboard" },
    { name: 'Student Shop', description: 'Coin shop: browse/purchase (student), manage items (admin/mentor)' },
    { name: 'Parent', description: "Parent's read-only view of their children" },
    { name: 'Methodist', description: 'Organization-wide content authoring (training types/topics/lessons/questions) + analytics' },
    { name: 'Chat', description: 'Realtime chat REST history (sending is via Socket.io, not REST)' },
    { name: 'Coins', description: "Student's own coin balance + history" },
    { name: 'Users', description: 'Cross-role profile endpoints (own profile, scoped user lookups)' },
    { name: 'Discipline', description: 'Дисциплина сотрудников: штрафы (shtraf) + увольнение (qora) + устав организации' },
  ],
  components,
  security: [{ bearerAuth: [] }],
};

// node-glob (used internally by swagger-jsdoc) expects forward slashes even on
// Windows — path.join would emit backslashes there.
const toGlobPath = (p) => p.split(path.sep).join('/');

const options = {
  definition,
  // Scans every routes file for `@openapi` JSDoc comment blocks.
  apis: [
    toGlobPath(path.join(srcDir, 'modules/**/*.routes.js')),
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
