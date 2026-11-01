# 补齐个人内容与更新公开网站

网站地址：https://lexstark335-ctrl.github.io/index.html/nightshift/dist/

资料文件：https://github.com/lexstark335-ctrl/index.html/blob/main/nightshift/dist/content.json

## 使用网页编辑器

1. 打开网站，点击「编辑内容」。
2. 在个人资料、项目作品、文章动态三个标签中补充内容。
3. 点击「保存到此浏览器」预览。**这一步仅修改当前浏览器，其他访客还看不到。**
4. 点击「导出当前资料」，下载 `content.json`。
5. 用文本编辑器打开该文件并复制全部文字。
6. 登录自己的 GitHub，打开[资料编辑页](https://github.com/lexstark335-ctrl/index.html/edit/main/nightshift/dist/content.json)，用导出的全部文字替换文件内容。
7. 点击 GitHub 的 Commit changes 保存提交。现有 Pages 发布机制会自动发布 `main` 分支的新内容。
8. 在[发布记录](https://github.com/lexstark335-ctrl/index.html/actions)中确认对应提交部署成功，再刷新网页。首次发布或更新可能需要数分钟。

更新后，如果浏览器仍显示自己的旧草稿，可在编辑器中点击「恢复文件中的资料」再保存，或使用新浏览器查看公开版本。

如果更方便，也可以下次把真实资料或导出的 JSON 发给助手，让助手先阅读 `HANDOFF.md` 再替换和发布。

## 可以填写什么

- 个人资料：姓名、英文名、身份方向、首页标题、简介、关于我、坐标、交流状态、关键词、邮箱、GitHub 和其他链接。
- 项目作品：标题、分类、时间、简述、完整说明、标签、公开外链和三种原创封面。
- 文章动态：标题、日期、正文、可选外链。没有文章时栏目自动隐藏。

只填写准备公开的信息。当前示例不是个人真实经历，填写时可逐项替换或删除。

## 本地文件写回

若希望直接保存到项目文件，下载项目，在项目目录运行 `npm start`，再通过本地网页编辑。使用该服务时「保存并更新主页」会写回 `dist/content.json`。

本地修改后，把更新后的文件提交到 GitHub 的 `nightshift/dist/content.json`，才能更新公开网站。

## 离线版本

`双击打开主页.html` 为独立的离线快照。改动主数据或源码后，运行 `npm run standalone` 重新生成。在线版本不依赖这个快照。

## 未来升级

当前版本不提供带登录的云端后台。若将来需要在网页上直接发布、跨设备同步、图片/附件上传，应增加有认证的服务器功能；不要把 GitHub Token 放入公开 HTML 或 JavaScript。
