import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import "./not-found.styles.scss";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <Card className="not-found-page__card">
        <CardContent className="not-found-page__card-content">
          <div className="not-found-page__title-row">
            <AlertCircle className="not-found-page__icon" />
            <h1 className="not-found-page__title">404 Page Not Found</h1>
          </div>

          <p className="not-found-page__description">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
