import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import MuseAccountsPage from "./page/MuseAccountsPage";
import GeminiAccountsPage from "./page/GeminiAccountsPage";
import GeminiChatPage from "./page/GeminiChatPage";
import CreateImagePage from "./page/CreateImageFinal";
import CreateVideoPage from "./page/CreateVideoPage";
import ImageVideoWorkflow from "./page/ImageVideoWorkflow";
import { AppLayout } from "./components/layout";
import "./App.css";

function App() {
  const location = useLocation();
  const [donationOpen, setDonationOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!donationOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDonationOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [donationOpen]);

  return (
    <>
      <AppLayout
        activePath={location.pathname}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarOpenChange={setSidebarOpen}
        onSidebarCollapsedChange={setSidebarCollapsed}
        onDonate={() => setDonationOpen(true)}
      >
        <div
          style={{
            display: location.pathname === "/gemini-chat" ? "none" : "contents",
          }}
        >
          <Routes>
            <Route
              path="/"
              element={
                <section className="welcome-panel">
                  <span className="eyebrow">NỀN TẢNG SÁNG TẠO VIDEO</span>
                  <h1>Chào mừng đến với AutoVideo</h1>
                  <p>
                    Công cụ hỗ trợ bạn tạo video tự động. Các tính năng đang
                    được phát triển.
                  </p>
                  <button
                    className="welcome-support"
                    onClick={() => setDonationOpen(true)}
                  >
                    <Heart size={17} /> Ủng hộ tác giả
                  </button>
                </section>
              }
            />
            <Route path="/muse-accounts" element={<MuseAccountsPage />} />
            <Route path="/gemini-accounts" element={<GeminiAccountsPage />} />
            <Route path="/gemini-chat" element={null} />
            <Route path="/create-image" element={<CreateImagePage />} />
            <Route path="/create" element={<CreateVideoPage />} />
            <Route path="/image-video" element={<ImageVideoWorkflow />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <div
          style={{
            display: location.pathname === "/gemini-chat" ? "contents" : "none",
          }}
        >
          <GeminiChatPage />
        </div>
      </AppLayout>
      {donationOpen && (
        <div
          className="donation-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDonationOpen(false);
          }}
        >
          <section
            className="donation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-title"
          >
            <button
              className="donation-close"
              aria-label="Đóng hộp thoại"
              onClick={() => setDonationOpen(false)}
            >
              <X size={20} />
            </button>
            <div className="donation-heart">
              <Heart size={25} />
            </div>
            <span className="eyebrow">LỜI CẢM ƠN</span>
            <h2 id="donation-title">Ủng hộ tác giả</h2>
            <p className="donation-description">
              Cảm ơn bạn đã quan tâm và ủng hộ AutoVideo. Thông tin chuyển khoản
              sẽ được cập nhật tại đây.
            </p>
            <div className="bank-placeholder">
              <div>
                <span>Ngân hàng</span>
                <strong>Sẽ cập nhật</strong>
              </div>
              <div>
                <span>Số tài khoản</span>
                <strong>Sẽ cập nhật</strong>
              </div>
              <div>
                <span>Chủ tài khoản</span>
                <strong>Sẽ cập nhật</strong>
              </div>
              <div>
                <span>Nội dung chuyển khoản</span>
                <strong>Ủng hộ AutoVideo</strong>
              </div>
            </div>
            <button
              className="donation-done"
              onClick={() => setDonationOpen(false)}
            >
              Đã hiểu
            </button>
          </section>
        </div>
      )}
    </>
  );
}

export default App;
