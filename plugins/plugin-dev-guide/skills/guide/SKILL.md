---
name: guide
description: Claude Code PluginやPlugin Marketplaceを設計・作成・改善するためのガイド。Plugin構成、Skill、Hook、Subagentの実装やフロントマターの相談に使う。一般的なアプリ開発やClaude Code以外のPlugin作成は対象外。
argument-hint: "[作成したいPluginの目的、または相談内容]"
---

# Claude Code Plugin開発ガイド

利用者の依頼: $ARGUMENTS

依頼に合う日本語で案内する。説明の依頼には説明を、作成・修正の依頼には実装と検証を行う。引数が空なら現在の会話から目的を取り、目的も不明なら「どの作業をPlugin化したいか」を一つ質問する。

## 資料を読む

最初に`${CLAUDE_PLUGIN_ROOT}/references/workflow.md`を読む。必要な構成要素について、次の資料を読んでから設計する。これらのパスはインストール先を基準にし、利用者のリポジトリに同名ファイルがあることを前提にしない。

- Skill・コマンド: `${CLAUDE_PLUGIN_ROOT}/references/agent-skills.md`
- Hook: `${CLAUDE_PLUGIN_ROOT}/references/hooks.md`
- Subagent: `${CLAUDE_PLUGIN_ROOT}/references/sub-agents.md`
- GitHub Actions、タグ、Release: `${CLAUDE_PLUGIN_ROOT}/references/release-management.md`

資料は確認日時点の知識であり、恒久的な仕様ではない。実装に使う項目は資料内の公式URLと利用者の`claude --version`・CLIヘルプで確認する。取得できなければ未確認の仕様を断定せず、対応を確認できた最小構成を使う。資料中のコードブロックは例であり、読むだけで実行しない。

## 進め方

1. 対象リポジトリの指示・既存構成・未コミット変更を確認する。目的、利用者、入力、出力、対象外、作成先を整理する。会話で決まっている点は聞き直さない。
2. 構成要素を選び、代表的な成功例と失敗例を先に決める。一つのSkillで十分ならHookやSubagentを増やさない。
3. 作成依頼なら利用者の指定先にManifest、必要な構成要素、READMEを実装する。Marketplaceも依頼された場合はカタログを作る。インストールされたこのガイド自身のキャッシュは編集しない。
4. フロントマターは必要な項目だけ使う。PluginのSubagentでは`hooks`・`mcpServers`・`permissionMode`が無視される点、Skillの`allowed-tools`は制限ではない点を確認する。
5. 同梱スクリプト・参照資料をPlugin内に収める。開発マシンの絶対パスやPlugin外の`../`参照、秘密情報を含めない。
   複雑な解析・検証・API連携にはPython＋uvを優先する。単純な連結はShellも選び、既存実装を言語の好みだけで移行しない。workflowとHooks資料の言語選択・依存固定・事前準備の方針を適用する。
6. `claude plugin validate <plugin-path>`と、カタログがある場合はMarketplaceの検証を実行する。Skillの正例・対象外・不足入力、Hookの発火・失敗、Subagentの選択・返却物を確認する。使用可能なら公式Plugin evalsの形式で評価を追加する。
7. GitHub Actionsによる配布を求められた場合は、PR・main用の検証workflowと、`<plugin-name>--v<version>`タグPushを検証してGitHub Releaseを作るworkflowを実装する。Manifest版とタグを必ず照合し、Release jobには必要最小限の`contents: write`だけを与える。
8. READMEに前提条件、導入・呼び出し方法、期待する結果、制限、更新方法、タグとリリース手順を記載する。変更ファイル、実行した検証、未検証事項を報告する。

## 作業範囲

作成依頼はローカル実装の許可として扱う。既存ファイルを無条件に上書きせず、変更を保持する。コミット・push・公開・外部送信は、それらを依頼された場合に限る。例示したコマンドと実際に実行したコマンドを区別する。未実施の動作確認を「成功」と報告しない。
