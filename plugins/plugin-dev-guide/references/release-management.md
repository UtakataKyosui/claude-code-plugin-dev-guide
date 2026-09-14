# GitHub Actionsによるバージョン・リリース管理

このリポジトリでは、PluginのManifestに書かれたバージョンを正本とし、対応するGitタグをPushするとGitHub ActionsがGitHub Releaseを作成します。対象は`plugins/plugin-dev-guide/`です。

確認日: 2026-09-15。GitHub Actionsのworkflowは`.github/workflows/`に置き、`push`イベントはブランチ・タグで絞り込めます。出典: [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)。

## このリポジトリの運用

| 対象 | 役割 |
| --- | --- |
| `plugins/plugin-dev-guide/.claude-plugin/plugin.json` | Pluginの正規バージョン。`version`はSemVer形式にする。 |
| `plugin-dev-guide--vX.Y.Z` | このPluginのリリースタグ。Manifestの`version`と完全一致させる。 |
| `.github/workflows/ci.yml` | PRのOpen時と更新時（`opened`・`synchronize`）に構成・同期・公式スキーマを検証する。 |
| `.github/workflows/release.yml` | 上記タグのPushで検証後にGitHub Releaseを作成する。 |
| `scripts/check-release-tag.mjs` | タグとManifest版の不一致を失敗にする。 |
| `scripts/check-version-change.mjs` | Plugin本体を変更したPRでManifest版が上がっているか確認する。 |
| `scripts/check-release-version.mjs` | Releaseタグの直前コミットでManifest版が上がっているか確認する。 |

たとえばManifestが`"version": "0.2.0"`なら、リリースタグは`plugin-dev-guide--v0.2.0`です。先頭の`v`、Plugin名、区切りの`--`も含めて一致が必要です。`0.2.0-beta.1`ならタグは`plugin-dev-guide--v0.2.0-beta.1`となり、Releaseはpre-releaseとして作成されます。

Plugin MarketplaceはManifestの`version`により更新を認識します。そのため、内容を変更して利用者へ配布するリリースでは、必ずバージョンを上げます。

## リリース手順

1. Pluginの変更と`plugin.json`の`version`を同じ変更として更新する。
2. 同梱資料を同期し、ローカル検証を実行する。

   ```sh
   node scripts/sync-plugin-docs.mjs
   node scripts/sync-plugin-docs.mjs --check
   node scripts/check-plugin.mjs
   claude plugin validate .
   claude plugin validate ./plugins/plugin-dev-guide
   ```

3. `main`へ変更を反映し、GitHub Actionsの`Plugin CI`が成功したことを確認する。
4. リリース対象のコミットでタグを作成する。Claude Codeのバージョンが対応している場合は、ManifestとMarketplaceの整合も確認する次のコマンドを使える。

   ```sh
   claude plugin tag ./plugins/plugin-dev-guide
   ```

   あるいは、タグ名を明示して作成する。

   ```sh
   git tag -a plugin-dev-guide--v0.2.0 -m "Release plugin-dev-guide 0.2.0"
   git push origin plugin-dev-guide--v0.2.0
   ```

   タグは対象コミットを確認してからPushする。誤ったタグを削除して作り直す運用は、利用者が取得した版と履歴の対応を壊しやすいため避ける。

5. `Release Plugin Dev Guide`が成功すると、タグ名・バージョンをタイトルにしてGitHub Releaseが作成される。`--generate-notes`を使うため、リリースノートはGitHubが対象範囲の変更から生成する。作成後に内容を確認し、必要ならGitHub上で追記する。

PRでPlugin配下のファイルを変更した場合、`Plugin CI`はベースブランチの`plugin.json`と比較して`version`が変わっていることを確認します。READMEやCIだけの変更では版上げを要求しません。Release CIではさらに、Pushされたタグの直前コミットとタグ対象コミットのManifest版が異なることを確認します。版を変更していないコミットに手動でタグを付けてもReleaseは作成されません。

## CIが検証すること

通常CIはPRのOpen時と更新時（`opened`・`synchronize`）に、配布用`references/`と`docs/`の同期、Marketplace・Manifest・Skill参照の整合、Claude CodeによるMarketplaceとPluginのスキーマ検証を行います。Plugin本体の変更を含む場合はベースとの差分で`plugin.json`の`version`更新を確認します。ドキュメントだけの変更では版上げを要求しません。

リリースCIは上記に加えて、タグがManifestの`name`と`version`から得られる名前と一致するか検証します。一致しない場合、GitHub Releaseを作成しません。これはタグのPush後に実行されるため、不一致タグ自体のPushを止めるものではありません。

CIはモデルを用いるPlugin evalや対話型の受け入れテストを実行しません。これらは使用量・認証・実行環境を必要とするため、[テスト手順](../tests/plugin-guide.md)に従って別途実施します。

## GitHubの設定と失敗時の確認

Release workflowは`contents: write`を要求し、組み込みの`GITHUB_TOKEN`を`gh release create`へ渡します。リポジトリまたはOrganizationのActions設定でWorkflowの書き込み権限が禁止されている場合、リリース作成は失敗します。必要ならRepository SettingsのActions設定で`GITHUB_TOKEN`の権限ポリシーを管理者に確認してください。

`gh release create`が「release already exists」で失敗した場合、同じタグのReleaseは既に存在します。Releaseを作り直すためにタグを動かさず、既存Releaseの編集または運用判断を行います。CIが依存パッケージの取得で失敗した場合は、GitHub Actionsのログでnpm Registryへの到達とClaude Codeパッケージの提供状況を確認します。

## 他のPluginへ適用する例

複数PluginのMarketplaceでは、PluginごとにManifest、タグ接頭辞、Release workflowまたはmatrixを用意します。次の例は一つのPlugin用です。

```yaml
on:
  push:
    tags:
      - 'my-plugin--v*'

permissions:
  contents: write

steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with:
      node-version: 22
  - run: node scripts/check-release-tag.mjs "${{ github.ref_name }}"
  - run: npm install --global @anthropic-ai/claude-code
  - run: claude plugin validate ./plugins/my-plugin
  - env:
      GH_TOKEN: ${{ github.token }}
    run: gh release create "${{ github.ref_name }}" --verify-tag --generate-notes
```

例を流用する際は、タグ名の検証対象、Manifestのパス、Releaseタイトルを対象Pluginに合わせます。外部Actionを使う場合は、メジャータグだけでなくコミットSHAによる固定も検討し、必要な権限だけを与えます。
