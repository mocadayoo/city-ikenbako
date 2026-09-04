# City Ikenbako

市民の意見を受け付け、受信処理と担当者の閲覧を確認できるNext.jsアプリケーションです。

PostgreSQLの実データ、ダンプ、接続情報はリポジトリへ含めません。共有するのはSchema、Migration、dev用seed SQLだけです。

## Local PostgreSQL

Docker Composeを使う場合は、Local PostgreSQLの起動・停止をpackage scriptから実行できます。

```bash
npm run db:up
npm run db:migrate
npm run db:seed
```

停止・状態確認・ログ確認：

```bash
npm run db:stop
npm run db:status
npm run db:logs
```

`.env.example`を`.env.local`へコピーし、暗号鍵を設定します。

`db:generate`、`db:migrate`、`db:seed`は`.env.local`の`DATABASE_URL`を読み込みます。接続先は`drizzle.config.ts`に記載せず、環境変数だけで管理します。

PostgreSQLのデータはDockerのnamed volumeへ保存され、リポジトリには含まれません。意見の削除操作は関連データを含めてDBから完全に削除し、復元できません。

Docker Desktopを起動できる環境では、実DBを残さない一時コンテナ検証も実行できます。

```bash
npm run db:verify
```

このコマンドはPostgreSQLコンテナを終了時に削除します。

`db/seed.sql`にはdev用のCouncilorAccountが1件含まれます。`npm run db:seed`はNodeのPostgreSQLクライアントで実行するため、`psql`コマンドは不要です。実際のメール送信は行わず、投稿確認URLはNext.jsのサーバーコンソールへ出力します。

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
