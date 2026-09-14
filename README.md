# Claude Code Plugin 開発ガイド

このリポジトリは、Claude CodeのPluginを作成する際に「何を行うべきか」「どのコマンドを実行するか」「どの順番で進めるか」「どのような成果物ができているのが理想か」を説明するためのガイドです。

公式ドキュメントへのリンクを入口として、設計・実装・検証・配布までの流れをまとめます。初めてPluginを作る人や、チームで再利用できる開発手順を整えたい人を対象にしています。

このREADMEのコードは学習用の作成例です。サンプルPluginの実ファイルは同梱していません。

## 良い構成要素を設計するためのガイド

公式資料をもとに、設計基準・具体例・避けたい設計・検証方法をまとめています。

| ガイド | 主な観点 |
| --- | --- |
| [良いAgent Skillとは](docs/agent-skills.md) | 適切な呼び出し条件、簡潔な手順、成果物と評価。 |
| [良いHookとは](docs/hooks.md) | イベントの選択、入出力契約、失敗時の挙動と実行コスト。 |
| [良いSubagentとは](docs/sub-agents.md) | 担当範囲、必要な情報・ツール、親が利用できる報告。 |

## 公式ドキュメントのリンク集

確認日: 2026-09-15。リンク先はClaude Code公式ドキュメントの英語版です。仕様や利用条件は更新されるため、実装時にはリンク先も確認してください。

### 必ず確認するドキュメント（Markdown版）

Plugin開発に取り組む際は、まず`plugins.md`と`plugin-evals.md`を読み、作成方法と評価方法を確認してください。あわせて、構成要素の仕様と、Pluginに記述する指示・作業手順の品質を考えるためのベストプラクティスも確認します。

| 確認すべきURL | 確認する内容 |
| --- | --- |
| [plugins.md](https://code.claude.com/docs/en/plugins.md) | Pluginの作成方法、構成、ローカルテストの流れ。 |
| [plugin-evals.md](https://code.claude.com/docs/en/plugin-evals.md) | Pluginの評価ケース、採点、期待する動作の検証方法。 |
| [skills.md](https://code.claude.com/docs/en/skills.md) | Skillの書き方、呼び出し条件、引数、補助資料の扱い。 |
| [hooks-guide.md](https://code.claude.com/docs/en/hooks-guide.md) | Hookによる自動化の考え方と作成手順。 |
| [sub-agents.md](https://code.claude.com/docs/en/sub-agents.md) | Subagentの定義、担当作業、ツールなどの設定。 |
| [hooks.md](https://code.claude.com/docs/en/hooks.md) | Hookのイベント、設定形式、入出力・終了コードの仕様。 |
| [plugins-reference.md](https://code.claude.com/docs/en/plugins-reference.md) | Manifest、ディレクトリ構成、各構成要素とCLIの詳細仕様。 |
| [best-practices.md](https://code.claude.com/docs/en/best-practices.md) | Claude Codeを効果的に使うためのベストプラクティス。Plugin内の指示や作業手順を設計する際にも参照する。 |

### 最初に読む資料

| 資料 | 分かること・読むタイミング |
| --- | --- |
| [Quickstart](https://code.claude.com/docs/en/quickstart) | Claude Codeの導入・認証・基本操作。開発環境の準備に使う。 |
| [Create plugins](https://code.claude.com/docs/en/plugins) | Pluginを使う場面、最小構成、ローカルでの試し方。最初に通読する。 |
| [Plugins reference](https://code.claude.com/docs/en/plugins-reference) | Manifestのフィールド、配置規則、各構成要素、CLIの仕様。実装・デバッグ時に参照する。 |
| [CLI reference](https://code.claude.com/docs/en/cli-reference) | 起動オプションなどの意味。コマンドを実行する際に参照する。 |

### Pluginを構成する要素

すべての要素を含める必要はありません。目的に必要なものを選びます。

| 要素 | 主な配置場所 | 役割と公式資料 |
| --- | --- | --- |
| Manifest | `.claude-plugin/plugin.json` | 名前・説明・バージョンなどの識別情報。[Manifest仕様](https://code.claude.com/docs/en/plugins-reference#plugin-manifest-schema) |
| Skills / コマンド | `skills/<skill-name>/SKILL.md` | 繰り返し使う指示・作業手順。説明文、引数、呼び出し制御、補助資料の分け方を学ぶ。[Skills](https://code.claude.com/docs/en/skills) |
| Subagents | `agents/` | 専門作業を担当するエージェント。プロンプト・使用ツール・モデルなどを定義する。[Subagents](https://code.claude.com/docs/en/sub-agents) |
| Hooks | `hooks/hooks.json` | ツール実行などのイベントに応じた処理。[作成ガイド](https://code.claude.com/docs/en/hooks-guide)で概要をつかみ、[リファレンス](https://code.claude.com/docs/en/hooks)でイベント・入力・終了コードを確認する。 |
| MCP servers | `.mcp.json` | 外部ツールやサービスとの連携。[MCP](https://code.claude.com/docs/en/mcp)で接続・認証を、[Plugin内での設定](https://code.claude.com/docs/en/plugins-reference#mcp-servers)で組み込み方を確認する。 |
| LSP servers | `.lsp.json` | 言語サーバーによるコード解析。[LSP設定](https://code.claude.com/docs/en/plugins-reference#lsp-servers)を参照。利用者側にサーバー実行ファイルの準備が必要。 |
| その他の拡張 | `settings.json`、`monitors/`など | 既定設定やバックグラウンド監視が必要な場合に、[構成の概要](https://code.claude.com/docs/en/plugins#plugin-structure-overview)から対応する仕様を確認する。 |

新規のコマンドは`skills/`で作成します。既存の`commands/`形式もサポートされています。Skillsの呼び出し方や自動実行の制御は[Skillsのドキュメント](https://code.claude.com/docs/en/skills)を参照してください。

### 検証・配布で読む資料

| 資料 | 分かること・読むタイミング |
| --- | --- |
| [Pluginの検証コマンド](https://code.claude.com/docs/en/plugins-reference#plugin-validate) | 構文・スキーマ検証とオプション。実装後や配布前に使う。 |
| [Test plugins with evals](https://code.claude.com/docs/en/plugin-evals) | テストケース・採点・Pluginなしとの比較による動作評価。利用条件を確認し、継続的な品質評価に使う。 |
| [Create and distribute a plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces) | 配布カタログの作成、ソースの指定、ローカル検証、公開・更新。配布を始めるときに読む。 |
| [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins) | Marketplaceの追加とPluginのインストール・管理。利用者の導入手順を書く際に使う。 |
| [デバッグ用ツール](https://code.claude.com/docs/en/plugins-reference#debugging-and-development-tools) | 読み込みエラーや構成要素が動かない場合の調査方法。 |

## 開発の進め方

以下は、このガイドで推奨する開発手順です。

### 1. 目的と完成条件を決める

実装前に、対象ユーザー、解決する課題、入力、期待する出力、対象外の作業を文章にします。たとえば「指定された変更をレビューし、問題点と理由を報告する。ファイルは変更しない」のように、動作を確認できる形にします。

そのうえで必要な構成要素を選びます。作業手順ならSkill、専門担当ならSubagent、イベントに対する処理ならHook、外部サービスへの接続ならMCPが候補です。

### 2. 最小のPluginを作る

Claude Codeを導入・認証済みの環境で進めます。以下のシェルコマンドは、作成先の親ディレクトリで実行します。

```sh
claude --version
mkdir -p my-plugin/.claude-plugin my-plugin/skills/hello
```

エディターで`my-plugin/.claude-plugin/plugin.json`を作成します。

```json
{
  "name": "my-plugin",
  "description": "Plugin開発の流れを確認するサンプル",
  "version": "0.1.0"
}
```

続いて、`my-plugin/skills/hello/SKILL.md`を作成します。

```markdown
---
description: 指定された相手に日本語で短い挨拶を返す。
disable-model-invocation: true
---

$ARGUMENTS を挨拶の相手の名前として扱い、日本語で一文の挨拶を返してください。
名前が空なら、名前を含めずに挨拶してください。
```

ここでは手動で呼び出すSkillとして定義しています。構成は次のようになります。

```text
my-plugin/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    └── hello/
        └── SKILL.md
```

`skills/`や`agents/`、`hooks/`はPluginルートに置きます。`.claude-plugin/`の中には置きません。Manifestを省略できる構成もありますが、このガイドでは名前とバージョンを明示します。根拠: [Plugin作成ガイド](https://code.claude.com/docs/en/plugins)。

### 3. ローカルで読み込み、動作を確かめる

親ディレクトリのシェルで実行します。

```sh
claude plugin validate ./my-plugin
claude --plugin-dir ./my-plugin
```

起動したClaude Codeの対話画面で実行します。以下はシェルコマンドではありません。

```text
/my-plugin:hello 太郎
/my-plugin:hello
```

名前あり・なしの両方で期待する挨拶になるか確認します。ファイルを修正したら、対話画面で再読み込みして試します。

```text
/reload-plugins
```

読み込みに問題があれば`/plugin`のErrorsタブを確認します。詳細なログが必要な場合は、シェルから次のように起動します。

```sh
claude --debug --plugin-dir ./my-plugin
```

構文検証の成功だけでは、期待する動作まで保証されません。実際の入力と出力も確認します。参照: [ローカルテスト](https://code.claude.com/docs/en/plugins#test-your-plugins-locally)、[検証仕様](https://code.claude.com/docs/en/plugins-reference#plugin-validate)。

### 4. 必要な機能を追加し、検証する

リンク集の仕様に沿って、必要な構成要素だけを追加します。次を確認項目にします。

- Skills: 使うべき入力で呼ばれ、対象外の入力では不要に動かないか。引数なし・不正な入力を扱えるか。
- Subagents: 想定した作業を担当し、必要なツールで期待する結果を返せるか。
- Hooks: 対象イベントで動き、対象外では動かないか。失敗時の終了コードや出力が適切か。
- MCP / LSP: 接続・起動できるか。認証情報や必要な実行ファイルがない場合の対処を説明できるか。

配布後は配置先が変わるため、HookやMCPから同梱ファイルを参照するときは`${CLAUDE_PLUGIN_ROOT}`などの公式のパス指定方法を使います。開発マシンの絶対パスやPlugin外のファイルに依存させないようにします。参照: [Plugins reference](https://code.claude.com/docs/en/plugins-reference)。

継続的な評価が必要なら、[Plugin evals](https://code.claude.com/docs/en/plugin-evals)の利用条件とケース作成手順を確認します。通常の動作確認に加え、代表的な依頼に対する成功率や変更前後の差を評価します。

### 5. 配布経路を検証する

共有する場合は、[Marketplace作成ガイド](https://code.claude.com/docs/en/plugin-marketplaces)に沿ってカタログを作ります。Plugin自身のManifestと、配布用のカタログは別のファイルです。

ローカルで試す例として、上の`my-plugin/`の親ディレクトリで次を実行します。

```sh
mkdir -p .claude-plugin
```

その親ディレクトリに`.claude-plugin/marketplace.json`を作成します。

```json
{
  "name": "my-plugin-marketplace",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./my-plugin"
    }
  ]
}
```

`Your Name`は管理者名に置き換えます。同じディレクトリのシェルでカタログを検証します。

```sh
claude plugin validate .
claude
```

このセッションは`--plugin-dir`を付けずに起動します。対話画面でMarketplaceを追加し、インストールします。以下の操作はローカルのClaude Code設定に登録内容を保存します。

```text
/plugin marketplace add .
/plugin install my-plugin@my-plugin-marketplace
/reload-plugins
/my-plugin:hello 太郎
```

配布経路から導入した状態でも動くことを確認したら、公開先を決めてカタログとPluginを配置し、利用者向けの導入方法を記載します。明示的な`version`を使うこの例では、リリース時に値を更新します。参照: [Marketplace作成・配布](https://code.claude.com/docs/en/plugin-marketplaces)、[利用者向け導入手順](https://code.claude.com/docs/en/discover-plugins)。

## 理想的な完成状態

このガイドでは、他の人が導入・利用・保守できる状態を完成の目安とします。以下は公式の必須要件ではなく、このリポジトリが推奨するチェックリストです。

- [ ] 目的、対象ユーザー、利用例、対象外の作業が説明されている。
- [ ] 必要な構成要素が適切に配置され、Manifestの名前・説明・バージョンが整っている。
- [ ] 構文検証が通り、代表的な入力・境界条件・失敗時の動作を確認している。
- [ ] READMEに前提条件、導入コマンド、使い方、期待する出力、トラブル時の対処がある。
- [ ] 必要な外部コマンド・認証設定を説明し、認証情報や個人環境のパスを同梱していない。
- [ ] 配布する場合、Marketplace経由で導入したPluginでも動作を確認している。
- [ ] 更新方針、変更履歴、利用・配布条件が分かる。

まずは一つのSkillで作成から検証までを通し、その後、目的に応じて機能と配布手順を追加してください。
