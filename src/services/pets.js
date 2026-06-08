import { getDbClient } from './dbClient.js';
import { buildPetRiskContext } from './petContext.js';
import { translateForLocale } from '../i18n/tr.js';

const LOCAL_KEY = 'pati_pets';

function makeId(prefix = 'pet') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readLocal() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
}

function writeLocal(pets) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(pets));
}

function mergeLocalCache(pets) {
  const remoteIds = new Set(pets.map((pet) => pet.id));
  const localOnly = readLocal().filter((pet) => !remoteIds.has(pet.id));
  writeLocal([...pets, ...localOnly]);
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function speciesId(type) {
  const map = {
    cat: 'species-cat',
    dog: 'species-dog',
    bird: 'species-bird',
    fish: 'species-fish',
    reptile: 'species-reptile',
    small_mammal: 'species-small-mammal',
    exotic: 'species-exotic'
  };
  return map[type] || 'species-cat';
}

function normalizeYesNoUnknown(value) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return value || 'unknown';
}

function numberFromInput(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ageLabel(birthDate) {
  if (!birthDate || Number.isNaN(Date.parse(birthDate))) return '';
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const adjusted = now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate()) ? years - 1 : years;
  if (adjusted > 0) return translateForLocale('tr', 'petsService.age_years', { count: adjusted });
  const months = Math.max(1, (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth());
  return translateForLocale('tr', 'petsService.age_months', { count: months });
}

function normalize(row) {
  const metadata = typeof row.metadata === 'string' ? parseJson(row.metadata) : row.metadata || {};
  const pet = {
    id: row.id,
    name: row.name,
    type: row.species_code || row.type || metadata.type || 'cat',
    breed: metadata.breed || row.breed || '',
    birthDate: row.birth_date || row.birthDate || '',
    age: row.approximate_age_label || row.age || ageLabel(row.birth_date || row.birthDate),
    gender: row.sex || row.gender || 'unknown',
    neutered: normalizeYesNoUnknown(row.neutered_status ?? row.neutered),
    weight: numberFromInput(row.weight_kg ?? row.weight),
    ownership: row.ownership_type || row.ownership || 'owned',
    location: metadata.location || row.location || '',
    volunteerNote: metadata.volunteerNote || row.volunteerNote || '',
    rawHistory: row.medical_summary || row.rawHistory || '',
    chronicDiseases: metadata.chronic ? [metadata.chronic] : row.chronicDiseases || [],
    allergies: metadata.allergies ? [metadata.allergies] : row.allergies || [],
    medications: metadata.medications ? [metadata.medications] : row.medications || [],
    statusText: row.medical_summary || row.statusText || translateForLocale('tr', 'petsService.profile_ready'),
    overallStatus: metadata.overallStatus || 'good',
    photo: row.avatar_url || metadata.photo || row.photo || null,
    publicProfileToken: row.public_profile_token || metadata.publicProfileToken || '',
    qrHealthCard: metadata.qr_health_card || null,
    ownerName: row.owner_name || metadata.ownerName || '',
    ownerEmail: row.owner_email || metadata.ownerEmail || '',
    extractedTags: metadata.extractedTags || row.extractedTags || []
  };
  const riskContext = metadata.riskContext || buildPetRiskContext(pet);
  return {
    ...pet,
    lifeStage: riskContext.lifeStage,
    riskTags: riskContext.riskTags,
    riskContext
  };
}

export function getLocalPets() {
  return readLocal().map(normalize);
}

export function getPetById(id) {
  if (!id) return null;
  return getLocalPets().find((pet) => pet.id === id) || null;
}

export function getActivePet(activePetId) {
  const pet = getPetById(activePetId) || getLocalPets()[0] || null;
  if (pet) return pet;
  const fallback = {
    id: null,
    name: translateForLocale('tr', 'petsService.pet_fallback'),
    type: 'pet',
    breed: '',
    birthDate: '',
    age: '',
    gender: 'unknown',
    neutered: 'unknown',
    weight: 0,
    ownership: 'owned',
    location: '',
    volunteerNote: '',
    rawHistory: '',
    chronicDiseases: [],
    allergies: [],
    medications: [],
    statusText: '',
    overallStatus: 'good',
    photo: null,
    extractedTags: []
  };
  return {
    ...fallback,
    riskContext: buildPetRiskContext(fallback),
    riskTags: [],
    lifeStage: ''
  };
}

export async function getPets({ userId = 'user-1' } = {}) {
  const db = getDbClient();
  if (!db) return getLocalPets();

  const result = await db.execute({
    sql: `SELECT p.*, s.code AS species_code
          FROM pets p
          JOIN pet_species s ON s.id = p.species_id
          WHERE p.primary_owner_user_id = ?
          ORDER BY p.created_at ASC`,
    args: [userId]
  });

  const pets = result.rows.map((row) => normalize(Object.fromEntries(Object.entries(row))));
  mergeLocalCache(pets);
  return pets;
}

export async function savePet({ userId = 'user-1', pet }) {
  const now = new Date().toISOString();
  const record = {
    id: makeId('pet'),
    primary_owner_user_id: userId,
    species_id: speciesId(pet.type),
    name: pet.name,
    sex: pet.gender || 'unknown',
    birth_date: pet.birthDate || null,
    approximate_age_label: ageLabel(pet.birthDate),
    weight_kg: numberFromInput(pet.weight),
    neutered_status: pet.neutered || 'unknown',
    ownership_type: pet.ownership || 'owned',
    medical_summary: pet.rawHistory || '',
    metadata: JSON.stringify({
      breed: pet.breed || '',
      chronic: pet.chronic || '',
      allergies: pet.allergies || '',
      medications: pet.medications || '',
      location: pet.location || '',
      volunteerNote: pet.volunteerNote || '',
      extractedTags: pet.extractedTags || [],
      riskContext: buildPetRiskContext(pet)
    }),
    created_at: now,
    updated_at: now
  };

  const db = getDbClient();
  if (!db) {
    writeLocal([normalize({ ...record, type: pet.type }), ...readLocal()]);
    return { ok: true, storage: 'local-fallback', id: record.id };
  }

  await db.batch([
    {
      sql: `INSERT INTO pets
        (id, primary_owner_user_id, species_id, name, sex, birth_date, approximate_age_label, weight_kg, neutered_status, ownership_type, medical_summary, metadata, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        record.id,
        record.primary_owner_user_id,
        record.species_id,
        record.name,
        record.sex,
        record.birth_date,
        record.approximate_age_label,
        record.weight_kg,
        record.neutered_status,
        record.ownership_type,
        record.medical_summary,
        record.metadata,
        record.created_at,
        record.updated_at
      ]
    },
    {
      sql: `INSERT OR IGNORE INTO pet_members (id, pet_id, user_id, role_id, status)
            VALUES (?, ?, ?, ?, ?)`,
      args: [`member-${userId}-${record.id}`, record.id, userId, 'role-owner', 'active']
    }
  ]);

  writeLocal([normalize({ ...record, type: pet.type }), ...readLocal().filter((item) => item.id !== record.id)]);
  return { ok: true, storage: 'turso', id: record.id };
}

export async function updatePet({ userId = 'user-1', petId, pet }) {
  const now = new Date().toISOString();
  const currentRaw = readLocal();
  const current = currentRaw.find((item) => item.id === petId);
  const metadata = parseJson(current?.metadata);
  const nextMetadata = {
    ...metadata,
    breed: pet.breed ?? metadata.breed ?? '',
    chronic: pet.chronic ?? metadata.chronic ?? '',
    allergies: pet.allergies ?? metadata.allergies ?? '',
    medications: pet.medications ?? metadata.medications ?? '',
    location: pet.location ?? metadata.location ?? '',
    volunteerNote: pet.volunteerNote ?? metadata.volunteerNote ?? '',
    photo: pet.photo ?? metadata.photo ?? current?.photo ?? '',
    extractedTags: pet.extractedTags ?? metadata.extractedTags ?? [],
    riskContext: buildPetRiskContext({
      ...(current ? normalize(current) : {}),
      ...pet,
      id: petId
    })
  };
  const record = {
    ...(current || {}),
    id: petId,
    primary_owner_user_id: userId,
    species_id: current?.species_id || speciesId(pet.type || current?.type),
    name: pet.name ?? current?.name ?? '',
    sex: pet.gender ?? current?.sex ?? 'unknown',
    birth_date: pet.birthDate ?? current?.birth_date ?? null,
    approximate_age_label: ageLabel(pet.birthDate ?? current?.birth_date),
    weight_kg: numberFromInput(pet.weight ?? current?.weight_kg),
    neutered_status: pet.neutered ?? current?.neutered_status ?? 'unknown',
    ownership_type: pet.ownership ?? current?.ownership_type ?? 'owned',
    medical_summary: pet.rawHistory ?? current?.medical_summary ?? '',
    avatar_url: pet.photo ?? current?.avatar_url ?? null,
    metadata: JSON.stringify(nextMetadata),
    updated_at: now
  };

  writeLocal([record, ...currentRaw.filter((item) => item.id !== petId)]);

  const db = getDbClient();
  if (!db) return { ok: true, storage: 'local-fallback', id: petId };

  await db.execute({
    sql: `UPDATE pets
          SET name = ?, sex = ?, birth_date = ?, approximate_age_label = ?, weight_kg = ?,
              neutered_status = ?, ownership_type = ?, medical_summary = ?, avatar_url = ?, metadata = ?, updated_at = ?
          WHERE id = ? AND primary_owner_user_id = ?`,
    args: [
      record.name,
      record.sex,
      record.birth_date,
      record.approximate_age_label,
      record.weight_kg,
      record.neutered_status,
      record.ownership_type,
      record.medical_summary,
      record.avatar_url,
      record.metadata,
      record.updated_at,
      petId,
      userId
    ]
  });

  return { ok: true, storage: 'turso', id: petId };
}

export async function updatePetPhoto({ userId = 'user-1', petId, photo }) {
  return updatePet({ userId, petId, pet: { photo } });
}

export async function getPetByPublicToken(token) {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) return null;

  const db = getDbClient();
  if (!db) {
    const localCards = parseJson(localStorage.getItem('pati_public_cards'), []);
    const localCard = localCards.find((item) => item.public_profile_token === cleanToken);
    if (localCard) return normalize(localCard);
    return getLocalPets().find((pet) => pet.publicProfileToken === cleanToken) || null;
  }

  const result = await db.execute({
    sql: `SELECT p.*, s.code AS species_code, u.display_name AS owner_name, u.email AS owner_email
          FROM pets p
          JOIN pet_species s ON s.id = p.species_id
          LEFT JOIN users u ON u.id = p.primary_owner_user_id
          WHERE p.public_profile_token = ?
          LIMIT 1`,
    args: [cleanToken]
  });

  const row = result.rows[0];
  if (!row) return null;
  return normalize(Object.fromEntries(Object.entries(row)));
}
