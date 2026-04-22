import "./LoadingSpinner.styles.scss";

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__content">
        <div className="loading-spinner__indicator" />
        <p className="loading-spinner__message">{message}</p>
      </div>
    </div>
  );
}
