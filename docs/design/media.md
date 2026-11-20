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
    - アイキャッチ（1280px 以上）: 1056px（目次の有無にかかわらず、本文と目次の列の幅）、比率 5:2 → 2112px
    - スマホのアイキャッチ: カードの幅いっぱい（767px で約 677px）、比率 16:9 → 1354px 前後
    - 記事カードのサムネイル: 切り抜き 768×349（いちばん広いホームのタイル約 375×160px の 2 倍）
  - 横長の写真は幅 2400px、縦長の写真は 1800×2400px になり、どちらも上の条件を満たす
  - 値は旧リポジトリ（`sendo-kakeru/bowling-lab_old`）の CSS から算出した。見た目を作り直すときに見直す
- 保存形式: 写真は JPEG（品質 90 前後）、スクリーンショットは PNG のまま。最終的な圧縮と AVIF / WebP への変換は Transformations が行う
- HEIC: sharp のプリビルド版は非対応。CLI が `.heic` を見つけたら `sips -s format tiff` で先に変換する。可逆の TIFF を挟み、非可逆の圧縮を sharp の 1 回だけにするため

### 配信（Image Transformations）

- `format=auto` で AVIF / WebP を出し分ける
- `srcset` の幅の候補と `sizes` は、表示する場所ごとに決める（切り抜きと幅の候補は `src/lib/media/media.ts`、サムネイルの切り抜きは `src/lib/media/thumbnail.ts`。`sizes` は表示する側の CSS の隣で、アイキャッチは `src/pages/posts/[slug].astro`、カードは `PostCard.astro`）

  | 場所 | 切り抜き | 幅の候補 | `sizes` |
  | --- | --- | --- | --- |
  | 本文の画像 | なし | 480 / 760 / 1136 / 1520 | `(width >= 760px) 760px, 100vw` |
  | アイキャッチ（768px 以上） | 5:2 | 640 / 840 / 1056 / 1280 / 1680 / 2112 | 1280px 以上 1056px、1024px 以上 `100vw - 200px`、それ以外 `100vw - 170px` |
  | アイキャッチ（768px 未満） | 16:9 | 360 / 720 / 1080 / 1440 | `91.41vw - 24px` |
  | 記事カード | 約 2.2:1 | 224 / 352 / 528 / 768 | 下の「記事カード」 |

  - 本文の 1520 は本文の幅 760px の 2 倍。本文の `sizes` は実際の列の幅より大きめ（スマホ、1024〜1219px、縦長の画像）だが、メモの本文も同じ属性を使うので、記事のレイアウトに合わせて細かくしない
  - アイキャッチは `<picture>` で 768px を境に切り抜きを替える。`sizes` は記事のページの CSS から求めた表示幅を少し上回るように書き、候補は各ブレークポイントの 1x / 2x の表示幅（768px で 598、1024px で 824、1280px 以上で 1056、スマホで 319〜677）を少し上回るように選んだ。最初の画面に入るので `loading="eager"` と `fetchpriority="high"` を付ける
  - Safari は `sizes` の `min()` / `max()` を読めず、`sizes` 全体を `100vw` として扱う。`calc()` とメディア条件だけで書く
  - 記事カード: `object-fit: cover` で枠の高さに合わせて切るので、要る切り抜きの幅は「枠の幅」と「枠の高さ × 2.2」の大きいほう。スマホの 96px 角は 212px、一覧の 200×120px は 264px、ホームのタイル（高さ 160px）は 352px。タイルの幅は 1024px 以上で (画面幅 - 236px) / 3 なので、1292px から 352px を超え、1360px で約 375px に止まる。1292px 以上は 375px とする
- 候補はマスターの幅で頭打ちにして重複を除く（本文で幅 1000px なら 480 / 760 / 1000、150px なら 150 だけ）。超える候補を捨てるだけだと、1000px のマスターが 760px までしか配信されず、どの候補より小さいマスターでは候補がなくなるため。切り抜きは、マスターから切り出せるいちばん大きな幅で頭打ちにする（`fit=cover` はマスターより大きい切り抜きを求めると拡大する）
- 本文の画像と動画は、縦長でも画面の 80%（`80svh`）より高くしない。高さから逆算した幅の上限を CSS で掛けるため、`style="--media-ratio: 幅 / 高さ"` を付ける（`prose.css`）
- OGP 画像は R2 のメディアから切り出さず、ビルド時に別に生成する（[content.md](./content.md) の「OGP 画像」）
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
    - HDR（HLG / PQ）の動画は、macOS の VideoToolbox（`scale_vt`）で BT.709 の SDR に変換する。8 ビットに落とすだけでは色が薄くなるため。Homebrew の ffmpeg には zscale も libplacebo もない
    - 長辺 1920px に縮小する（小さい動画は拡大しない）。動画は配信時に変換しないので、閲覧者に届く重さはここでしか減らせない
      - 横長は幅 1920px になり、本文の表示幅（760px）の 2 倍を超える
      - 縦長は幅 1080px になる。本文では高さを画面の 80% に抑えるので、表示幅は 400px 前後で、2 倍でも足りる。高精細な画面の全画面再生では少し足りないが、容量を優先した
      - フレームレートは変えない。フォームの動きを見せるため。120fps や 240fps のスローモーションの原本もそのまま上がるので容量は大きくなる。写真アプリのスロー区間の情報は `-map_metadata -1` で引き継がれないので、再生は等速になる
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
- 論理パスは NFC にそろえてから manifest を引く。media:push は NFC でキーを書くが、macOS の Finder からコピーしたパスは NFD のことがある

動画をコンポーネント（`<Video />`）にしないのは、コンポーネントは MDX でしか使えず、md だけで書くメモでは使えないため。

## バケットを作るとき

バケットの作成は `wrangler.jsonc` の定義に乗せられるが、次の 3 つは別の作業になる。

- 独自ドメインの紐付けと公開設定: `wrangler r2 bucket domain add` かダッシュボードで行う。`r2.dev` の URL は開発用なので使わない
- Image Transformations の有効化: `sendo.page` のゾーンで 1 回だけ行う
- アップロード用の API トークンの発行: このバケット限定の読み書き。手元の `.env` に置く

このバケットはサイト本体からは使わない（配信は独自ドメイン経由、アップロードは手元の CLI から）。`wrangler.jsonc` にバインディングとして書くのは、バケットを作らせる目的だけになる。

## バケットができるまで

- manifest は空（`{}`）のまま。URL の組み立てと HTML の出力は単体テストで確かめる
- `media:push` は `--dry-run` で、R2 に上げる直前まで（画像の正規化、動画の書き出し、位置情報が消えていること、キーと manifest の内容）を確かめる。アップロード部分は、バケットができるまで実際には動かしていない状態になる

## あとで必要になりそうなこと

| 項目 | 補足 |
|---|---|
| メディアの削除 | 記事から消しても R2 に残る。`--force` で上書きした古いファイルも残る。掃除のコマンドは必要になってから作る |
| 幅を絞る Worker | 無料枠を食い潰された場合に前段に入れる |
| 原本の保管 | Google Drive への移し方は未定 |
