FROM rust:latest

RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    g++-mingw-w64-x86-64 \
    llvm \
    clang \
    nsis \
    wine \
    libwine \
    && rm -rf /var/lib/apt/lists/*
RUN update-alternatives --set x86_64-w64-mingw32-gcc /usr/bin/x86_64-w64-mingw32-gcc-posix && \
    update-alternatives --set x86_64-w64-mingw32-g++ /usr/bin/x86_64-w64-mingw32-g++-posix
RUN wget https://nchc.dl.sourceforge.net/project/nsis/NSIS%203/3.09/nsis-3.09-setup.exe \
    && wine nsis-3.09-setup.exe /S \
    && rm nsis-3.09-setup.exe
RUN rustup target add x86_64-pc-windows-gnu
RUN rustup component add rust-src
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs

ENV PATH="/root/.wine/drive_c/Program Files (x86)/NSIS:${PATH}"
WORKDIR /app
