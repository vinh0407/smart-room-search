import { createRoot } from "react-dom/client";
  import React from "react";
  import { BrowserRouter } from "react-router";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
  > {
    state = { hasError: false };
    static getDerivedStateFromError() {
      return { hasError: true };
    }
    componentDidCatch(error: unknown) {
      console.error("[App] render error:", error);
    }
    render() {
      if (this.state.hasError) {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
            <h1 className="text-lg font-bold text-foreground">
              Có lỗi xảy ra khi hiển thị trang
            </h1>
            <p className="text-sm text-muted-foreground">
              Vui lòng thử lại. Nếu lỗi vẫn tiếp tục, hãy quay lại trang chủ.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.href = "/";
              }}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white"
            >
              Về trang chủ
            </button>
          </div>
        );
      }
      return this.props.children;
    }
  }

  // ── Chặn pull-to-refresh / tự reload trên mobile ──────
  // iOS Safari bỏ qua overscroll-behavior, nên phải chặn bằng JS:
  // chỉ chặn khi đang ở đầu trang VÀ kéo xuống (không ảnh hưởng cuộn bình thường)
  let ptrStartY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      ptrStartY = e.touches[0].clientY;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (e) => {
      const dy = e.touches[0].clientY - ptrStartY;
      if (window.scrollY <= 0 && dy > 0) e.preventDefault();
    },
    { passive: false },
  );

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  );