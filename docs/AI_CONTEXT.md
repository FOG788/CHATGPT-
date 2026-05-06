# AI Context

## Architecture

- `manifest.json`
  - MV3 manifest。
  - `config.js` + `content.js` を ChatGPT ドメインへ注入。
- `config.js`
  - 共有設定の単一ソース。
  - 既定値、型分類（boolean / numeric / text）、ショートカット判定関数を提供。
- `content.js`
  - 実行時本体。
  - UI 注入、スレッド削除、移動、定型文挿入、サイドバー自動スクロール、履歴遷移追従を担当。
- `options.html` + `options.js`
  - 設定 UI。
  - `chrome.storage.sync` への読書きとバリデーションを担当。
- `background.js`
  - オプションページ起動のメッセージ処理。

## Data Model

### Storage
- 保存先: `chrome.storage.sync`
- 方針:
  - boolean: 機能 ON/OFF
  - numeric: 最小/最大で clamp
  - text: 空入力時はデフォルトへフォールバック

### Local runtime
- `localStorage` の `cgpt_next_auto_scroll_at`
  - 自動スクロールの次回実行時刻を保持。
  - リロード直後の即時実行を避けるために使用。

## Runtime Flow (content.js)

1. `boot()`
   - 設定ロード
   - キーボード/フォーカス/履歴/設定変更リスナーを登録
   - 定期更新ループ開始
2. `rerender()`
   - 会話ページ判定
   - レール UI を再構成
   - 表示要素（削除、件数、移動、定型文）を設定に応じて生成
3. 操作実行
   - 削除: セッショントークン取得後、会話を `PATCH` で非表示化
   - 移動: 近傍/ランダムリンクを選択して遷移
   - 定型文: フォーカス中コンポーザーへ挿入
4. 保守
   - ヒーリングループが UI 崩れを検知し再描画
   - 必要時に最近件数を再計算

## Refactoring Notes (this revision)

- `options.js` のチェックボックスキー導出を定数化し、都度計算を削減。
- 一度削除してしまった `mainTextMaxWidthPx` を復元し、設定UIと実行時スタイル適用を再接続。

## Extension Rules

新しい設定を追加する場合:
1. `config.js` の `DEFAULTS` に追加。
2. 数値なら `NUMERIC_SETTING_KEYS` と `options.js` の `NUMERIC_INPUT_DEFS` に追加。
3. 文字列なら `TEXT_SETTING_KEYS` と `options.html` の input/textarea を追加。
4. `content.js` 側の機能実装は必ずフラグでガード。

## Risks

- ChatGPT DOM の変更に依存する箇所（アンカー探索、サイドバー探索）は将来破損しうる。
- 会話削除 API の仕様変更時は削除機能が失敗する可能性がある。
