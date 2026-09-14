# Plugin開発の進め方

このガイドはClaude Code向け。既存コード・利用者の指示を優先し、設計資料は参考情報として使う。

## 公式資料の入口

仕様を採用する際は、利用可能なWeb取得機能で関連する公式資料を確認する。ネットワークが使えない場合は同梱資料の確認日とCLIヘルプを頼りにし、確認できなかった点を残す。

| 用途 | URL |
| --- | --- |
| 作成の全体像 | https://code.claude.com/docs/en/plugins.md |
| Manifest・CLI・配置 | https://code.claude.com/docs/en/plugins-reference.md |
| 動作評価 | https://code.claude.com/docs/en/plugin-evals.md |
| Skill | https://code.claude.com/docs/en/skills.md |
| Hook入門 | https://code.claude.com/docs/en/hooks-guide.md |
| Hook仕様 | https://code.claude.com/docs/en/hooks.md |
| Subagent | https://code.claude.com/docs/en/sub-agents.md |
| 作業の品質 | https://code.claude.com/docs/en/best-practices.md |
| Marketplace | https://code.claude.com/docs/en/plugin-marketplaces.md |

## 成果物

最小構成は`.claude-plugin/plugin.json`、`skills/<name>/SKILL.md`、利用者向けREADME。目的に応じてagents、hooks、MCPなどを追加する。`.claude-plugin/`内にskillsやagentsを置かない。

Marketplaceを作る場合はリポジトリ直下の`.claude-plugin/marketplace.json`に名前・管理者・Pluginのsourceを記述する。各Pluginは独立してコピーされるため、資料とスクリプトはその配布ディレクトリ内に収める。

## 実装前に決める評価

補助スクリプトは、JSON解析・入力検証・API連携・複雑な例外処理を伴う場合にPythonを優先する。単純なコマンド連結ならShell、既存の適切な実装がある場合はその言語を維持する。単体Pythonはuvのインライン依存宣言とスクリプト用lock、複数モジュールは`pyproject.toml`と`uv.lock`で管理する。標準ライブラリで足りるなら依存を追加しない。

具体的なコマンドは同梱の[Hooks資料](hooks.md#スクリプトの言語と依存管理を選ぶ)を読む。Hookの発火前にPython・依存環境を準備し、通常実行時の取得を避ける。`--locked`だけではネットワーク取得を止めない点、`--offline`はスクリプト自体の通信を制限しない点に注意する。起動失敗・未準備・オフラインのケースを検証し、uvやPythonを全Pluginに一律の必須依存として追加しない。

最低限、目的に合う入力、対象外の入力、不足・不正入力を用意する。各ケースに期待する結果と、してはいけない操作を記述する。Skillなしの場合との比較、複数回の結果、所要時間も必要に応じて評価する。

Hookは構文だけでなく、通過・拒否・起動失敗・時間超過を検証する。Subagentは実際に委任されたこと、根拠のある返却物、ツール範囲を確認する。例中の数値や依存コマンドは利用者の環境に合わせる。

## 検証コマンド

Pluginの親ディレクトリで実行する例:

```sh
claude --version
claude plugin validate ./my-plugin
claude --plugin-dir ./my-plugin
```

対話画面で`/my-plugin:<skill-name>`を呼び出す。変更後は`/reload-plugins`を使う。CLI未導入の場合はJSON/YAMLと参照整合性まで確認し、Claude Codeでの検証は未実施と報告する。

配布前には、ローカルMarketplaceからインストールしたキャッシュ内に資料があることも確かめる。利用者の既存設定を変えない検証が必要なら、専用の一時`CLAUDE_CONFIG_DIR`を使う。

## 完成条件

- 目的と利用例、対象外が説明されている。
- 構文と参照の検証が通る。
- 代表ケースの結果と未検証事項が記録されている。
- 導入方法と名前空間付き呼び出しがREADMEにある。
- 不要な権限・起動時処理・外部依存を追加していない。
- 配布先、バージョン、更新方法が明確になっている。
