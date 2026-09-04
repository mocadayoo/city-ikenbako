# City Ikenbako

市民の意見を受け付け、受信処理と担当者の閲覧を確認できるNext.jsアプリケーションです。

PostgreSQLの実データ、ダンプ、接続情報はリポジトリへ含めません。共有するのはSchema、Migration、dev用seed SQLだけです。

## Local PostgreSQL

1. PostgreSQLで`city_ikenbako`データベースとアプリ用Roleを用意します。
2. `.env.example`を`.env.local`へコピーし、`DATABASE_URL`と暗号鍵を設定します。
3. Migrationとdev用アカウントを適用します。

```bash
npm run db:migrate
npm run db:seed
```

`db/seed.sql`にはdev用のCouncilorAccountが1件含まれます。実際のメール送信は行わず、投稿確認URLはNext.jsのサーバーコンソールへ出力します。

## Development

```bash
npm run dev
```

市議側は`/councilor/login`の開発用ボタンでログインできます。

## Routes

- `/submit`: 市民の投稿画面
- `/access/{token}`: 確認URLからAccess Sessionを発行
- `/opinions/view?id={opinionId}`: 市民・市議共通の閲覧画面
- `/councilor/opinions`: dev市議向けの全件一覧
