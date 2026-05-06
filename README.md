# ChatGPT Thread Deleter

Chrome拡張

## 機能
- スレッド削除
- 最近件数表示
- 自動スクロール
- ランダム/上下スレッド移動
- 定型文ボタンとショートカット

## 使い方
1. ダウンロード
2. `chrome://extensions`
3. デベロッパーモードON
4. 「パッケージ化されていない拡張機能を読み込む」からこのフォルダを選択

## ドキュメント
- 人間向け: `docs/HUMAN_GUIDE.md`
- AI/開発者向け: `docs/AI_CONTEXT.md`

## 読み込みエラー対策
- `manifest.json` があるフォルダをそのまま選択してください（1つ上/下の階層を選ぶと読み込み失敗します）。
- 例: `.../CHATGPT-/manifest.json` が見えるディレクトリを指定。
