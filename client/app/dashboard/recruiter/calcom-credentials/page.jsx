"use client";

import { GlassBackground } from "@/components/GlassShell";
import Navbar from "@/components/Navbar";
import Sidebar, { useSidebarState } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Loading from "@/components/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { calcomCredentialsAPI } from "@/lib/api";
import {
  Key,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function CalcomCredentialsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen } = useSidebarState();

  const [apiSecretKey, setApiSecretKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(false);
  const [selectedEventTypeId, setSelectedEventTypeId] = useState("");
  const [savingEventType, setSavingEventType] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [loadingCredentials, setLoadingCredentials] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && user.role !== "recruiter") {
      router.push(`/dashboard/${user.role}`);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && user.role === "recruiter" && user.id) {
      fetchCredentials();
    }
  }, [user]);

  const fetchCredentials = async () => {
    if (!user?.id) return;

    try {
      setLoadingCredentials(true);
      const response = await calcomCredentialsAPI.getCredentials(user.id);
      if (response.credentials) {
        setCredentials(response.credentials);
        if (response.credentials.eventTypeId) {
          setSelectedEventTypeId(response.credentials.eventTypeId.toString());
        }
      }
    } catch (error) {
      // Credentials not found is okay - user needs to set them up
      console.log("No credentials found yet");
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!apiSecretKey.trim()) {
      toast.error("Please enter your Cal.com API secret key");
      return;
    }

    // Basic validation
    if (
      !apiSecretKey.startsWith("cal_live_") &&
      !apiSecretKey.startsWith("cal_test_")
    ) {
      toast.error(
        "Invalid API key format. Must start with 'cal_live_' or 'cal_test_'"
      );
      return;
    }

    try {
      setSavingKey(true);
      await calcomCredentialsAPI.saveApiSecretKey(user.id, apiSecretKey.trim());
      toast.success("API secret key saved successfully!");
      setApiSecretKey("");
      await fetchCredentials();
    } catch (error) {
      toast.error(error.message || "Failed to save API secret key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleFetchEventTypes = async () => {
    if (!user?.id) return;

    try {
      setLoadingEventTypes(true);
      const response = await calcomCredentialsAPI.getEventTypes(user.id);
      if (response.eventTypes) {
        setEventTypes(response.eventTypes);
        toast.success(`Found ${response.eventTypes.length} event type(s)`);
      }
    } catch (error) {
      toast.error(
        error.message ||
          "Failed to fetch event types. Please check your API secret key."
      );
      setEventTypes([]);
    } finally {
      setLoadingEventTypes(false);
    }
  };

  const handleSaveEventType = async () => {
    if (!user?.id) return;

    if (!selectedEventTypeId) {
      toast.error("Please select an event type");
      return;
    }

    try {
      setSavingEventType(true);
      await calcomCredentialsAPI.saveEventType(
        user.id,
        parseInt(selectedEventTypeId, 10)
      );
      toast.success("Event type saved successfully!");
      await fetchCredentials();
    } catch (error) {
      toast.error(error.message || "Failed to save event type");
    } finally {
      setSavingEventType(false);
    }
  };

  if (loading || loadingCredentials) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loading size="lg" />
      </div>
    );
  }

  if (!user || user.role !== "recruiter") {
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />
      <Sidebar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-transparent">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-1.5 text-slate-900">
                Cal.com Credentials
              </h2>
              <p className="text-slate-600">
                Configure your Cal.com API credentials to send interview emails
              </p>
            </div>

            {/* Current Status */}
            {credentials && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Current Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        API Key Status:
                      </span>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Configured
                      </Badge>
                    </div>
                    {credentials.eventTypeId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          Event Type ID:
                        </span>
                        <Badge variant="outline">
                          {credentials.eventTypeId}
                        </Badge>
                      </div>
                    )}
                    {!credentials.eventTypeId && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                          Event Type:
                        </span>
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          Not Selected
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 1: Save API Secret Key */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Step 1: Save Cal.com API Secret Key
                </CardTitle>
                <CardDescription>
                  Enter your Cal.com API secret key. You can find this in your
                  Cal.com settings under API keys.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveApiKey} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Secret Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="cal_live_..."
                      value={apiSecretKey}
                      onChange={(e) => setApiSecretKey(e.target.value)}
                      disabled={savingKey}
                    />
                    <p className="text-xs text-slate-500">
                      Your API key should start with "cal_live_" or "cal_test_"
                    </p>
                  </div>
                  <Button type="submit" disabled={savingKey}>
                    {savingKey ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save API Key"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Step 2: Fetch Event Types */}
            {credentials && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Step 2: Fetch Event Types
                  </CardTitle>
                  <CardDescription>
                    Fetch all available event types from your Cal.com account.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      onClick={handleFetchEventTypes}
                      disabled={loadingEventTypes}
                      variant="outline"
                    >
                      {loadingEventTypes ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Fetch Event Types
                        </>
                      )}
                    </Button>

                    {eventTypes.length > 0 && (
                      <div className="space-y-2">
                        <Label>Available Event Types</Label>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                          {eventTypes.map((eventType) => (
                            <div
                              key={eventType.id}
                              className="p-3 border-b last:border-b-0 hover:bg-slate-50 rounded"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">
                                    {eventType.title}
                                  </p>
                                  {eventType.description && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      {eventType.description}
                                    </p>
                                  )}
                                  <div className="flex gap-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      ID: {eventType.id}
                                    </Badge>
                                    {eventType.length && (
                                      <Badge variant="outline" className="text-xs">
                                        {eventType.length} min
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {eventTypes.length === 0 && !loadingEventTypes && (
                      <p className="text-sm text-slate-500">
                        Click "Fetch Event Types" to load your Cal.com event
                        types
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Save Event Type */}
            {credentials && eventTypes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Step 3: Select Event Type
                  </CardTitle>
                  <CardDescription>
                    Select the event type you want to use for interview
                    bookings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="eventType">Event Type</Label>
                      <Select
                        value={selectedEventTypeId}
                        onValueChange={setSelectedEventTypeId}
                        disabled={savingEventType}
                      >
                        <SelectTrigger id="eventType">
                          <SelectValue placeholder="Select an event type" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypes.map((eventType) => (
                            <SelectItem
                              key={eventType.id}
                              value={eventType.id.toString()}
                            >
                              {eventType.title} (ID: {eventType.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleSaveEventType}
                      disabled={!selectedEventTypeId || savingEventType}
                    >
                      {savingEventType ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Event Type"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help Text */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <AlertCircle className="h-5 w-5" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    <strong>How to get your Cal.com API secret key:</strong>
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Log in to your Cal.com account</li>
                    <li>Go to Settings → API</li>
                    <li>Create a new API key or copy your existing one</li>
                    <li>Paste it in Step 1 above</li>
                  </ol>
                  <p className="mt-3">
                    <strong>Note:</strong> Make sure your Cal.com account has
                    event types configured and Google Meet integration enabled.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

