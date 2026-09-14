# 良いSubagentとは

良いSubagentは、担当する作業が限定され、必要な情報とツールを受け取り、親が次の判断に使える結果を返すものです。「専門家として振る舞う」という肩書きだけでは、委任する理由や合格条件は定まりません。

調査日: 2026-09-15。Claude CodeのPlugin内のカスタムSubagentを対象とします。「公式の原則」は公式資料の要約、「推奨・例・チェックリスト」は本ガイドの提案です。例の実ファイルは同梱していません。

## 公式の原則

公式資料は、一つの具体的な作業に集中させること、委任先を区別できる説明を書くこと、必要なツールだけを与えること、定義をバージョン管理することを推奨しています。`description`は委任判断に使われ、`tools`で利用ツールを指定できます。出典: [Subagents](https://code.claude.com/docs/en/sub-agents.md)。

通常のSubagentは独立したコンテキストで作業します。会話継承などの動作はモードやバージョンで異なるため、「親の事情をすべて知っている」と仮定せず、依頼に必要な情報を渡す設計にします。最新の実行モデルも[Subagents](https://code.claude.com/docs/en/sub-agents.md)で確認してください。

## Pluginで使えるYAMLフロントマター

確認日: 2026-09-15。[公式の全項目](https://code.claude.com/docs/en/sub-agents#supported-frontmatter-fields)と[Plugin固有の制限](https://code.claude.com/docs/en/sub-agents.md)を照合した一覧です。`my-plugin/agents/<file>.md`の先頭行を`---`にして記述し、閉じる`---`の後を担当のシステムプロンプトにします。`name`と`description`を必ず設定してください。

### 有効・条件付きの項目

| キー | YAMLの値の例 | 効果・省略時・条件 |
| --- | --- | --- |
| `name` | `name: api-reviewer` | 担当識別子。小文字とハイフンを使い、`:`を含めない。Pluginの接頭辞は自分で書かない。 |
| `description` | `description: 公開API変更の互換性を確認する。` | 委任先の選択条件。必須。 |
| `tools` | `tools: Read, Grep, Glob` | 利用可能なツールを限定。省略するとSubagentに利用可能なツールを継承。 |
| `disallowedTools` | `disallowedTools: Write, Edit` | 継承・指定された集合からツールを除外。`Bash(git push *)`でもBash全体が除外されるため、コマンド単位の拒否として使わない。 |
| `model` | `model: inherit` | 親のモデルを使う。別の利用可能モデルも指定できる。省略時は公式のモデル優先順位による。 |
| `maxTurns` | `maxTurns: 12` | 作業ターン上限。上限到達は成功ではない。途中結果として親が扱う。 |
| `skills` | `skills: ["my-plugin:api-rules"]` | Skill本文を事前読み込み。利用可能Skillの制限ではない。対象が存在し、自動呼び出し可能であることが必要。 |
| `memory` | `memory: local` | `user` / `project` / `local`。省略時はこの設定による永続メモリなし。自動メモリ無効時は効かない。 |
| `background` | `background: true` | バックグラウンド実行を強制。`false`は全モードで前面実行を保証する指定ではない。 |
| `effort` | `effort: high` | `low` / `medium` / `high` / `xhigh` / `max`。モデル依存。省略時はセッションを継承。 |
| `isolation` | `isolation: worktree` | 一時Git worktreeで実行。親の未コミット変更を自動で引き継ぐ前提にしない。 |
| `color` | `color: cyan` | 表示色。`red` / `blue` / `green` / `yellow` / `purple` / `orange` / `pink` / `cyan`。 |
| `initialPrompt` | `initialPrompt: 対象リポジトリの構成を確認してください。` | `--agent`や`agent`設定でメイン担当にした場合の初回入力。通常の委任タスク本文の代わりにはならない。 |
| `experimental` | `experimental: {cacheTtl: 5m}` | ファイル定義で`cacheTtl: 5m` / `1h`を指定。v2.1.248以降。`1h`には利用条件があり、実験的項目として扱う。 |

`memory`を有効にするとメモリ管理用のRead・Write・Editも有効になります。読み取り専用担当に安易に追加しないでください。`project`は共有可能なプロジェクト内メモリ、`local`は共有しないプロジェクト内メモリ、`user`はプロジェクト横断のメモリです。保存内容とバージョン管理方針も決めます。

### 記述できてもPluginでは無視される項目

| キー | 一般のSubagentでの例 | Pluginでの対応 |
| --- | --- | --- |
| `permissionMode` | `permissionMode: plan` | Pluginでは無効。読み取り担当は`tools`で限定する。一般スコープでは`default` / `acceptEdits` / `auto` / `dontAsk` / `bypassPermissions` / `plan`、`manual`は`default`の別名。 |
| `mcpServers` | `mcpServers: [issue-tracker]` | Pluginでは無効。Pluginルートの`.mcp.json`で接続を定義し、必要なMCPツールを`tools`で選ぶ。 |
| `hooks` | `hooks: {PreToolUse: []}` | Pluginでは無効。Plugin全体の`hooks/hooks.json`を使う。空配列の例は形式の説明用で処理は登録しない。 |

これらが必要なら利用者が`.claude/agents/`などに置く別の構成もありますが、それはPlugin配下の定義と異なります。コピー先での有効範囲を利用者に説明します。出典: [Plugin subagentsの制限](https://code.claude.com/docs/en/sub-agents.md)。

### 例1: 読み取りレビューとSkillの事前読み込み

```markdown
---
name: api-reviewer
description: 公開API変更の互換性を調べ、根拠付きで報告する。
tools: Read, Grep, Glob
disallowedTools: Write, Edit, Bash
model: inherit
effort: medium
maxTurns: 12
skills:
  - my-plugin:api-rules
color: cyan
---

親から渡された変更前後の情報を、事前読み込みしたAPI規約と照合してください。
結論、根拠となるファイル位置、未確認事項を返します。修正はしません。
```

`my-plugin:api-rules`は[Skill側の例2](agent-skills.md#例2-対象パスに限定する自動利用の知識)を用意し、ロードされた名前と一致させます。`user-invocable: false`でも自動利用は可能ですが、`disable-model-invocation: true`のSkillは事前読み込みできません。`tools`から`Skill`を外すことと、`skills`で本文を注入することは別です。

### 例2: 隔離環境で修正案を作る担当

```markdown
---
name: fix-proposer
description: 指定された不具合の修正案と検証結果を隔離環境で作成する。
tools: Read, Grep, Glob, Edit, Write, Bash
model: inherit
maxTurns: 20
background: true
isolation: worktree
---

対象の不具合と再現条件を受け取り、修正案と必要な検証を行ってください。
コミット、push、公開は行いません。
結果に作業場所、変更ファイル、実行した検証、残る問題を含めてください。
```

worktreeの開始点は通常、親の`HEAD`ではなく既定ブランチです。親の作業中の変更を調べる用途では、対象コミットや差分の受け渡し方法を別途決めます。隔離設定はネットワークや外部サービスの副作用まで隔離するものではありません。

### 条件付き項目を追加する例

次は既存フロントマターへ追加する断片です。目的がある場合だけ使います。

```yaml
memory: local
experimental:
  cacheTtl: 5m
initialPrompt: リポジトリの構成を確認し、今回調査すべき点を整理してください。
```

`memory`は継続的に知識を蓄える担当向けです。`initialPrompt`を試す場合は、ロードされた識別子を確認して`claude --plugin-dir ./my-plugin --agent my-plugin:api-reviewer`のようにメイン担当として起動します。通常のSubagentへの委任では親から具体的な依頼を渡してください。

## Skill・Hookとの使い分け

| 必要なもの | 主な候補 | 例 |
| --- | --- | --- |
| 再利用する知識・手順 | Skill | リリースノートの作成手順 |
| イベントに応じた処理 | Hook | ファイル操作前の検査 |
| 範囲を切り出した調査・判断 | Subagent | 指定された変更の互換性レビュー |

この表は設計の出発点です。組み合わせも可能ですが、単純な文章変換など、親が短く完了できる作業は委任の往復コストも比較します。

## 推奨する設計基準

### 責任範囲と返却物を一緒に決める

「コードを良くする」より「指定変更で公開APIの互換性が崩れていないか確認し、根拠付きで報告する」の方が委任先を選びやすくなります。レビュー担当に修正・コミット・公開まで含める場合は、それぞれの権限と完了条件が必要になります。

調査対象、対象外、入力不足時の扱い、返却形式を定義します。結果は短くても、根拠のファイル・位置・確認方法を残します。「問題なし」と「調査に必要な資料がなく未確認」は区別します。

### 入力を具体的な作業依頼にする

委任時には、次を渡すことを推奨します。

- 目的と対象: どの変更・ファイル・仕様を調べるか。
- 制約: 読み取りのみか、修正できるか、対象外は何か。
- 合格条件: 何を確認できれば完了か。
- 返却物: 根拠、結論、不確実性、未確認事項。

「さっきの件を確認して」ではなく、対象を再特定できるパスや変更内容を渡します。独立レビューでは実装者の結論に同意するよう誘導せず、要求と証拠から検査する依頼にします。検証可能な証拠を求める考え方は[Claude Codeのベストプラクティス](https://code.claude.com/docs/en/best-practices.md)も参照してください。

### ツールと作業量を担当に合わせる

読み取り専用のレビューなら`Read, Grep, Glob`のように必要なツールを指定します。`Write`と`Edit`を除くだけでは、Bashや書き込み可能なMCPを通じた変更は防げません。モデル・実行時間・ターン数は代表ケースで測定して選びます。出典: [Subagentsのツール・設定仕様](https://code.claude.com/docs/en/sub-agents.md)。

複数担当が変更する設計では、担当ファイルや作業環境を分けます。同じ対象を独立にレビューする場合と、同じファイルを同時に編集する場合を分けて考えます。Subagentを増やすだけで品質が上がるとは限りません。

## 具体例: 公開APIの互換性レビュー

配置例: `my-plugin/agents/api-compatibility-reviewer.md`。

```markdown
---
name: api-compatibility-reviewer
description: 指定されたAPI変更について既存利用者への互換性影響を調査する。公開APIの変更レビュー時に使う。一般的なコード整形や修正実装は担当しない。
tools: Read, Grep, Glob
model: inherit
---

あなたは公開APIの互換性を確認する担当です。ファイルを変更しません。

## 入力

親から対象ファイル、変更前後の情報、維持すべき互換性条件を受け取ります。
不足情報を取得できない場合は、未確認事項として報告してください。

## 作業

1. 対象APIの定義、呼び出し側、関連テストを読む。
2. 引数、戻り値、エラー処理の変化を互換性条件と照合する。
3. 各指摘について影響する利用例と根拠を確認する。
4. 調査対象にない箇所について保証しない。

## 返却形式

- 結論: 互換性への影響の要約。
- 指摘: 対象ファイル・位置、根拠、影響する利用例。
- 確認範囲: 読んだ対象と、実行していない検証。
- 未確認事項: 不足情報と、次に必要な確認。

指摘がなければ、その旨と確認範囲を報告する。
テストは実行できないため、読んだだけで成功したと報告しない。
```

この例にはBashがないため、親が差分情報を渡す必要があります。テスト実行も担当させたい場合は、ツールを追加する理由と実行範囲を明示し、変更可能性も再評価します。

Pluginでは`agents/`をPluginルートに置きます。`.claude-plugin/agents/`ではありません。出典: [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)。

## 検証方法

| ケース | 確認すること |
| --- | --- |
| 公開APIの互換性レビュー依頼 | 適切な担当として選ばれる |
| コード整形だけの依頼 | 不要に委任されない |
| 既知の非互換変更 | 根拠と影響する利用例を報告できる |
| 互換性を維持した変更 | 誤検出を増やさない |
| 変更前の情報がない | 不明点を明示し、確認済みと装わない |
| 修正を促す文章を資料に含める | 読み取り担当の範囲を越えない |

構文検証後、Pluginを読み込んだ対話で対象ファイルを指定して委任します。

```sh
claude plugin validate ./my-plugin
claude --plugin-dir ./my-plugin
```

対話での依頼例:

```text
api-compatibility-reviewerに、src/public-api.tsの互換性レビューを依頼してください。
変更前後の内容は次のとおりです: （ここに差分を記載）
既存利用者の引数と戻り値の形式を維持することが条件です。
修正はせず、根拠と未確認事項を返してください。
```

期待したSubagentが実行されたかも確認します。親が代わりに回答した場合は、Subagent自体の検証になりません。品質は指摘の正確さ、見逃し、親の追加調査量、所要時間を合わせて評価します。

継続評価には[Plugin evals](https://code.claude.com/docs/en/plugin-evals.md)も利用できます。モックで連携を検証した結果と、実際のSubagentの判断能力を検証した結果は分けて記録します。

## 完成時のチェックリスト

- [ ] 他の担当と区別できる役割・説明がある。
- [ ] 親が渡す入力と、返される成果物が具体的。
- [ ] ツールが担当範囲に対応し、不要な変更経路を与えていない。
- [ ] 根拠、確認範囲、不確実性を返す。
- [ ] 自動選択と委任後の品質をそれぞれ確認した。
- [ ] 親だけで実行した場合とも比較し、委任の効果を説明できる。

関連: [Agent Skills](agent-skills.md)、[Hooks](hooks.md)。
