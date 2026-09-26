# CreativeWorkspace V0.1

CreativeWorkspaceは、小説・脚本・映像作品・ゲーム企画・世界観設定などを、作品ごとに分けて管理する個人向けのローカルWebアプリです。文章は自分で直接編集し、データは自分のPC内に保存します。

## 主な機能

- 作品一覧と作品ごとの独立管理
- シーン作成、本文編集、Undo / Redo、検索・置換
- 人物や世界観などの設定資料と状態管理
- テンプレートの作成、複製、名前変更、削除
- 保存時の変更履歴と、現在の状態を保全してから行う復元
- 作品別のローカルバックアップ、作品の完全複製
- Markdown / JSON形式での書き出し
- 外部通信しないAI相談用スペース（将来拡張用）

## 対応環境

- Windows 10 / 11
- Node.js 18以降
- Chrome、Edge、Firefoxなどの現在のWebブラウザー

追加のnpmパッケージ、クラウドデータベース、外部アカウントは必要ありません。

## ダウンロードと起動

1. GitHubのReleases画面から `CreativeWorkspace-v0.1.zip` をダウンロードします。
2. ZIPを任意の場所へ展開します。
3. 展開したフォルダ内の `start.bat` をダブルクリックします。
4. ブラウザーで `http://127.0.0.1:4318` が開きます。
5. 終了するときは、同時に開いた黒い画面で `Ctrl+C` を押します。

Node.jsが見つからない場合は、Node.js公式サイトからLTS版をインストールしてください。CreativeWorkspace自身がソフトウェアを自動インストールすることはありません。

## Windows Smart App Controlについて

CreativeWorkspace V0.1は、PC内で動作するローカル実行型の試作版です。Windows 11でSmart App Controlが有効な場合、未署名の `start.bat` がブロックされることがあります。この警告は、必ずしもアプリが危険であることを意味するものではありません。

ただし、CreativeWorkspaceを起動するためにSmart App Controlを無効化することは推奨しません。V0.1では配布形式上、この制限が残ります。今後のV0.2では、Windows上でより扱いやすい起動方式を検討しています。不安がある場合は利用を中止し、このREADMEと [SECURITY.md](SECURITY.md) を確認してください。

## データの保存場所

作品、テンプレート、履歴、バックアップは、アプリのフォルダとは別の `CreativeWorkspaceData` フォルダに保存されます。標準では、展開したアプリフォルダと同じ階層に作成されます。

```text
任意のフォルダ/
├─ CreativeWorkspace_Public_v0.1/  ← アプリ本体
└─ CreativeWorkspaceData/          ← あなたの作品データ
```

作品データはクラウドへ自動同期されません。通常使用時にインターネット接続は不要で、本文・設定・利用状況を外部へ送信しません。テレメトリやアクセス解析もありません。

## バックアップ

アプリ内の「設定」から、作品単位の日時付きバックアップを作成できます。ただし、同じPC内のバックアップはPC故障には対応できません。必要に応じて、アプリを終了してから `CreativeWorkspaceData` 全体を自分で別の保存媒体へコピーしてください。

## 削除時の注意

アプリ本体を削除しても、別に保存された `CreativeWorkspaceData` は自動削除されません。作品も削除したい場合だけ、内容を確認したうえでデータフォルダを自分で削除してください。データフォルダを削除すると作品・履歴・バックアップを失います。

## V0.1について

これは最初の試作版です。動作やデータ形式が変更される可能性があり、継続更新は保証されません。不具合や停電、ストレージ障害に備え、大切な作品はMarkdown / JSONで書き出し、別途バックアップしてください。同じ作品を複数タブから同時編集すると、後から保存した内容で上書きされる場合があります。

## プライバシー設計

- サーバーは `127.0.0.1` のみに接続します。
- ポート開放や外部公開を行いません。
- 外部API、広告、解析、クラッシュレポートを使用しません。
- AI相談欄はV0.1では外部AIに接続しません。
- ログへ作品本文を記録しません。

## 開発者・配布者向け

公開前に `node scripts/self-test.js` と `node scripts/public-release-check.js` を実行してください。詳細は [DISTRIBUTION_CHECKLIST.md](DISTRIBUTION_CHECKLIST.md) にあります。ソースコードの利用条件は [LICENSE](LICENSE) を参照してください。

## Official project

このRepositoryは、作者 `fumiehomura` が管理するCreativeWorkspaceの公式Repositoryです。公式Releaseと公式配布物は、このRepositoryから提供されます。

第三者によるForkや派生版は、作者が明示的に承認した場合を除き、CreativeWorkspaceの公式版ではありません。名称、ロゴ、公式アイコンなどの扱いについては [BRAND_POLICY.md](BRAND_POLICY.md) を参照してください。

不具合や改善案はIssue、コードの改善提案はPull Requestで受け付ける予定です。提案を歓迎しますが、Pull Requestを公式版へ採用するかどうかは、Repository管理者がプロジェクトの方針、安全性、保守性を踏まえて判断します。貢献方法の詳細は [CONTRIBUTING.md](CONTRIBUTING.md)、セキュリティ問題の報告方針は [SECURITY.md](SECURITY.md) を参照してください。

## ライセンス

ソースコードは [MIT License](LICENSE) で公開されます。CreativeWorkspaceの名称、ロゴ、公式アイコンなどのブランド要素には、MIT Licenseとは別に [ブランドポリシー](BRAND_POLICY.md) が適用されます。
