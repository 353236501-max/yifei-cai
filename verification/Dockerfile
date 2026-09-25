FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl git zstd && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home --uid 10001 lean
USER lean
ENV HOME=/home/lean
ENV PATH=/home/lean/.elan/bin:$PATH
RUN curl -fsSL https://github.com/leanprover/elan/releases/download/v4.1.2/elan-x86_64-unknown-linux-gnu.tar.gz -o /tmp/elan.tar.gz && tar -xzf /tmp/elan.tar.gz -C /tmp && /tmp/elan-init -y --default-toolchain none
RUN git clone --depth 1 --branch v4.19.0 https://github.com/leanprover-community/mathlib4.git /home/lean/mathlib
WORKDIR /home/lean/mathlib
RUN lake exe cache get
RUN mkdir /home/lean/input
ENTRYPOINT ["lake", "env", "lean"]
