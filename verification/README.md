# 早觉雨大人的本地数学验证

早觉雨大人，网页中的 SymPy 检查可以直接点击运行；Lean 是独立的本地可选服务，当前机器未安装 Docker、Lean 或 Lake，因此没有声称任何 Lean 文件已通过。

环境准备（Linux x86-64 容器；构建会联网下载较大的 Lean 与 Mathlib 缓存）：

```sh
docker build -t yuzhi-lean:v4.19.0 verification
python verification/run.py verification/Example.lean
```

Mathlib 固定为 [v4.19.0](https://github.com/leanprover-community/mathlib4/tree/v4.19.0)，Elan 固定为 [v4.1.2](https://github.com/leanprover/elan/releases/tag/v4.1.2)，工具链由仓库中的 lean-toolchain 决定。Dockerfile 在本环境未执行，首次构建仍需验证。

每次运行由 Docker 限制为 1 CPU、1 GiB 内存、64 进程、30 秒墙钟时间；无网络、只读根目录、只挂载单个只读输入文件，不挂载 Docker socket。程序实际调用 `lake env lean`，捕获退出码与日志。拒绝 `sorry`、`admit` 和新增 `axiom`，但这不替代对命题和可信计算基础的审查。不把引理名称错误或超时说成“不可形式化”。容器不是对任意敌意代码的绝对隔离，服务上线前仍需独立隔离环境与资源队列。

页面的 Lean 下载仅为数值等式示例，不是整道导数题的形式化证明。`formalized=true` 只说明该 Lean 文件实际通过，`human_review_required` 始终保留为 true。
