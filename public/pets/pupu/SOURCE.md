# Pupu 网页宠物资源

来源：https://github.com/CZengC/pupu_pet
固定提交：705a41458ffb8df85bbe41bbe6cb732744d5ab6e
作者账号：CZengC
取用日期：2026-10-02

上游 README 的 License 部分声明 MIT；仓库当前没有单独 LICENSE 文件，GitHub API 的 license 字段为 null。此处如实保留声明及来源，不补造作者版权年份或授权文件。

上游文件：assets/default/cat_idle.gif、cat_sleep.gif、cat_stretch.gif、cat_eat.gif，以及 assets/sounds/meow.wav。
对应 PNG 是各 GIF 第一帧，用于用户暂停动画、系统减少动态和后台标签页。
idle 与 sleep 在上游是同一动画，网页通过状态文字区分，没有声称存在不同的睡眠素材。

网页交互为本项目自行编写的 React 组件，没有移植 PyQt5、pygame、系统命令或 Python 插件加载机制。原作者声明见：
https://github.com/CZengC/pupu_pet/blob/705a41458ffb8df85bbe41bbe6cb732744d5ab6e/README.md

