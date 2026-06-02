import { buildPetRiskContext } from '../services/petContext.js';
import { translateForLocale } from '../i18n/tr.js';
const seedPets = [
  {
    id: 'pet-1',
    name: 'Milo',
    type: 'dog',
    breed: 'Golden Retriever',
    birthDate: '2021-03-15',
    age: translateForLocale('tr', 'mockPets.milo_age'),
    gender: 'male',
    neutered: true,
    isBrachycephalic: false,
    weight: 28.5,
    photo: null,
    emoji: '🐕',
    chronicDiseases: [],
    allergies: [],
    medications: [],
    rawHistory: translateForLocale('tr', 'mockPets.milo_history'),
    extractedTags: ['pika_sendromu', 'gecirilmis_mide_ameliyati'],
    notes: '',
    deviceMode: 'phone_only',
    lastCheckDate: '2026-05-28',
    overallStatus: 'good', // good | watch | urgent
    statusText: translateForLocale('tr', 'mockPets.good_status')
  },
  {
    id: 'pet-2',
    name: 'Boncuk',
    type: 'cat',
    breed: 'British Shorthair',
    birthDate: '2022-08-10',
    age: translateForLocale('tr', 'mockPets.boncuk_age'),
    gender: 'female',
    neutered: false,
    isBrachycephalic: true,
    weight: 4.2,
    photo: null,
    emoji: '🐈',
    chronicDiseases: ['Diyabet'],
    allergies: ['Tavuk proteini'],
    medications: [],
    rawHistory: translateForLocale('tr', 'mockPets.boncuk_history'),
    extractedTags: ['gecirilmis_travma', 'bagisiklik_sorunu'],
    notes: '',
    deviceMode: 'phone_only',
    lastCheckDate: '2026-05-25',
    overallStatus: 'watch',
    statusText: translateForLocale('tr', 'mockPets.watch_status')
  }
];

function readLocalPets() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem('pati_pets') || '[]');
  } catch {
    return [];
  }
}

function allPets() {
  const localPets = readLocalPets();
  const localIds = new Set(localPets.map((pet) => pet.id));
  return [...localPets, ...seedPets.filter((pet) => !localIds.has(pet.id))].map((pet) => ({
    ...pet,
    lifeStage: pet.lifeStage || buildPetRiskContext(pet).lifeStage,
    riskTags: pet.riskTags || buildPetRiskContext(pet).riskTags,
    riskContext: pet.riskContext || buildPetRiskContext(pet)
  }));
}

export const pets = seedPets;

export function getPetById(id) {
  return allPets().find(p => p.id === id) || allPets()[0];
}

export function getActivePet(activePetId) {
  return allPets().find(p => p.id === activePetId) || allPets()[0];
}
