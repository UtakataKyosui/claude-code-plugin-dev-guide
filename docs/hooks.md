# 良いHookとは

良いHookは、必要なイベントでだけ動き、短時間で明確な結果を返し、失敗した場合の挙動まで説明できるものです。「実行される」ことに加えて、誤って作業を止めないこと、止めるべき処理を取り逃がさないことを確認します。

調査日: 2026-09-15。Claude CodeのPlugin内のHookを対象とします。「仕様」は公式資料に基づき、「推奨・例・チェックリスト」は本ガイドの提案です。例の実ファイルは同梱していません。

## 仕様として押さえること

Hookはライフサイクルのイベントに接続します。固定ルールを処理するcommand型のほか、モデルに判断させるprompt型・agent型などがあります。イベントで起動する仕組みと、判断結果の再現性は別です。出典: [Hooks guide](https://code.claude.com/docs/en/hooks-guide.md)。

| イベント | 設計上の用途 | 注意点 |
| --- | --- | --- |
| `PreToolUse` | 実行前に対象操作を検査する | 拒否が必要なら、このイベントの決定形式を使う |
| `PostToolUse` | 実行結果の検査や整形 | 終了した操作を取り消すことはできない |
| `Stop` | 終了前の確認 | 継続を要求し続けないようにする |

command型は標準入力でJSONを受け取ります。`PreToolUse`の終了コード2はツール実行をブロックしますが、終了コード1だけでは通常ブロックしません。起動失敗やタイムアウトも、必ずブロックするとは限りません。イベントごとの仕様を確認してください。出典: [Hooks reference](https://code.claude.com/docs/en/hooks.md)。

## Pluginでの設定場所とYAMLの有効範囲

Hook自体は`SKILL.md`のようなMarkdownファイルではありません。PluginのHookは通常`hooks/hooks.json`にJSONで定義し、Skillから登録するときにYAMLフロントマターの`hooks`を使います。

| 設定場所 | Pluginで有効か | 登録期間 |
| --- | --- | --- |
| `my-plugin/hooks/hooks.json` | 有効、JSON形式 | Pluginが有効な間 |
| `my-plugin/skills/<name>/SKILL.md`の`hooks` | 有効、YAML形式 | Skill呼び出し後、セッションの残り |
| `my-plugin/agents/<name>.md`の`hooks` | **無視される** | 登録されない |
| `.claude/agents/<name>.md`の`hooks` | Plugin外の別構成 | そのSubagentの実行中 |

一般のSubagentの例をPluginへコピーしても、`hooks`は有効になりません。出典: [Hooks in skills and agents](https://code.claude.com/docs/en/hooks#hooks-in-skills-and-agents)、[Plugin subagentsの制限](https://code.claude.com/docs/en/sub-agents.md)。

### SkillのフロントマターにHookを置く例

`my-plugin/skills/checked-review/SKILL.md`に置きます。

```markdown
---
name: checked-review
description: 同梱のパス検査を登録して指定ファイルをレビューする。
disable-model-invocation: true
hooks:
  PreToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: node
          args: ["${CLAUDE_PLUGIN_ROOT}/scripts/check-protected-path.mjs"]
          timeout: 5
---

指定されたファイルをレビューし、指摘を返してください。
保護対象の検査Hookは、このSkillの応答後もセッションに残ります。
```

`/my-plugin:checked-review`を呼び出して初めて登録されます。後述の検査スクリプトを実装し、Node.jsを用意する必要があります。Skillを実行する前から検査したい場合は`hooks/hooks.json`に置いてください。

### YAMLの階層と追加オプション

| 設定 | 記述位置・例 | 意味 |
| --- | --- | --- |
| イベント | `hooks`直下の`PreToolUse:` | 発火するタイミング。イベントごとに使える決定方法が異なる。 |
| `matcher` | イベント配列内の`matcher: "Write\|Edit"` | 対象ツールなどを絞る。何と照合するかはイベント依存。 |
| `hooks` | matcherと同じ階層の配列 | 実行するハンドラー。外側の`hooks`と混同しない。 |
| `type` | ハンドラー内の`type: command` | 処理の種類。例ではシェルコマンド。 |
| `command` | ハンドラー内の文字列 | 実行するコマンド。同梱スクリプトにはPluginのパス変数を使う。 |
| `timeout` | ハンドラー内の`timeout: 5` | 秒単位の上限。超過時の決定はイベント・方式に依存。 |
| `once` | ハンドラー内の`once: true` | SkillのHookを最初の成功後に解除する。継続的な保護には使わない。 |

一度だけのチェックにする場合は、上の`timeout`と同じ階層に次を追加します。

```yaml
once: true
```

これはSkillの呼び出し回数制限ではありません。Skillの`hooks`にはイベント別のHook構造を渡し、`settings`などの追加の階層で包みません。JSONで記述する場合も対応するオブジェクト・配列の形は同じです。ハンドラーには種類ごとの追加フィールドがあるため、HTTP・MCP・prompt・agent型を使う際は[Hook handler fields](https://code.claude.com/docs/en/hooks#hook-handler-fields)を確認してください。この表はフロントマターへの組み込み方とcommand型の例を対象にしています。

### ハンドラーの全設定項目

上の表と合わせて、確認日時点の公式ハンドラーフィールドを一覧化します。以下の例はハンドラー内の設定です。種類が異なるフィールドを一つのハンドラーに混在させないでください。

| 対象の型 | キーと値の例 | 条件・用途 |
| --- | --- | --- |
| 全型 | `type: command` | 必須。`command` / `http` / `mcp_tool` / `prompt` / `agent`。 |
| 全型 | `if: "Edit(*.ts)"` | ツールイベントで引数まで絞る条件。非ツールイベントに指定すると実行されない。 |
| 全型 | `timeout: 5` | 秒単位。既定値は型・イベントによる。非同期commandには適用されない。 |
| 全型 | `statusMessage: 変更内容を確認中` | 実行中の表示文言。 |
| 全型 | `once: true` | Skillフロントマターのみ有効。成功後に解除。拒否・失敗・時間超過では解除されない。 |
| command | `command: node` | 必須。`args`ありでは実行ファイルのみ、なしではシェルコマンド。 |
| command | `args: ["${CLAUDE_PLUGIN_ROOT}/scripts/check.mjs"]` | シェルを介さず引数配列で実行。パス変数を含む場合に推奨。 |
| command | `async: true` | 結果を待たない。実行前の拒否判定には使わない。 |
| command | `asyncRewake: true` | バックグラウンドで実行し、終了コード2でClaudeを起こす。 |
| command | `shell: powershell` | `bash` / `powershell`。`args`ありでは無視される。Skill本文の`shell`とは別。 |
| http | `url: "http://localhost:8080/check"` | 必須。イベント入力の送信先。 |
| http | `headers: {Authorization: "Bearer $HOOK_TOKEN"}` | 追加ヘッダー。秘密値そのものは書かない。 |
| http | `allowedEnvVars: [HOOK_TOKEN]` | ヘッダーで展開する環境変数。未指定の変数は空になる。 |
| mcp_tool | `server: "plugin:my-plugin:scanner"` | 必須。接続済みサーバー。Pluginのサーバーはスコープ付き識別子。 |
| mcp_tool | `tool: scan` | 必須。呼び出すツール名。 |
| mcp_tool | `input: {file: "${tool_input.file_path}"}` | 入力JSONから値を渡す引数。 |
| prompt / agent | `prompt: "入力を確認してください: $ARGUMENTS"` | 必須。ここでの`$ARGUMENTS`はHookのイベントJSON。Skillの利用者引数とは別。 |
| prompt / agent | `model: sonnet` | 評価に使うモデル。省略時は高速なモデル。agent型は実験的。 |

### 別の型へ置き換える例

前の完全例の内側の`hooks`配列に置く、HTTPハンドラーの例です。サービスを別途起動し、応答はHookのJSON仕様に合わせます。

```yaml
- type: http
  url: http://localhost:8080/check
  headers:
    Authorization: "Bearer $HOOK_TOKEN"
  allowedEnvVars: [HOOK_TOKEN]
  timeout: 5
  statusMessage: 検査サービスに問い合わせ中
```

以下は`PostToolUse`用のMCPハンドラーの例です。Pluginの`.mcp.json`に`scanner`を構成し、接続済みである必要があります。

```yaml
- type: mcp_tool
  server: plugin:my-plugin:scanner
  tool: scan
  input:
    file: "${tool_input.file_path}"
```

モデルの判断が必要なら、たとえば`Stop`イベントのハンドラーとして次を使います。イベントによって対応する型が異なるため、用途ごとに公式のイベント仕様を確認してください。

```yaml
- type: prompt
  prompt: >-
    入力JSONを確認してください: $ARGUMENTS
    stop_hook_activeがtrueなら終了を許可してください。
    そうでなければ、最終報告で検証済みと未確認を区別しているか判定してください。
    許可は {"ok": true}、不足時は {"ok": false, "reason": "不足内容"} を返してください。
  timeout: 30
```

ファイルの確認まで必要な場合は`type: agent`を検討します。HTTP・MCPの接続失敗は拒否と同義ではなく、モデル判定も固定ルールの代替にはなりません。

### PluginのSubagentにも検査を適用する場合

`agents/<name>.md`に`hooks`を追加する代わりに、後述の`hooks/hooks.json`へ登録します。Plugin全体のツールHookはSubagent内のツールにも適用されるため、特定担当だけを対象にするなら、スクリプトで入力の`agent_type`などを確認します。`PreToolUse.matcher`にSubagent名を書く方法ではありません。

実際の入力ログで識別子を確認し、親セッションや別担当には適用しないテストも用意します。出典: [Hookの設定場所と入力](https://code.claude.com/docs/en/hooks.md)。

## 推奨する設計基準

### 対象と副作用を小さくする

イベントと`matcher`で対象を絞り、スクリプト内でも入力を検査します。「すべてのツール実行後に全テストを走らせる」より、変更したファイルに必要な検査を行う設計が扱いやすくなります。

整形Hookなら同じ入力を繰り返し処理しても結果が安定するようにします。複数Hookの実行順に依存せず、共有ファイルへの同時書き込みも考慮します。非同期処理は、その結果を待たずに進んでもよい用途に限ります。

### 入力・出力・失敗時の契約を書く

JSONはJSONパーサーで解析し、必須フィールドと型を確認します。ユーザー由来の文字列を`eval`やシェルコマンドに直接埋め込まず、パスに空白があっても安全に引数として渡します。

出力をJSONにする場合は、標準出力にログを混ぜません。拒否メッセージには対象、理由、次に可能な行動を記載します。入力不正、依存コマンドなし、検査失敗を同じ理由にまとめないようにします。

保護目的のHookでは、「検査プログラムが動かなかったらどうなるか」を必ず試します。Hookを唯一の権限制御にせず、必要な制限はClaude Codeの権限設定や実行環境でも担保します。出典: [Hooksのセキュリティと実行仕様](https://code.claude.com/docs/en/hooks.md)。

### 待ち時間と繰り返しを制御する

同期Hookには用途に合うタイムアウトを設定します。毎回ネットワークを呼ぶ設計では、外部障害が通常作業にどう影響するかを決めます。単純な判定をモデルに任せる前に、スクリプトで判定できるか検討します。

`Stop`では`stop_hook_active`を確認し、終了条件を満たせない場合の扱いを設計します。「すべて完璧になるまで終了禁止」のような、判定できない条件は避けます。出典: [Stopの仕様](https://code.claude.com/docs/en/hooks.md)。

## 具体例: Write / Edit前に保護対象を検査する

配置例: `my-plugin/hooks/hooks.json`。

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/check-protected-path.mjs\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

これは設定例です。別途、`scripts/check-protected-path.mjs`を実装し、Node.jsの前提条件を利用者に説明する必要があります。Pluginの配置規則と変数は[Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)を参照してください。

このスクリプトには次の契約を持たせます。

1. 標準入力をJSONとして解析し、イベント・ツール名・ファイルパスを検査する。
2. パスを正規化し、定義済みの保護範囲と比較する。シンボリックリンクの扱いも決める。
3. 対象外なら出力せず終了コード0を返す。
4. 保護対象なら理由を標準エラーに出して終了コード2を返す。
5. 入力を検査できなかった場合の扱いを明示する。この例では誤って許可しないため2を返す設計とする。

ただし、スクリプト自体の起動失敗まではこの契約で処理できません。また、`Write|Edit`だけではBashやMCPなど別経路の書き込みをカバーしません。この例を「全ファイル操作を保護する仕組み」として扱わないでください。

## 検証方法

| ケース | 確認すること |
| --- | --- |
| 通常の対象外ファイル | 不要に拒否しない |
| 保護対象ファイル | 実行前に拒否し、理由を返す |
| 空白、相対パス、シンボリックリンク | 保護条件と一致する判定になる |
| 不正JSON、パス欠落 | 定義した失敗時の契約に従う |
| Node.jsなし、スクリプトなし、時間超過 | Claude Code側の挙動を実測し、制約として記録する |
| 繰り返し実行・複数Hook | 副作用の重複や競合がない |

スクリプト単体では保存した入力JSONを標準入力に渡し、終了コード・標準出力・標準エラーを確認します。さらにPluginを読み込んだClaude Codeで対象イベントを起こし、実際に操作が拒否されたかを確認します。

```sh
node ./my-plugin/scripts/check-protected-path.mjs < ./fixtures/protected-write.json
claude plugin validate ./my-plugin
claude --debug --plugin-dir ./my-plugin
```

上のfixtureも自分で作成するテスト用ファイルです。構文検証だけでイベント発火や保護範囲を証明したことにはなりません。

## 完成時のチェックリスト

- [ ] イベント・対象・副作用・失敗時の挙動を説明できる。
- [ ] 入力解析とパス・引数の処理が安全。
- [ ] 拒否・通過の両方を、実際のClaude Codeで確認した。
- [ ] 起動失敗・タイムアウト・別ツール経由の限界を確認した。
- [ ] 実行時間を測り、繰り返しや競合を制御している。
- [ ] Pluginの配布後もパスと依存コマンドが解決できる。

関連: [Agent Skills](agent-skills.md)、[Subagents](sub-agents.md)、[Claude Codeのベストプラクティス](https://code.claude.com/docs/en/best-practices.md)。
