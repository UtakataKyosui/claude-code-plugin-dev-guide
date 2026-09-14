# Plugin Dev Guide

Claude Code Pluginの作成とレビューを日本語で支援するガイドPluginです。公式資料への入口と、Skill・Hook・Subagentの設計基準・フロントマターの資料を同梱します。

## 導入

Claude Codeを導入・認証済みの環境で、Marketplaceが公開された後に対話画面で実行します。

```text
/plugin marketplace add UtakataKyosui/claude-code-plugin-dev-guide
/plugin install plugin-dev-guide@plugin-dev-guide-marketplace
/reload-plugins
```

## 使用例

```text
/plugin-dev-guide:guide コードレビュー手順をSkillにしたPluginを./review-helperに作って
/plugin-dev-guide:guide Plugin配下のSubagentに使えるフロントマターを説明して
/plugin-dev-guide:review ./review-helper
```

`guide`は説明依頼には説明、作成依頼には設計・実装・検証を行います。`review`は既存Pluginの問題と修正案を返します。目的に合う自然言語の依頼でも選択されます。通常の会話で不要なら手動で呼び出してください。

## 構成と前提

- `skills/guide/`: 作成・設計の入口。
- `skills/review/`: 既存Pluginの点検。
- `references/`: 開発手順、設計資料、GitHub Actionsによるリリース管理。インストール先から参照可能。

自動実行するHooks、MCP接続、追加のツール事前許可は含みません。ファイル読み書きやコマンド実行には利用環境の権限が適用されます。公式資料の更新確認にはネットワークが必要です。資料だけで動作を保証せず、利用者のClaude Codeバージョンで検証します。

## 更新

```text
/plugin marketplace update plugin-dev-guide-marketplace
/plugin update plugin-dev-guide@plugin-dev-guide-marketplace
/reload-plugins
```

変更時はManifestのバージョンを更新します。リポジトリの`docs/`が設計資料の正本です。同期・検証方法はリポジトリREADMEを参照してください。

## バージョンとGitHub Release

Manifestの`version`を更新したら、`plugin-dev-guide--v<version>`タグを対象コミットへPushします。GitHub ActionsがタグとManifestを照合し、成功時にGitHub Releaseを作成します。詳細、CIの作成例、必要な権限は同梱の[リリース管理資料](references/release-management.md)を参照してください。

Plugin配下の変更を含むPRでは、PRのOpen時・更新時にCIがベース版との差分を調べ、`plugin.json`の`version`更新を要求します。Release CIはタグ直前のコミットでも版が変わったことを確認するため、版を更新していないコミットへのタグ付けは失敗します。
