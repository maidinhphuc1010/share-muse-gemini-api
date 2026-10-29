import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  ImagePlus,
  Heart,
  MessageCircle,
  Menu,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const FacebookIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="19"
    height="19"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d="M13.5 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.1H7.3V13h2.8v8h3.4Z" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.7A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.4 13.8a6 6 0 0 1 0-3.6V7.5H3a10 10 0 0 0 0 9l3.4-2.7Z"
    />
    <path
      fill="#EA4335"
      d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9 5.5l3.4 2.7C7.2 7.8 9.4 6 12 6Z"
    />
  </svg>
);

const navigation = [
  { label: "Tài khoản Muse", icon: FacebookIcon, href: "/muse-accounts" },
  { label: "Tài khoản Gemini", icon: GoogleIcon, href: "/gemini-accounts" },
  { label: "Chat Gemini", icon: MessageCircle, href: "/gemini-chat" },
  { label: "Tạo video", icon: Clapperboard, href: "/create" },
  { label: "Tạo ảnh", icon: ImagePlus, href: "/create-image" },
  { label: "Ảnh & Video AI", icon: Clapperboard, href: "/image-video" },
];

type AppLayoutProps = {
  children: ReactNode;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  onSidebarCollapsedChange: (collapsed: boolean) => void;
  onDonate: () => void;
  activePath: string;
};

export function AppLayout({
  children,
  sidebarOpen,
  sidebarCollapsed,
  onSidebarOpenChange,
  onSidebarCollapsedChange,
  onDonate,
  activePath,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Đóng menu"
          onClick={() => onSidebarOpenChange(false)}
        />
      )}
      <aside
        className={`sidebar${sidebarOpen ? " sidebar--open" : ""}${sidebarCollapsed ? " sidebar--collapsed" : ""}`}
      >
        <a className="brand" href="#home" aria-label="AutoVideo - trang chủ">
          <img src="/favicon.png" alt="" className="brand-logo" />
          <span className="brand-name">AutoVideo</span>
          <button
            className="mobile-close"
            aria-label="Đóng menu"
            onClick={(event) => {
              event.preventDefault();
              onSidebarOpenChange(false);
            }}
          >
            <X size={20} />
          </button>
        </a>
        <div className="sidebar-section-label">
          <span>MENU CHÍNH</span>
        </div>
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {navigation.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              to={href}
              className={`nav-link${activePath === href ? " nav-link--active" : ""}`}
              onClick={() => onSidebarOpenChange(false)}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="sidebar-collapse sidebar-collapse--bottom"
            type="button"
            aria-label={
              sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"
            }
            aria-expanded={!sidebarCollapsed}
            onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
            <span>{sidebarCollapsed ? "Mở rộng" : "Thu gọn"}</span>
          </button>
          <div className="support-card">
            <div className="support-icon">
              <Heart size={18} />
            </div>
            <p>Cảm thấy hữu ích?</p>
            <span>Sự ủng hộ của bạn giúp dự án phát triển hơn.</span>
            <button
              className="support-button"
              onClick={() => {
                onDonate();
                onSidebarOpenChange(false);
              }}
            >
              Ủng hộ tác giả
            </button>
          </div>
          <div className="sidebar-version">
            AutoVideo <span>•</span> Đang phát triển
          </div>
        </div>
      </aside>
      <main className="app-main" id="home">
        <header className="mobile-header">
          <button
            className="menu-toggle"
            aria-label="Mở menu"
            onClick={() => onSidebarOpenChange(true)}
          >
            <Menu size={22} />
          </button>
          <img src="/favicon.png" alt="" />
          <span>AutoVideo</span>
        </header>
        {children}
      </main>
    </div>
  );
}
