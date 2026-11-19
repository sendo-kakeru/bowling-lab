# Sendo Bowling Lab

ボウリングの雑記サイト

- サイト名: **Sendo Bowling Lab**
- Instagram: [@sendo_bowling](https://www.instagram.com/sendo_bowling/)
- ドメイン: `bowling.sendo.page`

## 機能

- 記事: 通常の記事投稿
- メモ: 独り言
  - 記事にするほどでもない思考
  - 1つのメモに対して、あとから続きを足せる
- 将来的にスコアなども見せられるボウリング業界でのプロフィールサイトにしても良さそう

## 開発

```bash
pnpm install
pnpm dev      # 開発サーバー（http://localhost:4321）
pnpm build    # 本番ビルド（dist/）
pnpm preview  # ビルド結果の確認
pnpm lint     # lint と整形の確認（Biome）
pnpm format   # lint の自動修正と整形
pnpm test     # ユニットテスト
pnpm typecheck  # 型チェック
pnpm memo       # メモを作る
pnpm memo:add   # いちばん新しいメモに続きの見出しを足す
pnpm post       # 記事の下書きを作る
pnpm media:push # 画像と動画を加工して R2 に上げる
pnpm storybook  # Storybook（http://localhost:6006）
pnpm build-storybook  # Storybook のビルド
```

コンテンツのコマンドの詳しい動きは [content.md のコマンド](docs/design/content.md#コマンド)、`media:push` は [media.md の CLI](docs/design/media.md#cli)。

- 設計: [コンテンツ管理](docs/design/content.md)、[メディア配信](docs/design/media.md)
- 開発の進め方: [AI 開発体制](docs/ai-development.md)
- 旧サイト（EmDash 製）: [sendo-kakeru/bowling-lab_old](https://github.com/sendo-kakeru/bowling-lab_old)

## ブランチ名規約

- `main`: 本番環境用ブランチ（直接プッシュ禁止）
- `develop`: 開発用の統合ブランチ
- `feature/*`: 新機能開発用ブランチ
- `fix/*`: 軽微な修正用ブランチ
- `bugfix/*`: バグ修正用ブランチ
- `hotfix/*`: 本番環境の緊急修正用ブランチ
- `chore/*`: 雑務・依存関係更新用ブランチ
- `refactor/*`: リファクタリング用ブランチ
- `docs/*`: ドキュメント更新用ブランチ
- `revert/*`: コミット取り消し用ブランチ

## コミットメッセージ規約

### フォーマット

```
<type>(<scope>): <title>
<body>
```

例

```
feat(api): 変更内容の概要

詳細な説明（必要に応じて）
```

### 構成

1. 件名行: `<type>(<scope>): 変更内容の概要`（70 文字以内）
2. 空行: 件名と本文の間に必須
3. 本文: Why を重視（必要に応じて）
   - What よりも Why を記述
   - 箇条書きは `-` を使用
   - 破壊的変更: `BREAKING CHANGE:` で始める
   - 日本語

### type 一覧

- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマット等）
- `perf`: パフォーマンス改善
- `test`: テストの追加や修正
- `refactor`: バグ修正や機能追加を含まないコード変更
- `chore`: ビルドプロセスやツールの変更
- `revert`: revert 用
