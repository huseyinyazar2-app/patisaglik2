// Pati Sağlık — Mock Pet Data
import { buildPetRiskContext } from '../services/petContext.js';
const seedPets = [
  {
    id: 'pet-1',
    name: 'Milo',
    type: 'dog',
    breed: 'Golden Retriever',
    birthDate: '2021-03-15',
    age: '4 yaş',
    gender: 'male',
    neutered: true,
    isBrachycephalic: false,
    weight: 28.5,
    photo: null,
    emoji: '🐕',
    chronicDiseases: [],
    allergies: [],
    medications: [],
    rawHistory: 'Geçen sene parkta oynarken yabancı bir cisim yutmuştu, ameliyat olmak zorunda kaldı.',
    extractedTags: ['pika_sendromu', 'gecirilmis_mide_ameliyati'],
    notes: '',
    deviceMode: 'phone_only',
    lastCheckDate: '2026-05-28',
    overallStatus: 'good', // good | watch | urgent
    statusText: 'Genel durum iyi görünüyor'
  },
  {
    id: 'pet-2',
    name: 'Boncuk',
    type: 'cat',
    breed: 'British Shorthair',
    birthDate: '2022-08-10',
    age: '3 yaş',
    gender: 'female',
    neutered: false,
    isBrachycephalic: true,
    weight: 4.2,
    photo: null,
    emoji: '🐈',
    chronicDiseases: ['Diyabet'],
    allergies: ['Tavuk proteini'],
    medications: [],
    rawHistory: 'Küçükken araba çarpmıştı, kalça kemiğinde çatlak vardı. Bir de bağışıklığı bazen düşüyor.',
    extractedTags: ['gecirilmis_travma', 'bagisiklik_sorunu'],
    notes: '',
    deviceMode: 'phone_only',
    lastCheckDate: '2026-05-25',
    overallStatus: 'watch',
    statusText: 'Takip gereken kayıt var'
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
