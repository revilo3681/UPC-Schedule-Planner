import fs from 'node:fs';
import path from 'node:path';

const rawPath = path.resolve('scripts/misprofesores-upc.tsv');
const outPath = path.resolve('src/data/upcProfessors.ts');

const JUNK_NAME = [
  'bill gates',
  'isaac newton',
  'isacc newton',
  'de familia mi padre',
  'bebe por rios',
  'inga chup',
  'hadufhasdf',
  'holi',
  'holis',
  'put0',
  'por germe',
  'la zorra',
  'putita',
  'parada pinga',
  'el telo',
  'el diablo',
  'el pajas',
  'hasta el poto',
  'busca cachimbas',
  'payasadas',
  'noc no soy',
  'nose weno',
  'no recuerdo',
  'estadistica descriptiva yolanda',
  'micro y macro',
  'diamond zack',
  'smith antony',
  'calle o caye',
  'ciencias del fracaso',
  'ingenieria de limpieza',
  'ing de zapatero',
  'para que quiere saber',
  'tu cora',
  'uuuj',
];

const JUNK_DEPT = [
  'puto',
  'el telo',
  'el diablo',
  'el pajas',
  'hasta el poto',
  'busca cachimbas',
  'payasadas',
  'roblox',
  'uuuj',
  'tu cora',
  'politia',
];

function fold(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseName(name) {
  return name
    .split(',')
    .map((part) =>
      part
        .trim()
        .split(/\s+/)
        .map((word) => {
          if (!word) return '';
          if (word.length <= 2 && word === word.toUpperCase()) return word;
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ')
    )
    .join(', ');
}

function isJunk(name, dept) {
  const n = fold(name);
  const d = fold(dept);
  if (!n || n.length < 6 || !n.includes(' ')) return true;
  if (/[<>'"=]/.test(name) || /holi-holis/i.test(name)) return true;
  if (JUNK_NAME.some((item) => n.includes(item))) return true;
  if (JUNK_DEPT.some((item) => d.includes(item))) return true;
  if (/\b(puta|puto|zorra|pinga|pajas|poto|cachimba|porno|sexo|verga|pene)\b/.test(`${n} ${d}`)) {
    return true;
  }
  return false;
}

function cleanDept(dept) {
  const d = dept.replace(/\s+/g, ' ').trim();
  if (!d || d.length < 2 || d === '.' || d === 'c' || d === 'e' || d === 'H') return '';
  if (isJunk('ok name here xx', d)) return '';
  return d;
}

const raw = fs.readFileSync(rawPath, 'utf8');
const merged = new Map();

for (const line of raw.split(/\r?\n/)) {
  const cols = line.split('\t').map((c) => c.trim()).filter((c, i, arr) => !(c === '' && i === 0));
  if (cols.length < 3) continue;
  if (/^apellido/i.test(cols[0]) || /^buscar/i.test(cols[0])) continue;

  let name = cols[0];
  let dept = cols[1] || '';
  let count = Number(cols[2] || 0);
  let avg = cols[3] ? Number(cols[3]) : 0;
  if (!name.includes(',') && cols.length >= 4) {
    // already fine
  }
  if (!Number.isFinite(count)) count = 0;
  if (!Number.isFinite(avg)) avg = 0;
  if (isJunk(name, dept)) continue;

  const key = fold(name);
  const course = cleanDept(dept);
  const current = merged.get(key) || {
    name: titleCaseName(name),
    courses: [],
    sourceCount: 0,
    sourceAverage: 0,
  };
  if (course && !current.courses.includes(course)) current.courses.push(course);
  if (count > 0 && avg > 0) {
    const total = current.sourceAverage * current.sourceCount + avg * count;
    current.sourceCount += count;
    current.sourceAverage = total / current.sourceCount;
  }
  merged.set(key, current);
}

const professors = Array.from(merged.values())
  .map((p) => ({
    name: p.name,
    courses: p.courses.slice(0, 6),
    sourceCount: p.sourceCount,
    sourceAverage: p.sourceCount ? Math.round(p.sourceAverage * 10) / 10 : 0,
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'));

const file = `import { Professor } from '../types/professors';

/** Directorio inicial de docentes UPC (promedios comunitarios). */
export const UPC_PROFESSORS_SEED: Professor[] = ${JSON.stringify(
  professors.map((p) => ({
    id: `mp-${fold(p.name).replace(/\s+/g, '-')}`,
    name: p.name,
    courses: p.courses,
    favorite: false,
    reviews: [],
    sourceCount: p.sourceCount,
    sourceAverage: p.sourceAverage,
  })),
  null,
  2
)};
`;

fs.writeFileSync(outPath, file);
console.log(`Wrote ${professors.length} professors to ${outPath}`);
