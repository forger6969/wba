/**
 * Renders the OpenAPI spec (backend/src/config/swagger.js) into plain-Markdown
 * files under <repo>/swagger/ — one file per module (tag), plus an index.
 *
 * Single source of truth: the same spec that powers the live /api/docs UI.
 * Re-run after changing any @openapi JSDoc block or component schema:
 *   cd backend && npm run docs:md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { swaggerSpec as spec } from '../src/config/swagger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../swagger');

const slugify = (tag) => tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// Route-level JSDoc only marks `security: bearerAuth` (auth required or not) — the
// actual role restriction lives in each module's authorize(...) middleware, not in
// the annotation. Map tag -> role so the generated docs still say who can call it.
const ROLE_BY_TAG = {
  'Auth': 'Public (credentials in body — this endpoint issues the token)',
  'Leads': 'Public — no token (landing page lead form)',
  'Main Admin': 'main_admin',
  'CEO': 'ceo',
  'Admin': 'admin (own branch only)',
  'Admin Payments': 'admin (own branch only)',
  'Admin Reports': 'admin (own branch only)',
  'Mentor Groups': 'mentor (own groups only)',
  'Mentor Attendance': 'mentor (own groups only)',
  'Mentor Homework': 'mentor (own groups only)',
  'Mentor Tests': 'mentor (own groups only)',
  'Mentor Salary': 'mentor (own record)',
  'Mentor Coins': 'mentor + admin',
  'Student': 'student (own data only)',
  'Student Shop': 'student (purchase) + admin/mentor (manage items)',
  'Parent': 'parent (own children only)',
  'Methodist': 'methodist (org-wide content)',
  'Chat': 'any authenticated role (scoped to own chats)',
  'Coins': 'student (own balance/history)',
  'Users': 'any authenticated role (scoped to own profile / own branch)',
};

function resolveRef(ref) {
  // "#/components/schemas/User" -> spec.components.schemas.User
  const parts = ref.replace('#/', '').split('/');
  return parts.reduce((acc, key) => acc && acc[key], spec);
}

/** Renders a schema (possibly $ref) as an indented bullet list of fields. */
function schemaToLines(schema, indent = 0, seen = new Set()) {
  if (!schema) return ['*(no body)*'];
  const pad = '  '.repeat(indent);

  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    if (seen.has(name)) return [`${pad}- _${name}_ (see above, recursive ref)`];
    const resolved = resolveRef(schema.$ref);
    if (!resolved) return [`${pad}- _${name}_ (unresolved ref)`];
    return [`${pad}- **${name}**:`, ...schemaToLines(resolved, indent + 1, new Set([...seen, name]))];
  }

  if (schema.allOf) {
    return schema.allOf.flatMap((s) => schemaToLines(s, indent, seen));
  }

  if (schema.type === 'array') {
    return [`${pad}- _array of:_`, ...schemaToLines(schema.items, indent + 1, seen)];
  }

  if (schema.type === 'object' || schema.properties) {
    const required = new Set(schema.required || []);
    const props = schema.properties || {};
    const keys = Object.keys(props);
    if (keys.length === 0) return [`${pad}- _(free-form object)_`];
    return keys.flatMap((key) => {
      const prop = props[key];
      const reqTag = required.has(key) ? ' **(required)**' : ' (optional)';
      if (prop.$ref || prop.type === 'object' || prop.type === 'array' || prop.allOf) {
        return [`${pad}- \`${key}\`${reqTag}:`, ...schemaToLines(prop, indent + 1, seen)];
      }
      const type = prop.enum ? `enum: ${prop.enum.map((v) => `\`${v}\``).join(' | ')}` : (prop.format ? `${prop.type} (${prop.format})` : prop.type || 'any');
      const desc = prop.description ? ` — ${prop.description}` : '';
      const example = prop.example !== undefined ? ` _e.g. ${JSON.stringify(prop.example)}_` : '';
      return [`${pad}- \`${key}\`: ${type}${reqTag}${desc}${example}`];
    });
  }

  // primitive at top level
  const type = schema.enum ? `enum: ${schema.enum.map((v) => `\`${v}\``).join(' | ')}` : schema.type || 'any';
  return [`${pad}- _${type}_${schema.description ? ` — ${schema.description}` : ''}`];
}

function paramsToLines(parameters = []) {
  if (parameters.length === 0) return null;
  return parameters.map((raw) => {
    const p = raw.$ref ? resolveRef(raw.$ref) : raw;
    const reqTag = p.required ? '**(required)**' : '(optional)';
    const type = p.schema?.type || 'string';
    const desc = p.description ? ` — ${p.description}` : '';
    return `- \`${p.name}\` (${p.in}, ${type}) ${reqTag}${desc}`;
  });
}

function renderOperation(method, urlPath, op, tag) {
  const lines = [];
  lines.push(`### ${method.toUpperCase()} \`${urlPath}\``);
  if (op.summary) lines.push(`${op.summary}`);
  if (op.description && op.description !== op.summary) lines.push(`\n${op.description}`);

  const isPublic = op.security && Array.isArray(op.security) && op.security.length === 0;
  lines.push(`\n**Auth:** ${isPublic ? 'Public — no token required' : 'Bearer JWT required'}`);
  if (!isPublic) lines.push(`**Role(s):** ${ROLE_BY_TAG[tag] || 'authenticated'}`);

  const paramLines = paramsToLines(op.parameters);
  if (paramLines) {
    lines.push('\n**Params:**');
    lines.push(...paramLines);
  }

  if (op.requestBody) {
    const content = op.requestBody.content?.['application/json'];
    if (content?.schema) {
      lines.push('\n**Request body:**');
      lines.push(...schemaToLines(content.schema));
    }
  }

  if (op.responses) {
    lines.push('\n**Responses:**');
    for (const [status, respRaw] of Object.entries(op.responses)) {
      const resp = respRaw.$ref ? resolveRef(respRaw.$ref) : respRaw;
      lines.push(`\n- **${status}** — ${resp.description || ''}`);
      const content = resp.content?.['application/json'];
      if (content?.schema) {
        lines.push(...schemaToLines(content.schema, 1));
      }
    }
  }

  lines.push('\n---\n');
  return lines.join('\n');
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const tagMap = new Map();
  const tagOrder = (spec.tags || []).map((t) => t.name);
  for (const name of tagOrder) tagMap.set(name, []);

  for (const [urlPath, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method)) continue;
      const tags = op.tags && op.tags.length ? op.tags : ['Untagged'];
      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag).push({ method, urlPath, op });
      }
    }
  }

  const tagDescriptions = Object.fromEntries((spec.tags || []).map((t) => [t.name, t.description]));
  const indexLines = [
    `# ${spec.info.title} — API reference (v${spec.info.version})`,
    '',
    spec.info.description,
    '',
    '> Auto-generated from `backend/src/config/swagger.js` (the same spec that powers the live',
    '> `GET /api/docs` Swagger UI when the backend is running). Regenerate after any route/schema',
    '> change with:',
    '>',
    '> ```bash',
    '> cd backend && npm run docs:md',
    '> ```',
    '',
    '## Modules',
    '',
  ];

  let totalOps = 0;
  for (const [tag, ops] of tagMap.entries()) {
    if (ops.length === 0) continue;
    totalOps += ops.length;
    const file = `${slugify(tag)}.md`;
    indexLines.push(`- [${tag}](./${file}) — ${tagDescriptions[tag] || ''} _(${ops.length} endpoint${ops.length === 1 ? '' : 's'})_`);

    ops.sort((a, b) => a.urlPath.localeCompare(b.urlPath));
    const body = [
      `# ${tag}`,
      '',
      tagDescriptions[tag] ? `${tagDescriptions[tag]}\n` : '',
      `[← back to index](./README.md)`,
      '',
      ...ops.map(({ method, urlPath, op }) => renderOperation(method, urlPath, op, tag)),
    ].join('\n');
    fs.writeFileSync(path.join(outDir, file), body, 'utf8');
  }

  indexLines.push('', `**Total: ${totalOps} endpoints across ${tagMap.size} modules.**`);
  fs.writeFileSync(path.join(outDir, 'README.md'), indexLines.join('\n'), 'utf8');

  console.log(`Wrote ${tagMap.size} module files + README.md to ${outDir} (${totalOps} endpoints total).`);
}

main();
