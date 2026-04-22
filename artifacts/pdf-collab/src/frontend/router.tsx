import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import DocumentPage from "@/pages/document";

export default function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/document/:id" component={DocumentPage} />
      <Route component={NotFound} />
    </Switch>
  );
}
