// WBA ma'lumotini LevelUp sxemasiga sid qilish (bir martalik, idempotent).
//   node scripts/seed-wba.mjs
// DATABASE_URL — LevelUp Postgres (Supabase). Ma'lumot: scripts/wba-data.json.
// Parollar tasodifiy, .secrets/levelup-loginlar.csv ga yoziladi (git'da yo'q).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import pg from 'pg';
import argon2 from 'argon2';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL kerak');

const data = JSON.parse(readFileSync(new URL('./wba-data.json', import.meta.url)));
const pool = new pg.Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const ALFA = 'abcdefghijkmnpqrstuvwxyz23456789';
const parol = (n = 8) => Array.from({ length: n }, () => ALFA[randomInt(ALFA.length)]).join('');
const slug = (s) => s.toLowerCase().replace(/['‘’`ʻ]/g, '').replace(/o['ʻ]/g, 'o').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
function ismBol(full) {
  const p = String(full || '').trim().split(/\s+/);
  return { first: p[0] || '—', last: p.slice(1).join(' ') || '' };
}

const natija = []; // CSV uchun

async function ensureUser(c, findBy, findVal, fields) {
  const ex = await c.query(`SELECT id FROM users WHERE ${findBy} = $1 AND deleted_at IS NULL`, [findVal]);
  if (ex.rows[0]) {
    const keys = Object.keys(fields);
    await c.query(`UPDATE users SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')}, updated_at=now() WHERE id=$1`, [ex.rows[0].id, ...keys.map((k) => fields[k])]);
    return ex.rows[0].id;
  }
  const keys = Object.keys(fields);
  const r = await c.query(`INSERT INTO users (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`, keys.map((k) => fields[k]));
  return r.rows[0].id;
}

async function main() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    // Org + branch
    let org = (await c.query(`SELECT id FROM organizations WHERE name=$1`, ['World Bridge Academy'])).rows[0];
    if (!org) org = (await c.query(`INSERT INTO organizations (name, status, plan) VALUES ($1,'active','demo') RETURNING id`, ['World Bridge Academy'])).rows[0];
    const orgId = org.id;
    let br = (await c.query(`SELECT id FROM branches WHERE organization_id=$1 AND is_main=true`, [orgId])).rows[0];
    if (!br) br = (await c.query(`INSERT INTO branches (organization_id, name, is_main) VALUES ($1,'Toshkent',true) RETURNING id`, [orgId])).rows[0];
    const brId = br.id;

    // Adminlar
    for (const a of [
      { email: 'jamshid@wba.uz', ism: 'Jamshid Abdialimov' },
      { email: 'muhammadamin@wba.uz', ism: 'Muhammadamin' },
    ]) {
      const pw = parol(10);
      const { first, last } = ismBol(a.ism);
      await ensureUser(c, 'email', a.email, {
        organization_id: orgId, branch_id: brId, role: 'admin',
        first_name: first, last_name: last, email: a.email, password_hash: await argon2.hash(pw),
      });
      natija.push(['admin', a.ism, a.email, pw]);
    }

    // Ustozlar → mentor
    const mentorId = {}; // teacher_id -> user id
    const bandLogin = new Set();
    for (const t of data.teachers) {
      let login = slug(t.ism.split(/\s+/)[0]) || `ustoz${t.id.toLowerCase()}`;
      let base = login, n = 2;
      while (bandLogin.has(login)) login = `${base}${n++}`;
      bandLogin.add(login);
      // .ustoz suffiks — admin (jamshid@wba.uz) bilan to'qnashmasin
      const email = `${login}.ustoz@wba.uz`;
      const pw = parol();
      const { first, last } = ismBol(t.ism);
      const uid = await ensureUser(c, 'email', email, {
        organization_id: orgId, branch_id: brId, role: 'mentor',
        first_name: first, last_name: last, email, password_hash: await argon2.hash(pw),
      });
      await c.query(`INSERT INTO mentor_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [uid]);
      mentorId[t.id] = uid;
      natija.push(['ustoz', t.ism, email, pw]);
    }
    // Zaxira mentor (guruhda ustoz bo'lmasa)
    const zaxiraMentor = Object.values(mentorId)[0];

    // O'quvchilar → student
    const studId = {}; // student_id -> user id
    let kod = 10001;
    for (const s of data.students) {
      const login = String(kod++);
      const pw = parol();
      const { first, last } = ismBol(s.fish);
      const uid = await ensureUser(c, 'login_code', login, {
        organization_id: orgId, branch_id: brId, role: 'student',
        first_name: first, last_name: last, login_code: login,
        password_hash: await argon2.hash(pw),
      });
      await c.query(`INSERT INTO student_profiles (user_id, branch_id) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`, [uid, brId]);
      studId[s.id] = uid;
      natija.push(['oquvchi', s.fish, login, pw]);
    }

    // Guruhlar (nom — WBA'dagidek)
    const grpId = {};
    for (const g of data.groups) {
      const mId = mentorId[g.teacher_id] || zaxiraMentor;
      let ex = (await c.query(`SELECT id FROM groups WHERE branch_id=$1 AND name=$2`, [brId, g.nom])).rows[0];
      if (!ex) ex = (await c.query(
        `INSERT INTO groups (branch_id, mentor_id, name, subject, monthly_price) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [brId, mId, g.nom, g.subject || 'Kurs', Number(g.oylik_narx) || 0],
      )).rows[0];
      grpId[g.id] = ex.id;
    }

    // group_students
    let bog = 0;
    for (const e of data.enrollments) {
      const gid = grpId[e.group_id], sid = studId[e.student_id];
      if (!gid || !sid) continue;
      await c.query(`INSERT INTO group_students (group_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [gid, sid]);
      bog++;
    }

    await c.query('COMMIT');
    console.log(`OK: org+branch, ${data.teachers.length} ustoz, ${data.students.length} o'quvchi, ${data.groups.length} guruh, ${bog} bog'lanish`);

    mkdirSync(new URL('../../.secrets/', import.meta.url), { recursive: true });
    const csv = '﻿' + 'Rol;Ism;Login;Parol\n' + natija.map((r) => r.join(';')).join('\n');
    const out = new URL('../../.secrets/levelup-loginlar.csv', import.meta.url);
    writeFileSync(out, csv);
    console.log('Loginlar:', out.pathname);
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
