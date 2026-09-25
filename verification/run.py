"""Local, bounded Lean runner. No hosted arbitrary-code execution endpoint."""
import argparse, json, pathlib, re, shutil, subprocess, uuid

def run(path):
    result = dict(formalized=False, lean_status="not_run", numeric_status="not_run", human_review_required=True)
    if not shutil.which("docker"):
        return dict(result, reason="Docker 未安装；未执行 Lean，也不能据此判断题目不可形式化。")
    source = pathlib.Path(path).resolve(strict=True)
    if source.suffix != ".lean" or source.stat().st_size > 128_000:
        return dict(result, reason="只接受 128 KB 以内的 Lean 文件。")
    text = source.read_text(encoding="utf-8-sig")
    if re.search(r"\b(sorry|admit|axiom)\b", text):
        return dict(result, lean_status="rejected", reason="不接受占位证明或新增公理；注释中也请勿出现这些词。")
    name = "yuzhi-lean-" + uuid.uuid4().hex
    command = ["docker", "run", "--rm", "--name", name, "--network", "none", "--cpus", "1", "--memory", "1g", "--memory-swap", "1g", "--pids-limit", "64", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--mount", f"type=bind,source={source},target=/home/lean/input/Main.lean,readonly", "yuzhi-lean:v4.19.0", "/home/lean/input/Main.lean"]
    try:
        p = subprocess.run(command, capture_output=True, timeout=30)
        output = (p.stdout+p.stderr).decode("utf-8", errors="replace")[:16000]
        if p.returncode == 0 and "declaration uses 'sorry'" not in output:
            return dict(result, formalized=True, lean_status="passed", reason="此文件编译通过；仍需人工确认形式命题与题目含义一致。", log=output)
        reason = "代码或证明未通过，需人工诊断；不能推断题目不可形式化。"
        if "unknown constant" in output or "unknown identifier" in output:
            reason = "可能是名称错误、缺少导入或引理，需按固定 Mathlib 版本复核。"
        if "Cannot connect" in output or "Unable to find image" in output:
            reason = "Docker 或预构建镜像不可用。"
        return dict(result, lean_status="failed", reason=reason, log=output)
    except subprocess.TimeoutExpired:
        return dict(result, lean_status="timeout", reason="超过 30 秒，已停止；超时不是数学反例。")
    finally:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=10)

if __name__ == "__main__":
    parser=argparse.ArgumentParser();parser.add_argument("file");args=parser.parse_args()
    print(json.dumps(run(args.file), ensure_ascii=False, indent=2))
