import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, ShieldCheck, FileText, Globe2, User } from "lucide-react";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "profile.read": "View your basic profile details including name and avatar.",
  "profile.write": "Update your profile details such as headline or bio.",
  "email.read": "Read your verified email address.",
  "placements.read": "Access your placements and saved opportunities.",
  "placements.write": "Create or modify opportunities on your behalf.",
  "notifications.send": "Send you in-app or email notifications.",
};

type ConsentDecision = "approve" | "deny";

type ConsentResponse = {
  redirect_to?: string;
  message?: string;
};

const OAuthConsent = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loadingAction, setLoadingAction] = useState<ConsentDecision | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const request = useMemo(() => {
    const clientId = searchParams.get("client_id") ?? "";
    const clientName = searchParams.get("client_name") ?? "";
    const redirectUri = searchParams.get("redirect_uri") ?? "";
    const state = searchParams.get("state") ?? "";
    const scopeParam = searchParams.get("scope") ?? "";
    const scopes = scopeParam
      .split(/[,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      clientId,
      clientName,
      redirectUri,
      state,
      scopes,
      prompt: searchParams.get("prompt") ?? "consent",
    };
  }, [searchParams]);

  const applicationName = request.clientName || request.clientId || "Connected application";
  const scopeList = request.scopes.length > 0 ? request.scopes : ["profile.read"];

  const handleDecision = async (decision: ConsentDecision) => {
    setLoadingAction(decision);
    setErrorMessage(null);
    setServerMessage(null);

    try {
      const response = await apiClient.post<ConsentResponse>("/api/oauth/consent", {
        decision,
        client_id: request.clientId,
        scopes: scopeList,
        redirect_uri: request.redirectUri,
        state: request.state,
      });

      const successTitle = decision === "approve" ? "Access granted" : "Access denied";
      toast({ title: successTitle, description: response?.message ?? "Decision recorded successfully." });
      setServerMessage(response?.message ?? null);

      if (response?.redirect_to) {
        window.location.href = response.redirect_to;
        return;
      }

      if (decision === "approve" && request.redirectUri) {
        window.location.href = request.redirectUri;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "We could not process your decision.";
      setErrorMessage(message);
      toast({ title: "Request failed", description: message, variant: "destructive" });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/10">
      <main className="py-12">
        <div className="container mx-auto px-4 max-w-3xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
              <Shield className="h-4 w-4" />
              Secure OAuth Consent
            </div>
            <h1 className="text-3xl font-bold text-foreground">Authorize {applicationName}</h1>
            <p className="text-muted-foreground">
              Review the information this application is requesting before granting access to your PlacementBridge account.
            </p>
          </div>

          {errorMessage && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {serverMessage && !errorMessage && (
            <Alert>
              <AlertTitle>Consent updated</AlertTitle>
              <AlertDescription>{serverMessage}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Application details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <span className="font-semibold text-foreground">Application</span>
                <p className="text-muted-foreground">{applicationName}</p>
              </div>
              {request.redirectUri && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground">Redirect URI</span>
                  <div className="flex items-center gap-2 text-muted-foreground break-all">
                    <Globe2 className="h-4 w-4" />
                    <span>{request.redirectUri}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <span className="font-semibold text-foreground">Requested permissions</span>
                <div className="flex flex-wrap gap-2">
                  {scopeList.map((scope) => (
                    <Badge key={scope} variant="secondary">
                      {scope}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-2 rounded-md border border-border bg-card px-4 py-3">
                  {scopeList.map((scope) => (
                    <div key={scope} className="space-y-1 border-b border-border/60 pb-3 last:border-none last:pb-0">
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        {scope}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {SCOPE_DESCRIPTIONS[scope] ?? "Limited access to information you have shared with this application."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-primary" />
                Signed in as
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold text-foreground">{user?.email ?? "Guest user"}</p>
              <p className="text-muted-foreground">
                {user ? "We will share the selected information from this account." : "Sign in to ensure we link the consent to your account."}
              </p>
            </CardContent>
            <Separator />
            <CardFooter className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-muted-foreground">
                You can revoke access later from your notification preferences and account settings.
              </div>
              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
                <Button
                  variant="outline"
                  className="md:w-auto"
                  disabled={loadingAction !== null}
                  onClick={() => handleDecision("deny")}
                >
                  {loadingAction === "deny" ? "Declining…" : "Deny"}
                </Button>
                <Button
                  className="md:w-auto"
                  disabled={loadingAction !== null}
                  onClick={() => handleDecision("approve")}
                >
                  {loadingAction === "approve" ? "Granting…" : "Allow access"}
                </Button>
              </div>
            </CardFooter>
          </Card>

          <QuickNavigation />

          <p className="text-center text-xs text-muted-foreground">
            Having issues? Contact support so we can help verify your OAuth application setup.
          </p>
        </div>
      </main>
    </div>
  );
};

export default OAuthConsent;
