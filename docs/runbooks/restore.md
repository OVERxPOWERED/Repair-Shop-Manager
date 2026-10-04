# Database Restore Runbook

> Step-by-step instructions to restore a PostgreSQL database from an encrypted backup archive.

## Prerequisites

1. **Age CLI** installed (`sudo apt-get install age` or `brew install age`).
2. **PostgreSQL 16 client tools** (`pg_restore` matching PostgreSQL 16 server version).
3. **Private Age Decryption Key**: `fixpro-backup.key` stored securely in password manager / secrets vault.
4. **AWS CLI / rclone** configured with access to the backup S3 bucket (or manual download from Cloudflare R2 dashboard).
5. **Target Database URL** with superuser/admin privileges on the target instance (e.g. Neon scratch database or local test container).

---

## 1. Download Encrypted Backup

Identify the backup filename from the bucket:
```bash
aws s3 ls s3://$BACKUP_BUCKET/daily/ --endpoint-url $BACKUP_S3_ENDPOINT
```

Download the desired snapshot:
```bash
aws s3 cp "s3://$BACKUP_BUCKET/daily/fixpro-YYYYMMDDTHHMMSSZ.dump.age" fixpro-backup.dump.age \
  --endpoint-url $BACKUP_S3_ENDPOINT
```

---

## 2. Decrypt Archive

Using the private key `fixpro-backup.key`:
```bash
age -d -i fixpro-backup.key fixpro-backup.dump.age > fixpro-backup.dump
```

Verify that the output file is a valid PostgreSQL custom-format dump:
```bash
file fixpro-backup.dump
# Output: PostgreSQL custom database dump
```

---

## 3. Restore to Target Database

> **WARNING**: Never restore blindly into production without verifying on a scratch database first.

If restoring into a fresh scratch database:
```bash
# If using Neon / remote PostgreSQL:
pg_restore --no-owner --clean --if-exists --dbname "$TARGET_DATABASE_URL" fixpro-backup.dump
```

Common flags:
- `--no-owner`: Do not attempt to match original database user ownership.
- `--clean`: Clean (drop) database objects prior to outputting commands for creating them.
- `--if-exists`: Use IF EXISTS when dropping objects.
- `--verbose`: Show detailed progress during table restoration.

---

## 4. Post-Restore Verification

1. Verify schema migration status:
```bash
cd backend
python manage.py migrate --check
```

2. Run smoke queries to verify data integrity:
```bash
python manage.py shell -c "from apps.tenancy.models import Shop; print('Active shops:', Shop.objects.count())"
python manage.py shell -c "from apps.audit.models import AuditLog; print('Audit records:', AuditLog.objects.count())"
```

3. Clean up decrypted unencrypted dump files:
```bash
shred -u fixpro-backup.dump
rm -f fixpro-backup.dump.age
```

---

## 5. Restore Drill Verification Record (Subphase 1.23)

- **Date:** 2026-10-04
- **Operator:** Solo Dev / CI Automation
- **Target Container / Environment:** Local Docker PostgreSQL 16 container (`fixpro_db` -> `fixpro_restore_drill`)
- **Procedure:**
  1. Exported live database snapshot using `pg_dump -Fc` (PostgreSQL custom archive).
  2. Simulated age encryption / decryption pipeline.
  3. Created isolated test database `fixpro_restore_drill`.
  4. Executed `pg_restore --clean --if-exists --no-owner --dbname=fixpro_restore_drill`.
  5. Validated schema migration parity with `python manage.py migrate --check` (0 pending migrations).
  6. Verified table row counts and referential constraints across `tenancy_shop`, `jobs_job`, `customers_customer`, `billing_invoice`, and `audit_auditlog`.
- **Outcome:** **SUCCESS**. Full database restored cleanly in < 3 seconds without data loss or foreign key violations.
