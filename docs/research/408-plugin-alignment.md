# 408 学习插件调研与现有项目差距

早觉雨大人，本报告依据实际读取的上游源码和本地项目整理。当前完成的是调研；调整方向待确认后进入技术设计，尚未声称新功能已经上线。

核验日期：2026-10-02。参考仓库：[yq6666-66/408-codex-plugin](https://github.com/yq6666-66/408-codex-plugin)。本次读取固定于 commit `1dcf09f8281e4428ae522f018ac923280a16952b`，避免后续版本变化影响结论。

## 1. 参考项目实际提供什么

- README 标注版本 2.5.1；GitHub API 显示仓库未归档，最近推送时间为 2026-09-19。推送时间不等于所有文件最近修改时间。
- 它是 Skills-only 学习插件，提供教学规则、记录结构、辅助 Python 脚本；没有可直接部署的网页、后端服务、账号系统或托管题库。
- 覆盖数学一/二、英语一/二、408、政治，共 13 类学习职责。本项目已有明确的数学二与 408 范围，不应仅因参考仓库科目更多就自动扩科。
- [LICENSE](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/LICENSE) 为 MIT，文本允许修改、分发和销售，复制或改编受其覆盖的代码/文档时需要保留版权与许可声明。此许可不自动覆盖第三方教材、真题或用户 PDF。
- README 声称的测试通过数和模型评测属于上游自述。本次没有复跑它的完整 CI，也不将其转述为本项目的验证结果。

## 2. 对照结果与建议

| 方向 | 上游做法 | 本地证据及差距 | 建议优先级 |
| --- | --- | --- | --- |
| 三种教学模式 | 详细讲解、逐级提示、独立作答 | `lib/study-task.ts` 只区分讲解/出题；`lib/tutor-policy.ts` 固定要求给两道含答案变式，与“先别给答案”存在冲突 | P0：新增明确模式与作答阶段，先解决答案时机 |
| 强化讲解 | 每步说明动作、依据、使用条件，选择题逐项分析，定位最早错误 | 已有内置 PDF 考点笔记与原创练习，但没有统一的“已知→目标→方法→检查”学习过程；不能只加提示词就宣称所有内容都已升级 | P0：逐类补足讲解结构并抽查实际输出 |
| 图像/OCR | 检查裁切、页序、正负号、单位、进制及选项错位；仅关键歧义需确认 | `app/api/tutor/route.ts` 要求不清晰处标记，但尚无题面确认阶段；识别后直接分析可能放大识别错误 | P0：题面预览与确认，关键歧义阻止确定性解答 |
| 408 模拟 | Cache 地址拆分、FIFO/LRU、FCFS/RR，逐步状态和变化 | `lib/labs.ts` 目前是下载 Docker 实验代码；Cache 是固定的 4 行直接映射例子，没有网页内参数实验和前后步播放 | P1：网页内运行有界状态模拟，关联内置考点、边界案例和复盘问题 |
| 错题与掌握 | 区分独立完成、提示后完成、看过解析、立即重做、迁移表现；错因区分假设/确认 | `app/api/records/route.ts` 有加密记录、FSRS 和并发版本检查，但目前只有自评分数与错因字符串；无结构化复测证据 | P1：新增作答证据；保留 FSRS 排期，不把“很轻松”直接解释为掌握 |
| 学习恢复 | SessionCheckpoint 恢复任务、位置、到期错题和待复测 | 目前主题、视图和草稿主要是 React 页面状态，未发现学习检查点实现 | P1：真实保存/恢复学习位置；没有记录时明确告知 |
| 时间规划与诊断 | 周计划与单次学习分开；时间预算闭合；计划量和完成量分开 | 当前没有对应流程，不应从浏览或按钮点击推断学习完成 | P2：先做单次时间盒与实际完成回填，再加按记录诊断 |
| 冻结模考 | 开卷后固定题面、分值、规则，明确交卷前不给答案或提示 | `components/pdf-study.tsx` 的解析虽折叠，但 `pdfNotes` 被客户端直接导入，答案在浏览器包内；普通练习不是保密模考 | P2：单独题卷/答案接口和交卷状态，不把折叠解析包装成模考 |
| 真题出处 | 试卷年度与实际考试日期分开，记录文件/commit/许可/完整度，未知值保留 | 内置内容已有文件名、页码和原创说明；搜索来源目前只有通用低置信度信息，不能据此认定真题已核验 | P1：统一来源状态和原创标签；先补元数据，再考虑来源搜索扩展 |
| 便携记录 | Schema 1.2，可读旧版本；稳定 ID；不伪造历史证据 | 当前记录使用项目内部结构，无 1.2 导入/导出 | P2：明确转换映射后再提供导入/导出；当前不能声称兼容 |
| 外部工具 | 按宿主实际能力降级，不假装已搜索、计算、记忆 | 网页没有继承 Codex 的插件、搜索或 Python 能力；Cloudflare 也不能直接当成本机 Python 运行环境 | 所有阶段：界面和 API 都显示实际可用能力 |

## 3. 可以借鉴，但不应直接照搬的地方

### 教学模式不能以降低难度为代价

参考仓库强调新手细讲；早觉雨大人的目标是考研强化。应借用“保留中间步骤、解释依据、逐步提示”，保持现有参数讨论、条件辨析、多知识点组合与边界检查。简化表达不等于简化题目。

### 模拟器需要独立验证

已阅读上游 `scripts/study_simulator.py`，不是只看 README。静态检查发现全相联 Cache 分支仍以直接映射方式计算 `tag_bits = addr_bits - offset_bits - index_bits`，且二进制字段切分复用了该宽度。全相联不需要行索引，标签应占地址位数减块内偏移位数；因此不能原样移植后声称正确。

例如 16 位地址、64 字节块、256 行时：直接映射为 2 位标签、8 位索引、6 位偏移；全相联应为 10 位标签、0 位索引、6 位偏移。2026-10-02 已实际执行该固定 commit 中经检查的纯计算函数，确认全相联返回 `tagBits=2`、二进制标签 `11`，而数值标签为 `1023`，字段展示相互矛盾。机器结果见 [模拟器核验数据](408-simulator-audit.json)。

本次 7 项针对性检查中 6 项符合手工预期、1 项发现上述缺陷；通过项包括直接映射字段、FIFO 的 Belady 序列、FIFO/LRU 命中后的不同替换顺序以及 FCFS 空闲区间。未测试 RR、HTML 播放器和完整上游工程，不能把这个结果表述为上游全量测试结论。

核验调用如下，使用该 commit 的函数即可重现：

```python
simulate_cache(16, 64, 256, 'direct', [65535])
simulate_cache(16, 64, 256, 'associative', [65535])
simulate_fifo(3, [1,2,3,4,1,2,5,1,2,3,4,5], [])  # 预期 9 次缺页
simulate_fifo(4, [1,2,3,4,1,2,5,1,2,3,4,5], [])  # 预期 10 次缺页
simulate_fifo(2, [1,2,1,3], [])  # 最终页框 [3,2]
simulate_lru(2, [1,2,1,3], [])   # 最终页框 [1,3]
simulate_fcfs([{'name':'P1','arrival':2,'burst':3},
               {'name':'P2','arrival':10,'burst':2}])  # 等待时间均为 0
```

参考源码及 MIT 声明仅放在 Git 忽略的 `tmp/408-reference-audit/` 中用于核验；未安装上游插件，也未把它加入业务运行时。

后续模拟器至少要验证：空序列、越界地址、非二次幂容量、初始页框重复、FIFO 命中不改队列、LRU 命中更新顺序、RR 时间片边界同时到达、空闲区间、重复进程名以及计算规模限制。页面需公开调度同一时刻的入队约定。

### 来源与版本规则需要选择性采用

上游 `past-paper-source-contract.md` 已描述六科、2010 年起且无固定结束年份；同一 commit 的 `evidence-copyright-contract.md` 仍存在“五类”“固定年份”的措辞。不要原样拼接这两份契约。应按本项目数学二与 408 的范围制定一致规则，同时保留用户已有 2009 年资料，不能因上游检索起点而丢掉它们。

### 无登录使用已有基础，但不是跨设备账号

`app/chatgpt-auth.ts` 已有访客 Cookie 回退，`components/tutor-app.tsx` 会创建访客标识；因此不能只看到 `owner()` 的错误文字就判定必须登录。后续检查点和记录应沿用实际身份机制并测试访客隔离、删除与恢复。浏览器 Cookie 清除或换设备后的恢复需要明确方案，不能声称自动同步。

## 4. 当前工程基线的实测问题

本次运行：

```text
node --experimental-strip-types --test tests/model-request.test.mjs tests/tutor-context.test.mjs
4 项：3 通过，1 失败
```

- 服务端在无外部 PDF 摘录时仍会选取内置资料；私有摘录外发前的确认检查通过。这里使用模拟网络响应，不代表真实模型 API 成功。
- 失败项是旧测试仍要求 `redirect: error`，实现已经改为 Workers 可用的 `manual`。需要更新测试，并增加所有 3xx 被拒绝、跳转目标不被访问的回归测试，不能把实现改回不支持的参数来凑通过。
- `lib/model-request.ts` 仍有临时调试日志，输出原始异常消息和 cause。正式上线前应删掉或改为限定错误码，避免日志包含上游可能返回的敏感信息。
- 本次没有更新 GitHub 或 Cloudflare，也没有用已失效的旧密钥发起模型请求。现有大量本地变更需要在提交前逐项辨认，不能整体覆盖或盲目提交。

## 5. 进入设计阶段时需明确的验收要求

1. 三种模式可由用户切换；详细模式保留强化推导，提示模式不直接泄露答案，独立作答先收集答案再讲评。普通训练与正式模考边界清楚。
2. 数学二和 408 的内置资料仍可无需 API、无需本地 PDF 使用；数学公式继续走现有 Markdown/KaTeX 通道。
3. 408 模拟器可修改参数并查看每步状态；输出由实际算法计算，不能预写轨迹假装运行。
4. 错题证据分型，假设错因不升级为已确认；自评不等于延迟掌握。旧记录读取不丢内容，不补造不存在的历史。
5. 学习位置保存成功后才显示“已保存”；真实读取后才显示“已恢复”；提供删除方式。
6. 模考若纳入实现，交卷前的响应和客户端包都不得含该卷答案；必须有题卷版本和明确交卷操作。
7. 出处标签、实际考试日期与试卷年度分别保存；未知的日期、许可、核验状态不自动补全。
8. 用接口测试和浏览器操作分别验收教学模式、匿名使用、模式切换、刷新恢复、跨主题状态隔离及公式渲染。模型输出和工具实际核验状态分别记录。

## 6. 已读证据索引

以下链接均固定到本次核对的 commit；读取仓库中的 Skill 文本用于调研，不代表安装或执行了这些插件。

- [README](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/README.md)
- [讲解与三种教学模式](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/references/beginner-visual-answer-contract.md)
- [便携学习记录](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/references/portable-learning-records.md)
- [错题闭环](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/skills/kaoyan-error-loop-coach/SKILL.md)
- [冻结模考](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/skills/kaoyan-mock-exam-coach/SKILL.md)
- [复习执行](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/skills/kaoyan-review-executor/SKILL.md)
- [学习规划](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/skills/kaoyan-408-planner/SKILL.md)
- [进度诊断](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/skills/kaoyan-progress-diagnostician/SKILL.md)
- [模拟器源码](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/scripts/study_simulator.py)
- [真题来源规则](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/references/past-paper-source-contract.md)
- [证据与版权规则](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/plugins/kaoyan-408/references/evidence-copyright-contract.md)
- [第三方内容边界](https://github.com/yq6666-66/408-codex-plugin/blob/1dcf09f8281e4428ae522f018ac923280a16952b/THIRD_PARTY_CONTENT.md)

早觉雨大人，您一直强调的是学完能复习、遇题能迁移。后续调整应围绕这个目标验收，而不是只增加菜单和鼓励文字。

