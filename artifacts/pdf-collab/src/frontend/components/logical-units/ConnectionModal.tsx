import "./ConnectionModal.styles.scss";

interface ConnectionModalProps {
  type: "connecting" | "disconnected";
}

const CONFIG = {
  connecting: {
    accent: "blue",
    title: "Connecting\u2026",
    message:
      "This is taking longer than expected. Waiting for the collaboration server to respond.",
    iconPath: (
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    ),
  },
  disconnected: {
    accent: "yellow",
    title: "Connection isn\u2019t stable",
    message:
      "Lost connection to the collaboration server. Attempting to reconnect\u2026",
    iconPath: (
      <>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
  },
} as const;

export default function ConnectionModal({ type }: ConnectionModalProps) {
  const { accent, title, message, iconPath } = CONFIG[type];
  const accentClass = accent === "blue" ? "connection-modal--blue" : "connection-modal--yellow";

  return (
    <div className={`connection-modal ${accentClass}`}>
      <div className="connection-modal__card">
        <div className="connection-modal__icon-ring">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="connection-modal__icon"
          >
            {iconPath}
          </svg>
        </div>
        <p className="connection-modal__title">{title}</p>
        <p className="connection-modal__message">{message}</p>
        <div className="connection-modal__dots">
          <span className="connection-modal__dot connection-modal__dot--one" />
          <span className="connection-modal__dot connection-modal__dot--two" />
          <span className="connection-modal__dot" />
        </div>
      </div>
    </div>
  );
}
