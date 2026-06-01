function normalize(value) {
  return String(value || '').toLocaleLowerCase('tr-TR');
}

export function ageMonthsFromBirthDate(birthDate) {
  if (!birthDate || Number.isNaN(Date.parse(birthDate))) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  return Math.max(0, (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth());
}

export function lifeStageForPet(pet = {}) {
  const months = ageMonthsFromBirthDate(pet.birthDate || pet.birth_date);
  const type = pet.type || pet.species_code || '';
  if (months === null) return 'unknown';
  if (months <= 1) return 'newborn';
  if (type === 'cat') {
    if (months < 12) return 'young';
    if (months >= 132) return 'geriatric';
    if (months >= 96) return 'senior';
    return 'adult';
  }
  if (type === 'dog') {
    if (months < 12) return 'young';
    if (months >= 120) return 'geriatric';
    if (months >= 84) return 'senior';
    return 'adult';
  }
  if (months < 6) return 'young';
  if (months >= 84) return 'senior';
  return 'adult';
}

export function buildPetRiskContext(pet = {}) {
  const type = pet.type || pet.species_code || 'pet';
  const breed = normalize(pet.breed);
  const weight = Number(pet.weight ?? pet.weight_kg ?? 0);
  const chronic = [...(pet.chronicDiseases || []), pet.chronic || '', pet.rawHistory || ''].join(' ');
  const lifeStage = pet.lifeStage || lifeStageForPet(pet);
  const tags = new Set(pet.extractedTags || pet.riskTags || []);

  const brachyBreeds = ['bulldog', 'pug', 'shih tzu', 'boxer', 'pekinese', 'persian', 'british shorthair', 'exotic shorthair'];
  const deepChestBreeds = ['golden retriever', 'labrador', 'german shepherd', 'great dane', 'doberman', 'standard poodle', 'setter'];

  if (brachyBreeds.some(item => breed.includes(item))) tags.add('brachycephalic_risk');
  if (type === 'dog' && (weight >= 25 || deepChestBreeds.some(item => breed.includes(item)))) tags.add('large_breed_risk');
  if (lifeStage === 'newborn') tags.add('newborn_risk');
  if (lifeStage === 'young') tags.add('young_risk');
  if (lifeStage === 'senior' || lifeStage === 'geriatric') tags.add('senior_risk');
  if (normalize(chronic).includes('diyabet')) tags.add('diabetes_risk');
  if (normalize(chronic).includes('böbrek') || normalize(chronic).includes('bobrek')) tags.add('kidney_risk');
  if (normalize(chronic).includes('kalp')) tags.add('cardiac_risk');
  if (pet.isBrachycephalic) tags.add('brachycephalic_risk');

  const warnings = [];
  if (tags.has('brachycephalic_risk')) warnings.push('Kısa burunlu/solunum hassasiyeti olan ırklarda nefes belirtileri daha temkinli değerlendirilir.');
  if (tags.has('large_breed_risk')) warnings.push('Büyük ırk/kilo bağlamında karın şişliği, öğürme ve ani halsizlik daha ciddi ele alınır.');
  if (tags.has('newborn_risk')) warnings.push('Yeni doğan/yavru petlerde iştahsızlık, ishal, kusma ve ısı kaybı daha hızlı risk oluşturabilir.');
  if (tags.has('senior_risk')) warnings.push('Yaşlı petlerde halsizlik, iştah kaybı ve solunum/idrar değişiklikleri daha yakından izlenmelidir.');
  if (tags.has('diabetes_risk')) warnings.push('Diyabet öyküsünde iştah, kusma, su tüketimi ve halsizlik daha dikkatli değerlendirilir.');
  if (tags.has('kidney_risk')) warnings.push('Böbrek öyküsünde su tüketimi, idrar ve iştah değişiklikleri daha kritik olabilir.');
  if (tags.has('cardiac_risk')) warnings.push('Kalp öyküsünde öksürük, solunum sayısı ve efor intoleransı daha yüksek risklidir.');

  return {
    lifeStage,
    riskTags: [...tags],
    warnings,
    modifiers: {
      respiratory: tags.has('brachycephalic_risk') || tags.has('cardiac_risk') ? 1.25 : 1,
      digestive: tags.has('newborn_risk') || tags.has('senior_risk') || tags.has('diabetes_risk') || tags.has('kidney_risk') ? 1.2 : 1,
      urinary: tags.has('kidney_risk') || tags.has('senior_risk') ? 1.2 : 1,
      general: tags.has('newborn_risk') || tags.has('senior_risk') || tags.has('cardiac_risk') ? 1.15 : 1
    }
  };
}
