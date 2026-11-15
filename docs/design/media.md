# メディア配信の設計（画像・動画）

記事とメモに載せる画像と動画の、加工、保存、配信の設計。記事とメモ自体の設計は [content.md](./content.md)。

具体的なツールや加工の内容は大まかな方針で、よりよい方法があれば替えてよい。

## 前提

- サイトは Astro + Markdown、Cloudflare でホスティングする
- メディアは R2 に保存し、メディア用のサブドメイン（`bowling-media.sendo.page`）から画像も動画も配信する
- CLI は TypeScript で書き、Node で `.ts` をそのまま実行する
- アップロードは認証つきの API を用意せず、手元の CLI で行う
- R2 のバケットはまだない。デプロイの仕組みを作るときに用意する（[バケットを作るとき](#バケットを作るとき)）

## 全体構成

| 種類 | R2 に保存するもの | 配信 |
|---|---|---|
| 画像 | EXIF を除去して正規化したマスター | Image Transformations（パス形式） |
| 動画 | ffmpeg で加工した MP4 とポスター画像 | R2 から直接配信 |
| 原本 | 保存しない | Google Drive に手動で保管（方法は別途検討） |

### R2

- 公開バケットは 1 つ（仮の名前: `bowling-lab-media`）。独自ドメイン `bowling-media.sendo.page` を紐付ける
  - `images/`: 画像のマスターと動画のポスター画像
  - `videos/`: 加工済みの MP4
- R2 の公開設定はバケット単位で、パスごとに公開・非公開を切り替えられない。そのため公開バケットには加工済みのものだけを置く
- API トークンはこのバケットに限定した Object Read & Write にする

ドメインを `media.bowling.sendo.page` にしないのは、サブドメインが 2 段になると Cloudflare の無料の証明書の対象外になることがあるため。

### 配信 URL

- 画像: `https://bowling-media.sendo.page/cdn-cgi/image/width=960,format=auto/images/2026/kyoto/cat.a1b2c3.jpg`
  - Cloudflare Images が定めている形式: `/cdn-cgi/image/<OPTIONS>/<SOURCE>`
  - ゾーンで Transformations を有効にするだけで動く。Worker も Rewrite Rule も使わない
  - URL は Astro 側が manifest から生成するので、人が書くことはない
- 動画: `https://bowling-media.sendo.page/videos/2026/kyoto/walk.d4e5f6.mp4`

配信用ドメインは `src/consts.ts` の定数 1 か所に置く。

## 画像

### マスター（アップロード時に sharp で処理）

- EXIF / GPS を除去する（sharp は既定でメタデータを破棄する）
- `.rotate()` で EXIF の向きを画素に反映する
- `resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })`
  - 根拠: 表示される最大幅（CSS ピクセル）の 2 倍
    - 本文: 760px（`--layout-content-width`）→ 1520px
    - アイキャッチ（1024px 以上・目次なし）: 1136px（目次ありは 1056px）、比率 5:2 → 2272px
    - スマホのアイキャッチ: 画面幅いっぱい、比率 16:9 → 1534px 前後
    - 一覧のサムネイル: 96px 角
  - 横長の写真は幅 2400px、縦長の写真は 1800×2400px になり、どちらも上の条件を満たす
  - 値は旧リポジトリ（`sendo-kakeru/bowling-lab_old`）の CSS から算出した。見た目を作り直すときに見直す
- 保存形式: 写真は JPEG（品質 90 前後）、スクリーンショットは PNG のまま。最終的な圧縮と AVIF / WebP への変換は Transformations が行う
- HEIC: sharp のプリビルド版は非対応。CLI が `.heic` を見つけたら `sips -s format jpeg` で先に変換する

### 配信（Image Transformations）

- `format=auto` で AVIF / WebP を出し分ける
- `srcset` の幅の候補: 192 / 480 / 760 / 1136 / 1520 / 2272（用途ごとに必要なものだけ使う）。192 は一覧のサムネイル（96px 角）用
- OGP 用の画像（1200×630、切り抜き）も同じ URL の組み立てで出す
- 無料枠は月 5,000 ユニーク変換。幅 × フォーマットごとに 1 件と数える。超過すると、キャッシュ済みのものは配信され続け、新しい変換はエラーになる
- メタデータ: 既定の `metadata=copyright` のままにする（WebP / AVIF の出力は常に全破棄）。`keep` は使わない
- `onerror=redirect` は付けない
- 既知のリスク: 誰でも任意の幅を指定して変換させられるので、無料枠を食い潰される可能性がある。問題が起きたら、許可した幅だけを通す Worker を前段に入れる（そのときは manifest と Astro の URL 生成だけを直し、md は変えない）

## 動画

- Cloudflare Stream は使わない（無料枠がなく、最低 $5/月かかるため）
- 手元の ffmpeg で次を書き出す
  - H.264 / AAC の MP4
    - `-movflags +faststart`: 先頭から再生を始められるようにする
    - `-map_metadata -1`: 元ファイルのメタデータを引き継がない。ffmpeg は既定で引き継ぐので、付けないと iPhone の動画の撮影場所が MP4 に残る
    - `-pix_fmt yuv420p`: 8 ビットにする。iPhone の HDR 動画をそのまま H.264 にすると、色が薄くなったり再生できないブラウザが出たりする
  - ポスター画像（`images/` に置き、画像と同じく変換配信する）
- 書き出した MP4 を ffprobe で調べ、位置情報の欄が残っていないことを確かめる
- ffprobe で幅・高さ・長さを取得し、manifest に書く
- R2 から直接配信して `<video>` で再生する（R2 は転送量が無料で、Range リクエストに対応している）
- `<video>` には `controls`、`playsinline`、`preload="metadata"`、`poster`、`width`、`height` を付ける
- 将来の選択肢: Media Transformations、HLS での書き出し

### Media Transformations を使わなかった理由

Worker の中で動画を変換できる仕組み（公開ベータ）。次の点が未確認、または制約になるので、最初は ffmpeg にした。

- 出力は最長 60 秒、入力は 100 MB まで
- 確認済みの入力形式は H.264 + AAC の MP4。iPhone の既定（HEVC の MOV）は対象外
- 出力に元のメタデータが残るかどうかがドキュメントに書かれていない
- ベータ後は出力 1 秒が 1 回分として、画像と共通の無料枠（月 5,000）から引かれる

## CLI

### 使うライブラリ

- sharp: 画像の加工
- ffmpeg / ffprobe: 動画の加工。`node:child_process` の `spawn` で呼ぶ（fluent-ffmpeg はメンテナンスが終わっているので使わない）。mise で固定できなければ brew で入れる
- `@aws-sdk/client-s3`: R2 の S3 互換 API でアップロードする
- `node:fs` の `glob`: ファイルの走査
- p-limit（または自前の数行）: 並列実行
- `node:crypto`: ハッシュの計算

### 配置（モノレポにはしない）

```
scripts/media/                 CLI のコード。依存はルートの devDependencies に入れる
media/inbox/                   上げたいメディアを入れる。配下のパスがそのまま R2 のキーになる
media/uploaded/                push に成功した原本の移動先。Drive に移したら手で消す
src/data/media-manifest.json   git で管理する。Astro から読み込む
```

- `media/inbox/` と `media/uploaded/` は gitignore する。原本には位置情報が入っているので、`git add -A` で履歴に入ると消せなくなる
- R2 の API トークンは `.env` に置く（gitignore 済み）
- `package.json`: `"media:push": "node scripts/media/push.ts"`

### `media:push` の流れ

1. `media/inbox` を走査する
2. 種類を判定して加工する（画像はマスター化、動画は MP4 とポスター画像を生成）
3. R2 へ並列でアップロードする
   - キー: `images/` または `videos/` + inbox での相対パス + 短いハッシュ（例: `images/2026/kyoto/cat.a1b2c3.jpg`）
   - `Cache-Control: public, max-age=31536000, immutable`
   - ファイル名は NFC に正規化する（macOS は NFD で返すため）
4. manifest に追記する。manifest にあるものはスキップするので、何度実行しても同じ結果になる
5. 成功したものは原本を `media/uploaded/` へ移動する。失敗したものは inbox に残す（再実行がそのままリトライになる）
6. md に貼る記法を出力する（`--copy` でクリップボードへ）

オプション: `--dry-run`、`--force`（同じ論理パスの上書きを許可）

### manifest の形

```json
{
  "2026/kyoto/cat.jpg": {
    "key": "images/2026/kyoto/cat.a1b2c3.jpg",
    "type": "image", "width": 2400, "height": 1600
  },
  "2026/kyoto/walk.mov": {
    "key": "videos/2026/kyoto/walk.d4e5f6.mp4",
    "type": "video", "width": 1920, "height": 1080, "duration": 12.4,
    "poster": "images/2026/kyoto/walk.d4e5f6.poster.jpg"
  }
}
```

manifest の役割:

- md に書く論理パスを、ハッシュつきのキーに対応付ける（md にはハッシュを書かずに済み、長期間のキャッシュも使える）
- 幅と高さを出力して、読み込み中のレイアウトのずれを防ぐ。ビルド時に画像を取りに行く必要がない
- 上げ忘れを検出する
- 上げ済みのものをスキップして、差分だけアップロードする

## Astro 側

- md には論理パスで書く。画像も動画も同じ画像の記法を使う
  - 画像: `![レーンの写真](media:2026/kyoto/cat.jpg)`
  - 動画: `![](media:2026/kyoto/walk.mov)`
- Markdown の変換の中で manifest を引き、`type` を見て出力を分ける
  - 画像: `/cdn-cgi/image/` の `srcset` を組んで `<img>` / `<picture>` を出力し、`width`、`height`、`sizes` も付ける
  - 動画: `<video>` に MP4 とポスター画像（変換配信の URL）を指定する
- manifest にない参照はビルドエラーにする
- 記事のフロントマターの `thumbnail` も同じ論理パスで書く

動画をコンポーネント（`<Video />`）にしないのは、コンポーネントは MDX でしか使えず、md だけで書くメモでは使えないため。

## バケットを作るとき

バケットの作成は `wrangler.jsonc` の定義に乗せられるが、次の 3 つは別の作業になる。

- 独自ドメインの紐付けと公開設定: `wrangler r2 bucket domain add` かダッシュボードで行う。`r2.dev` の URL は開発用なので使わない
- Image Transformations の有効化: `sendo.page` のゾーンで 1 回だけ行う
- アップロード用の API トークンの発行: このバケット限定の読み書き。手元の `.env` に置く

このバケットはサイト本体からは使わない（配信は独自ドメイン経由、アップロードは手元の CLI から）。`wrangler.jsonc` にバインディングとして書くのは、バケットを作らせる目的だけになる。

## バケットができるまで

- manifest は手書きの仮データにする。URL の組み立てと HTML の出力までを確かめ、画像と動画そのものは表示されない
- `media:push` は `--dry-run` で、R2 に上げる直前まで（画像の正規化、動画の書き出し、位置情報が消えていること、キーと manifest の内容）を確かめる。アップロード部分は、バケットができるまで実際には動かしていない状態になる

## あとで必要になりそうなこと

| 項目 | 補足 |
|---|---|
| メディアの削除 | 記事から消しても R2 に残る。`--force` で上書きした古いファイルも残る。掃除のコマンドは必要になってから作る |
| 幅を絞る Worker | 無料枠を食い潰された場合に前段に入れる |
| 原本の保管 | Google Drive への移し方は未定 |
