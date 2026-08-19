import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router";
  import App from "./app/App.tsx";
  import "./styles/index.css";

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
      <App />
    </BrowserRouter>
  );