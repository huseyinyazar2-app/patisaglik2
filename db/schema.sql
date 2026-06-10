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
  password_hash TEXT,
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

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
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
  billing_period TEXT,
  name_tr TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  play_product_id TEXT,
  max_pets INTEGER,
  monthly_credit_allowance INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS credit_packages (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_tr TEXT NOT NULL,
  credit_amount INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  play_product_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
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

CREATE TABLE IF NOT EXISTS store_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'google_play',
  product_type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  plan_id TEXT,
  credit_package_id TEXT,
  purchase_token TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  credits_granted INTEGER NOT NULL DEFAULT 0,
  purchased_at TEXT,
  expires_at TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id),
  FOREIGN KEY (credit_package_id) REFERENCES credit_packages(id)
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

CREATE TABLE IF NOT EXISTS vet_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  display_name TEXT NOT NULL,
  license_no TEXT,
  specialties TEXT NOT NULL DEFAULT '[]',
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_active INTEGER NOT NULL DEFAULT 1,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  commission_rate INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vet_availability (
  id TEXT PRIMARY KEY,
  vet_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (vet_id) REFERENCES vet_profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vet_consultation_bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pet_id TEXT NOT NULL,
  vet_id TEXT,
  ai_session_id TEXT,
  report_id TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  scheduled_at TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TRY',
  payment_id TEXT,
  credit_hold_id TEXT,
  daily_room_name TEXT,
  daily_room_url TEXT,
  joined_owner_at TEXT,
  joined_vet_at TEXT,
  case_summary TEXT,
  red_flags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (pet_id) REFERENCES pets(id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES vet_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vet_credit_holds (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL UNIQUE,
  wallet_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'held',
  hold_transaction_id TEXT,
  capture_transaction_id TEXT,
  release_transaction_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (booking_id) REFERENCES vet_consultation_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES credit_wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vet_consultation_notes (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  vet_id TEXT,
  summary TEXT NOT NULL,
  urgency_level TEXT NOT NULL DEFAULT 'routine',
  next_step TEXT,
  followup_at TEXT,
  clinic_visit_recommended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (booking_id) REFERENCES vet_consultation_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES vet_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vet_consultation_surveys (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  reviewer_user_id TEXT,
  reviewed_user_id TEXT,
  vet_id TEXT,
  rating INTEGER NOT NULL,
  feedback TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(booking_id, reviewer_role),
  FOREIGN KEY (booking_id) REFERENCES vet_consultation_bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (vet_id) REFERENCES vet_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS vet_consultation_events (
  id TEXT PRIMARY KEY,
  booking_id TEXT,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (booking_id) REFERENCES vet_consultation_bookings(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vet_profiles_status ON vet_profiles(status);
CREATE INDEX IF NOT EXISTS idx_vet_availability_vet ON vet_availability(vet_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vet_bookings_user ON vet_consultation_bookings(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vet_bookings_pet ON vet_consultation_bookings(pet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_vet_bookings_vet ON vet_consultation_bookings(vet_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_vet_credit_holds_status ON vet_credit_holds(status, created_at);
CREATE INDEX IF NOT EXISTS idx_vet_notes_booking ON vet_consultation_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_vet_surveys_booking ON vet_consultation_surveys(booking_id, reviewer_role);
CREATE INDEX IF NOT EXISTS idx_vet_surveys_vet ON vet_consultation_surveys(vet_id, reviewer_role);
CREATE INDEX IF NOT EXISTS idx_vet_events_booking ON vet_consultation_events(booking_id, created_at);

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

CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'super_admin',
  permissions TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
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
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON credit_packages(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_purchases_user ON store_purchases(user_id, status, created_at);

INSERT OR IGNORE INTO locales (code, name, native_name) VALUES
  ('tr', 'Turkish', 'Türkçe'),
  ('en', 'English', 'English'),
  ('de', 'German', 'Deutsch'),
  ('fr', 'French', 'Français'),
  ('es', 'Spanish', 'Español'),
  ('it', 'Italian', 'Italiano'),
  ('pt', 'Portuguese', 'Português'),
  ('nl', 'Dutch', 'Nederlands'),
  ('pl', 'Polish', 'Polski'),
  ('ro', 'Romanian', 'Română'),
  ('el', 'Greek', 'Ελληνικά'),
  ('ru', 'Russian', 'Русский'),
  ('uk', 'Ukrainian', 'Українська'),
  ('ar', 'Arabic', 'العربية'),
  ('he', 'Hebrew', 'עברית'),
  ('fa', 'Persian', 'فارسی'),
  ('hi', 'Hindi', 'हिन्दी'),
  ('id', 'Indonesian', 'Bahasa Indonesia'),
  ('ms', 'Malay', 'Bahasa Melayu'),
  ('th', 'Thai', 'ไทย'),
  ('vi', 'Vietnamese', 'Tiếng Việt'),
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

INSERT OR IGNORE INTO roles (id, code, name_tr, description_tr) VALUES
  ('role-vet-live', 'vet_live', 'Canli Gorusme Veterineri', 'Canli veteriner gorusme paneli erisimi');

INSERT OR IGNORE INTO permissions (id, code, name_tr) VALUES
  ('perm-vet-live-panel', 'vet_live_panel', 'Canli veteriner panelini kullan'),
  ('perm-vet-live-notes', 'vet_live_notes', 'Canli gorusme notu ekle');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-vet-live', 'perm-vet-live-panel'),
  ('role-vet-live', 'perm-vet-live-notes'),
  ('role-vet-live', 'perm-view-pet'),
  ('role-vet-live', 'perm-view-health'),
  ('role-vet-live', 'perm-view-reports');

INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
  ('media_quality_check_enabled', 'false', 'Enable automatic client-side photo/video quality checks.'),
  ('ai_ignore_low_quality_media', 'true', 'Exclude user-marked poor or irrelevant media from vet-ready reports.');

INSERT OR IGNORE INTO plans (id, code, billing_type, billing_period, name_tr, price_cents, currency, play_product_id, max_pets, monthly_credit_allowance, features) VALUES
  ('plan-free', 'free', 'free', NULL, 'Ücretsiz', 0, 'TRY', NULL, 1, 0, '{"ai":false,"documents":false,"members":1,"aiCreditCost":1}'),
  ('plan-credit', 'credit', 'credit', NULL, 'Kredi ile Kullanım', 0, 'TRY', NULL, 3, 0, '{"ai":true,"documents":true,"members":2,"aiCreditCost":1}'),
  ('plan-premium-monthly', 'premium_monthly', 'subscription', 'monthly', 'Aylık Premium', 24900, 'TRY', 'pati_premium_monthly', 10, 8, '{"ai":true,"documents":true,"members":10,"aiCreditCost":1}'),
  ('plan-premium-yearly', 'premium_yearly', 'subscription', 'yearly', 'Yıllık Premium', 199000, 'TRY', 'pati_premium_yearly', 10, 8, '{"ai":true,"documents":true,"members":10,"aiCreditCost":1}');

INSERT OR IGNORE INTO credit_packages (id, code, name_tr, credit_amount, price_cents, currency, play_product_id, sort_order, metadata) VALUES
  ('credit-pack-1', 'credit_1', '1 Kredi', 1, 4900, 'TRY', 'pati_credit_1', 10, '{"aiCreditCost":1}'),
  ('credit-pack-10', 'credit_10', '10 Kredi', 10, 39000, 'TRY', 'pati_credit_10', 20, '{"aiCreditCost":1}');

INSERT OR IGNORE INTO users (id, email, phone, display_name, locale, metadata) VALUES
  ('user-1', 'ayse@email.com', '+905551112233', 'Ayşe Yılmaz', 'tr', '{"location":{"country":"Türkiye","province":"","district":"","neighborhood":""},"notificationPreference":"push"}');

INSERT OR IGNORE INTO users (id, email, phone, display_name, password_hash, locale, status, metadata) VALUES
  ('user-vet-1', 'vet1@vet.com', NULL, 'Dr. Deniz Kara', '1bcdebe2de0c5df0fc41e7475511ba21:5c665ebf39bc12107fe9a74251079a4ad43cb75a672dcf674c0f3dee3f2339cc', 'tr', 'active', '{"authProvider":"email_password","scope":"vet_live_seed"}'),
  ('user-vet-2', 'vet2@vet.com', NULL, 'Dr. Ece Arslan', 'd2a601e5ee0fa277127786d0efaeabbd:5e29028fff859e080239d30f11f7e1eb3d3fb4c00e10ef1ad5871bf80114f02f', 'tr', 'active', '{"authProvider":"email_password","scope":"vet_live_seed"}');

INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES
  ('user-1', 'role-owner'),
  ('user-vet-1', 'role-vet-live'),
  ('user-vet-2', 'role-vet-live');

INSERT OR IGNORE INTO vet_profiles
  (id, user_id, display_name, license_no, specialties, bio, status, is_active, rating_avg, rating_count, commission_rate, metadata)
VALUES
  ('vet-demo-1', 'user-vet-1', 'Dr. Deniz Kara', 'VET-TEST-001', '["genel danisma","kedi/kopek","acil on degerlendirme"]', 'Canli gorusme pilot akislari icin test veterineri.', 'approved', 1, 4.8, 0, 0, '{"source":"seed","scope":"vet_live_mvp"}'),
  ('vet-demo-2', 'user-vet-2', 'Dr. Ece Arslan', 'VET-TEST-002', '["beslenme","davranis","genel danisma"]', 'Canli gorusme pilot akislari icin ikinci test veterineri.', 'approved', 1, 4.7, 0, 0, '{"source":"seed","scope":"vet_live_mvp"}');

INSERT OR IGNORE INTO vet_availability (id, vet_id, weekday, starts_at, ends_at, timezone, is_active) VALUES
  ('vet-slot-1-mon', 'vet-demo-1', 1, '10:00', '18:00', 'Europe/Istanbul', 1),
  ('vet-slot-1-tue', 'vet-demo-1', 2, '10:00', '18:00', 'Europe/Istanbul', 1),
  ('vet-slot-1-wed', 'vet-demo-1', 3, '10:00', '18:00', 'Europe/Istanbul', 1),
  ('vet-slot-1-thu', 'vet-demo-1', 4, '10:00', '18:00', 'Europe/Istanbul', 1),
  ('vet-slot-1-fri', 'vet-demo-1', 5, '10:00', '18:00', 'Europe/Istanbul', 1),
  ('vet-slot-2-mon', 'vet-demo-2', 1, '12:00', '20:00', 'Europe/Istanbul', 1),
  ('vet-slot-2-tue', 'vet-demo-2', 2, '12:00', '20:00', 'Europe/Istanbul', 1),
  ('vet-slot-2-wed', 'vet-demo-2', 3, '12:00', '20:00', 'Europe/Istanbul', 1),
  ('vet-slot-2-thu', 'vet-demo-2', 4, '12:00', '20:00', 'Europe/Istanbul', 1),
  ('vet-slot-2-fri', 'vet-demo-2', 5, '12:00', '20:00', 'Europe/Istanbul', 1);

INSERT OR IGNORE INTO pets (id, primary_owner_user_id, species_id, name, sex, birth_date, approximate_age_label, weight_kg, ownership_type, medical_summary) VALUES
  ('pet-1', 'user-1', 'species-dog', 'Milo', 'male', '2021-03-15', '4 yaş', 28.5, 'owned', 'Genel durum iyi görünüyor'),
  ('pet-2', 'user-1', 'species-cat', 'Boncuk', 'female', '2022-08-10', '3 yaş', 4.2, 'owned', 'Takip gereken kayıt var');

INSERT OR IGNORE INTO pet_members (id, pet_id, user_id, role_id, status) VALUES
  ('member-user-1-pet-1', 'pet-1', 'user-1', 'role-owner', 'active'),
  ('member-user-1-pet-2', 'pet-2', 'user-1', 'role-owner', 'active');

INSERT OR IGNORE INTO credit_wallets (id, user_id, balance) VALUES
  ('wallet-user-1', 'user-1', 1);

INSERT OR IGNORE INTO credit_wallets (id, user_id, balance)
SELECT 'wallet-huseyin-test', id, 100
FROM users
WHERE phone IN ('5336565251', '+905336565251');

UPDATE credit_wallets
SET balance = CASE WHEN balance < 100 THEN 100 ELSE balance END
WHERE user_id IN (SELECT id FROM users WHERE phone IN ('5336565251', '+905336565251'));
