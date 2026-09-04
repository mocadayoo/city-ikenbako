import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO councilors (id, name, district, organization)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        '青木 まち子',
        '中央区',
        'City Ikenbako 市議会'
      )
      ON CONFLICT (id) DO NOTHING
    `;

    await transaction`
      INSERT INTO councilor_accounts (
        id,
        councilor_id,
        email,
        password_hash,
        role,
        is_enabled,
        email_verified_at
      )
      VALUES (
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001',
        'dev-councilor@localhost',
        'dev-only-mock-account',
        'COUNCILOR',
        true,
        now()
      )
      ON CONFLICT (id) DO NOTHING
    `;
  });

  console.info("Local dev councilor seed applied.");
} finally {
  await sql.end();
}
