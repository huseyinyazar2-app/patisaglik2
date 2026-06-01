PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS locales (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  display_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'tr',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  status TEXT NOT NULL DEFAULT 'active',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (locale) REFERENCES locales(code)
);

CREATE TABLE IF NOT EXISTS pet_species (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  default_name_tr TEXT NOT NULL,
  default_name_en TEXT NOT NULL,
  category TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS pet_breeds (
  id TEXT PRIMARY KEY,
  species_id TEXT NOT NULL,
  code TEXT NOT NULL,
  default_name TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(species_id, code),
  FOREIGN KEY (species_id) REFERENCES pet_species(id)
);

CREATE TABLE IF NOT EXISTS pets (
  id TEXT PRIMARY KEY,
  primary_owner_user_id TEXT NOT NULL,
  species_id TEXT NOT NULL,
  breed_id TEXT,
  name TEXT NOT NULL,
  sex TEXT DEFAULT 'unknown',
  birth_date TEXT,
  approximate_age_label TEXT,
  weight_kg REAL,
  neutered_status TEXT DEFAULT 'unknown',
  ownership_type TEXT NOT NULL DEFAULT 'owned',
  public_profile_token TEXT UNIQUE,
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  medical_summary TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (primary_owner_user_id) REFERENCES users(id),
  FOREIGN KEY (species_id) REFERENCES pet_species(id),
  FOREIGN KEY (breed_id) REFERENCES pet_breeds(id)
);

CREATE TABLE IF NOT EXISTS pet_profile_attributes (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'text',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(pet_id, key),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_tr TEXT NOT NULL,
  description_tr TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_tr TEXT NOT NULL,
  description_tr TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pet_members (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  invited_by_user_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  access_starts_at TEXT,
  access_ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(pet_id, user_id),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (invited_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS pet_member_permission_overrides (
  pet_member_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  allowed INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (pet_member_id, permission_id),
  FOREIGN KEY (pet_member_id) REFERENCES pet_members(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  billing_type TEXT NOT NULL,
  name_tr TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  max_pets INTEGER,
  monthly_credit_allowance INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  renews_at TEXT,
  provider TEXT,
  provider_subscription_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS credit_wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'credit',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  direction TEXT NOT NULL,
  reason TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (wallet_id) REFERENCES credit_wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feature_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pet_id TEXT,
  feature_code TEXT NOT NULL,
  plan_code TEXT,
  credit_cost INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 1,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS health_records (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  occurred_at TEXT,
  summary TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS measurements (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  measurement_type TEXT NOT NULL,
  value REAL,
  unit TEXT,
  measured_at TEXT NOT NULL,
  note TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  title TEXT NOT NULL,
  due_at TEXT NOT NULL,
  repeat_rule TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  note TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  spent_at TEXT NOT NULL,
  title TEXT,
  note TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS media_files (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  uploaded_by_user_id TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id TEXT,
  media_type TEXT NOT NULL,
  url TEXT,
  local_uri TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  uploaded_by_user_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_media_id TEXT,
  extracted_text TEXT,
  extracted_data TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id),
  FOREIGN KEY (file_media_id) REFERENCES media_files(id)
);

CREATE TABLE IF NOT EXISTS ai_analysis_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pet_id TEXT,
  feature_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  input_payload TEXT NOT NULL DEFAULT '{}',
  output_payload TEXT NOT NULL DEFAULT '{}',
  credit_cost INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY,
  pet_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  followup_type TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  starts_at TEXT,
  ends_at TEXT,
  protocol_code TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS form_submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pet_id TEXT,
  feature_code TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'tr',
  status TEXT NOT NULL DEFAULT 'draft',
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  synced_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE SET NULL,
  FOREIGN KEY (locale) REFERENCES locales(code)
);

CREATE TABLE IF NOT EXISTS translation_keys (
  id TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(namespace, key)
);

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  translation_key_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(translation_key_id, locale),
  FOREIGN KEY (translation_key_id) REFERENCES translation_keys(id) ON DELETE CASCADE,
  FOREIGN KEY (locale) REFERENCES locales(code)
);

CREATE TABLE IF NOT EXISTS localized_content (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  field_name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(entity_type, entity_id, locale, field_name),
  FOREIGN KEY (locale) REFERENCES locales(code)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(primary_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pet_members_pet ON pet_members(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_members_user ON pet_members(user_id);
CREATE INDEX IF NOT EXISTS idx_health_records_pet ON health_records(pet_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_measurements_pet ON measurements(pet_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_reminders_pet_due ON reminders(pet_id, due_at, status);
CREATE INDEX IF NOT EXISTS idx_expenses_pet_date ON expenses(pet_id, spent_at);
CREATE INDEX IF NOT EXISTS idx_media_pet ON media_files(pet_id, related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_documents_pet ON documents(pet_id, document_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user ON ai_analysis_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_followups_pet ON followups(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_pet ON form_submissions(pet_id, feature_code, created_at);
CREATE INDEX IF NOT EXISTS idx_feature_usage_user ON feature_usage(user_id, feature_code, created_at);

INSERT OR IGNORE INTO locales (code, name, native_name) VALUES
  ('tr', 'Turkish', 'Türkçe'),
  ('en', 'English', 'English'),
  ('de', 'German', 'Deutsch'),
  ('fr', 'French', 'Français'),
  ('es', 'Spanish', 'Español'),
  ('it', 'Italian', 'Italiano'),
  ('pt', 'Portuguese', 'Português'),
  ('nl', 'Dutch', 'Nederlands'),
  ('ru', 'Russian', 'Русский'),
  ('ar', 'Arabic', 'العربية'),
  ('ja', 'Japanese', '日本語'),
  ('ko', 'Korean', '한국어'),
  ('zh', 'Chinese', '中文');

INSERT OR IGNORE INTO pet_species (id, code, default_name_tr, default_name_en, category) VALUES
  ('species-cat', 'cat', 'Kedi', 'Cat', 'mammal'),
  ('species-dog', 'dog', 'Köpek', 'Dog', 'mammal'),
  ('species-bird', 'bird', 'Kuş', 'Bird', 'bird'),
  ('species-fish', 'fish', 'Akvaryum Balığı', 'Fish', 'aquatic'),
  ('species-reptile', 'reptile', 'Sürüngen', 'Reptile', 'reptile'),
  ('species-small-mammal', 'small_mammal', 'Küçük Memeli', 'Small Mammal', 'mammal'),
  ('species-exotic', 'exotic', 'Egzotik Hayvan', 'Exotic Pet', 'exotic');

INSERT OR IGNORE INTO roles (id, code, name_tr, description_tr) VALUES
  ('role-owner', 'owner', 'Sahip', 'Tam yetki'),
  ('role-family', 'family', 'Aile Üyesi', 'Aile içi ortak kullanım'),
  ('role-sitter', 'sitter', 'Bakıcı', 'Sınırlı süreli bakım erişimi'),
  ('role-vet-viewer', 'vet_viewer', 'Veteriner Görüntüleyici', 'Rapor ve sağlık kartı görüntüleme');

INSERT OR IGNORE INTO permissions (id, code, name_tr) VALUES
  ('perm-view-pet', 'view_pet', 'Pet profilini görüntüle'),
  ('perm-edit-pet', 'edit_pet', 'Pet profilini düzenle'),
  ('perm-view-health', 'view_health', 'Sağlık kayıtlarını görüntüle'),
  ('perm-add-health', 'add_health', 'Sağlık kaydı ekle'),
  ('perm-view-expenses', 'view_expenses', 'Masrafları görüntüle'),
  ('perm-add-expenses', 'add_expenses', 'Masraf ekle'),
  ('perm-view-reports', 'view_reports', 'Raporları görüntüle'),
  ('perm-use-ai', 'use_ai', 'AI özelliklerini kullan'),
  ('perm-invite-members', 'invite_members', 'Üye davet et'),
  ('perm-manage-members', 'manage_members', 'Üyeleri yönet');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role-owner', id FROM permissions;

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-family', 'perm-view-pet'),
  ('role-family', 'perm-edit-pet'),
  ('role-family', 'perm-view-health'),
  ('role-family', 'perm-add-health'),
  ('role-family', 'perm-view-expenses'),
  ('role-family', 'perm-add-expenses'),
  ('role-family', 'perm-view-reports'),
  ('role-family', 'perm-use-ai'),
  ('role-sitter', 'perm-view-pet'),
  ('role-sitter', 'perm-view-health'),
  ('role-sitter', 'perm-add-health'),
  ('role-vet-viewer', 'perm-view-pet'),
  ('role-vet-viewer', 'perm-view-health'),
  ('role-vet-viewer', 'perm-view-reports');

INSERT OR IGNORE INTO plans (id, code, billing_type, name_tr, price_cents, max_pets, monthly_credit_allowance, features) VALUES
  ('plan-free', 'free', 'free', 'Ücretsiz', 0, 1, 0, '{"ai":false,"documents":false,"members":1}'),
  ('plan-credit', 'credit', 'credit', 'Kredi Paketi', 0, 3, 0, '{"ai":true,"documents":true,"members":2}'),
  ('plan-monthly', 'monthly', 'subscription', 'Aylık Pro', 0, 10, 100, '{"ai":true,"documents":true,"members":10}'),
  ('plan-yearly', 'yearly', 'subscription', 'Yıllık Pro', 0, 10, 1400, '{"ai":true,"documents":true,"members":10}');

INSERT OR IGNORE INTO users (id, email, phone, display_name, locale, metadata) VALUES
  ('user-1', 'ayse@email.com', '+905551112233', 'Ayşe Yılmaz', 'tr', '{"location":{"country":"Türkiye","province":"","district":"","neighborhood":""},"notificationPreference":"push"}');

INSERT OR IGNORE INTO pets (id, primary_owner_user_id, species_id, name, sex, birth_date, approximate_age_label, weight_kg, ownership_type, medical_summary) VALUES
  ('pet-1', 'user-1', 'species-dog', 'Milo', 'male', '2021-03-15', '4 yaş', 28.5, 'owned', 'Genel durum iyi görünüyor'),
  ('pet-2', 'user-1', 'species-cat', 'Boncuk', 'female', '2022-08-10', '3 yaş', 4.2, 'owned', 'Takip gereken kayıt var');

INSERT OR IGNORE INTO pet_members (id, pet_id, user_id, role_id, status) VALUES
  ('member-user-1-pet-1', 'pet-1', 'user-1', 'role-owner', 'active'),
  ('member-user-1-pet-2', 'pet-2', 'user-1', 'role-owner', 'active');

INSERT OR IGNORE INTO credit_wallets (id, user_id, balance) VALUES
  ('wallet-user-1', 'user-1', 0);
