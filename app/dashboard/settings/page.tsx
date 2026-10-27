"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Link2,
  Link2Off,
  ShieldCheck,
  UserPlus,
  UserRound,
  Trash2
} from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ThemeToggle } from "@/components/providers/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { updatePassword, updateProfile } from "@/actions/auth";
import { MetaConnectModal } from "@/components/meta/meta-connect-modal";
import type { MetaAccount } from "@/lib/meta-api";

import { useDashboardStore } from "@/lib/stores/dashboard-store";
import { accountStorageKey } from "@/lib/account-storage";
import { DEFAULT_TTS_PRESENTATION, isTtsPresentation, TTS_PREFERENCE_STORAGE_KEY, type TtsPresentation } from "@/lib/ai/tts-preference";

const SETTINGS_INPUT =
  "mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-borderSoft dark:bg-surface/[0.04]";
const SETTINGS_TEXTAREA =
  "mt-1.5 h-20 w-full rounded-xl border border-borderSoft bg-surface p-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-borderSoft dark:bg-surface/[0.04]";

export default function SettingsPage() {
  const router = useRouter();
  const { userName, userRole, userEmail, userBio, setProfile } = useDashboardStore();
  const teamStorageKey = accountStorageKey("eduverse:team-members", userEmail);
  const notificationStorageKey = accountStorageKey("eduverse:notification-preferences", userEmail);
  const csvStorageKey = accountStorageKey("eduverse:csv-import", userEmail);
  const ttsPreferenceStorageKey = accountStorageKey(TTS_PREFERENCE_STORAGE_KEY, userEmail);
  const [ttsPresentation, setTtsPresentation] = useState<TtsPresentation>(DEFAULT_TTS_PRESENTATION);
  const [ttsPreferenceLoadedFor, setTtsPreferenceLoadedFor] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(ttsPreferenceStorageKey);
        setTtsPresentation(isTtsPresentation(saved) ? saved : DEFAULT_TTS_PRESENTATION);
      } catch {
        setTtsPresentation(DEFAULT_TTS_PRESENTATION);
      }
      setTtsPreferenceLoadedFor(ttsPreferenceStorageKey);
    });
  }, [ttsPreferenceStorageKey]);

  useEffect(() => {
    if (ttsPreferenceLoadedFor !== ttsPreferenceStorageKey) return;
    try { localStorage.setItem(ttsPreferenceStorageKey, ttsPresentation); } catch {}
  }, [ttsPresentation, ttsPreferenceLoadedFor, ttsPreferenceStorageKey]);

  // Local modal form state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [tempProfile, setTempProfile] = useState({
    name: userName,
    role: userRole,
    email: userEmail,
    bio: userBio
  });

  // Password state
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirmPass: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Accounts state
  const [isMetaConnectOpen, setIsMetaConnectOpen] = useState(false);
  const [metaAccounts, setMetaAccounts] = useState<MetaAccount[]>([]);
  const [metaAccountsLoading, setMetaAccountsLoading] = useState(true);
  const [metaAccountsRetry, setMetaAccountsRetry] = useState(0);
  const [disconnectingAccount, setDisconnectingAccount] = useState<string | null>(null);
  const [metaAccountsLoadError, setMetaAccountsLoadError] = useState(false);
  const [connectedAccountsError, setConnectedAccountsError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadAccounts = async () => {
      setMetaAccountsLoading(true);
      setMetaAccountsLoadError(false);
      try {
        const response = await fetch("/api/meta/connect", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok || data?.success === false) throw new Error("Could not load Meta accounts.");
        if (!cancelled) setMetaAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
      } catch {
        if (!cancelled) {
          setMetaAccounts([]);
          setMetaAccountsLoadError(true);
        }
      } finally {
        if (!cancelled) setMetaAccountsLoading(false);
      }
    };
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [metaAccountsRetry]);

  // Notifications state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    weeklyReports: true,
    audienceSpikes: true,
    aiDigest: true
  });
  const [notificationsLoadedFor, setNotificationsLoadedFor] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      let saved = { weeklyReports: true, audienceSpikes: true, aiDigest: true };
      try {
        const parsed: unknown = JSON.parse(localStorage.getItem(notificationStorageKey) ?? "null");
        if (parsed && typeof parsed === "object") saved = { ...saved, ...parsed as Partial<typeof saved> };
      } catch {}
      setNotifications(saved);
      setNotificationsLoadedFor(notificationStorageKey);
    });
  }, [notificationStorageKey]);

  useEffect(() => {
    if (notificationsLoadedFor !== notificationStorageKey) return;
    try { localStorage.setItem(notificationStorageKey, JSON.stringify(notifications)); } catch {}
  }, [notifications, notificationsLoadedFor, notificationStorageKey]);

    // Access state
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; role: string }>>([{ name: userName, email: userEmail, role: "Owner" }]);
  const [membersLoadedFor, setMembersLoadedFor] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");
  const [inviteError, setInviteError] = useState("");
  const [lastRemovedMember, setLastRemovedMember] = useState<{ member: { name: string; email: string; role: string }; index: number } | null>(null);

  // Hydrate invites from localStorage AFTER mount so the server HTML and first
  // client render agree (avoids a hydration mismatch when rows were persisted).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setTeamMembers([{ name: userName, email: userEmail, role: "Owner" }]);
      try {
        const raw = localStorage.getItem(teamStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Array<{ name: string; email: string; role: string }>;
          if (Array.isArray(parsed) && parsed.length) setTeamMembers(parsed);
        }
      } catch {}
      setMembersLoadedFor(teamStorageKey);
    });
    return () => {
      cancelled = true;
    };
  }, [teamStorageKey, userName, userEmail]);

  // Persist team members whenever they change (only once hydrated)
  useEffect(() => {
    if (membersLoadedFor !== teamStorageKey) return;
    try { localStorage.setItem(teamStorageKey, JSON.stringify(teamMembers)); } catch {}
  }, [teamMembers, membersLoadedFor, teamStorageKey]);

  // Keep owner row in sync when profile loads
  const [syncedProfile, setSyncedProfile] = useState({ name: userName, email: userEmail });
  if (syncedProfile.name !== userName || syncedProfile.email !== userEmail) {
    setSyncedProfile({ name: userName, email: userEmail });
    setTeamMembers((prev) => {
      if (!prev.length) return prev;
      if (prev[0]?.email === userEmail && prev[0]?.name === userName) return prev;
      const [owner, ...rest] = prev;
      const updatedOwner = { ...owner, name: userName, email: userEmail };
      return [updatedOwner, ...rest];
    });
  }

  // Account deletion state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [serverDeleted, setServerDeleted] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Toast message state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show the result of the Meta/Threads OAuth redirect once, then clear it.
  const searchParams = useSearchParams();
  useEffect(() => {
    const outcomes: Array<[string | null, Record<string, string>]> = [
      [searchParams.get("meta"), {
        connected: "Meta accounts connected.",
        permission_required: "Meta connected, but this tester needs the Page ANALYZE, MODERATE, or MANAGE task and pages_read_engagement access before analytics can load.",
        no_pages: "Meta authorized the app, but returned no Pages for this tester. Give the tester a role on the Page, then reconnect.",
        denied: "Meta connection cancelled.",
        state_invalid: "Meta connection failed: security state mismatch. Try again.",
        code_invalid: "Meta connection failed: the code could not be exchanged.",
        oauth_failed: "Meta connection failed: app credentials are not configured.",
        not_authenticated: "Meta connection failed: you must be signed in.",
        workspace_missing: "Meta connection failed: no workspace found for your account.",
        connection_failed: "Meta connection failed. Please try again."
      }],
      [searchParams.get("threads"), {
        connected: "Threads account connected.",
        denied: "Threads connection cancelled.",
        state_invalid: "Threads connection failed: security state mismatch. Try again.",
        code_invalid: "Threads connection failed: the code could not be exchanged.",
        oauth_failed: "Threads connection failed: app credentials are not configured.",
        not_authenticated: "Threads connection failed: you must be signed in.",
        workspace_missing: "Threads connection failed: no workspace found for your account.",
        connection_failed: "Threads connection failed. Please try again."
      }],
      [searchParams.get("instagram"), {
        connected: "Instagram Business or Creator account connected.",
        denied: "Instagram connection cancelled.",
        state_invalid: "Instagram connection failed: security state mismatch. Try again.",
        code_invalid: "Instagram connection failed: the authorization code could not be exchanged.",
        token_exchange_failed: "Instagram authorized the app, but token exchange failed. Check the Instagram Login credentials and redirect URI.",
        oauth_failed: "Instagram Login app credentials are not configured.",
        profile_unavailable: "Instagram connected, but Meta did not return a usable professional profile.",
        not_authenticated: "Instagram connection failed: you must be signed in.",
        workspace_missing: "Instagram connection failed: no workspace found for your account.",
        connection_failed: "Instagram connection failed. Check the Meta app configuration and try again."
      }]
    ];
    let message: string | null = null;
    for (const [code, mapping] of outcomes) {
      if (code && mapping[code]) {
        message = mapping[code];
        break;
      }
    }
    if (message) {
      triggerToast(message);
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function removeTeamMember(idx: number, email: string) {
    const member = teamMembers[idx];
    setLastRemovedMember({ member, index: idx });
    setTeamMembers((prev) => prev.filter((_, i) => i !== idx));
    triggerToast(`Removed ${email}`);
  }

  function undoRemoveMember() {
    if (!lastRemovedMember) return;
    const { member, index } = lastRemovedMember;
    setTeamMembers((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, member);
      return next;
    });
    setLastRemovedMember(null);
    triggerToast(`Restored ${member.email}`);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", tempProfile.name);
      formData.append("role", tempProfile.role);
      formData.append("bio", tempProfile.bio);
      const result = await updateProfile({ error: "" }, formData);
      if (result.error) {
        setProfileError(result.error);
        return;
      }
      // Apply live everywhere: the store drives the header, greeting and this page.
      setProfile({
        name: tempProfile.name,
        role: tempProfile.role,
        bio: tempProfile.bio
      });
      setIsProfileOpen(false);
      triggerToast("Profile updated successfully!");
    } finally {
      setProfileSaving(false);
    }
  }


  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    if (!passwords.current) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwords.newPass.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (passwords.newPass !== passwords.confirmPass) {
      setPasswordError("New passwords do not match. Recheck both fields.");
      return;
    }

    setPasswordSaving(true);
    try {
      const formData = new FormData();
      formData.append("current", passwords.current);
      formData.append("password", passwords.newPass);
      const result = await updatePassword({ error: "" }, formData);
      if (result.error) {
        setPasswordError(result.error);
        return;
      }

      setPasswordSuccess(true);
      triggerToast("Password changed successfully!");
      setTimeout(() => {
        setIsPasswordOpen(false);
        setPasswordSuccess(false);
        setPasswords({ current: "", newPass: "", confirmPass: "" });
      }, 1200);
    } finally {
      setPasswordSaving(false);
    }
  }

  function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    setInviteError("");
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setInviteError("Enter an email address."); return; }
    if (!emailRe.test(email)) { setInviteError("Enter a valid email (e.g. colleague@company.com)."); return; }
    if (teamMembers.some((m) => m.email.toLowerCase() === email)) { setInviteError("That email is already in the workspace."); return; }
    if (email === userEmail.toLowerCase()) { setInviteError("You are already the owner."); return; }
    setTeamMembers((prev) => [...prev, { name: email.split("@")[0], email, role: inviteRole }]);
    setInviteEmail("");
    triggerToast(`Saved a local invite draft for ${email}. No access was granted.`);
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") { setDeleteError("Type DELETE to confirm."); return; }
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok && res.status !== 404) throw new Error(data?.message || "Deletion failed.");

      // Preserve browser data on network/server errors. Clear only after the
      // server confirms deletion or explicitly requests the local-only fallback.
      try {
        localStorage.removeItem(teamStorageKey);
        localStorage.removeItem(notificationStorageKey);
        localStorage.removeItem(csvStorageKey);
        localStorage.removeItem("eduverse-dashboard-store");
        localStorage.removeItem("theme");
      } catch {}
      setDeleteSuccess(true);
      setServerDeleted(res.status !== 404);
      triggerToast(res.status === 404
        ? "Browser data cleared. Contact hello@eduverse.app to request permanent server deletion."
        : "Account deleted. Signing out…");
      setTimeout(() => { router.push("/login"); }, res.status === 404 ? 1500 : 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete account.";
      triggerToast(msg);
      setDeleteLoading(false);
    }
  }

  async function disconnectMetaAccount(account: MetaAccount) {
    const accountKey = `${account.platform}:${account.id}`;
    if (disconnectingAccount) return;
    setDisconnectingAccount(accountKey);
    setConnectedAccountsError("");
    try {
      const response = await fetch("/api/meta/connect", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || "Could not disconnect this account.");
      setMetaAccounts((accounts) => accounts.filter((item) => !(item.id === account.id && item.platform === account.platform)));
      window.dispatchEvent(new Event("eduverse:analytics-refresh"));
      triggerToast(`${account.name} disconnected.`);
    } catch (error) {
      setConnectedAccountsError(error instanceof Error ? error.message : "Could not disconnect this account.");
    } finally {
      setDisconnectingAccount(null);
    }
  }

  const connectedList = metaAccounts.map((account) => account.platform === "instagram" ? `${account.name} (${account.handle})` : account.name);

  return (
    <div className="space-y-6">
      <PageHeading
        description="Manage your personal settings, security, and connected accounts."
        eyebrow="Workspace preferences"
        title="Settings"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-background shadow-glass animate-in fade-in slide-in-from-bottom-5 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:left-auto sm:right-[calc(1.5rem+env(safe-area-inset-right))]">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
          <span>{toastMessage}</span>
          {lastRemovedMember && toastMessage.startsWith("Removed") && (
            <button onClick={undoRemoveMember} className="ml-1 rounded-lg bg-background/15 px-2.5 py-1 text-xs font-semibold text-background transition hover:bg-background/25 focus-visible:ring-2 focus-visible:ring-background focus-visible:outline-none">
              Undo
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardContent className="flex gap-4 p-5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UserRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Profile</p>
              <p className="mt-1 text-sm leading-6 text-mutedText">
                {userName} · {userRole}
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setTempProfile({ name: userName, role: userRole, email: userEmail, bio: userBio });
                  setIsProfileOpen(true);
                }}
                size="sm"
                variant="secondary"
              >
                Edit profile
              </Button>
            </div>
          </CardContent>
        </Card>


        {/* Password Card */}
        <Card>
          <CardContent className="flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Password</p>
              <p className="mt-1 text-sm leading-6 text-mutedText">
                Use a unique password and keep your recovery options current.
              </p>
              <Button className="mt-4" onClick={() => setIsPasswordOpen(true)} size="sm" variant="secondary">
                Change password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts Card */}
        <Card>
          <CardContent className="flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Connected accounts</p>
              <p className="mt-1 text-sm leading-6 text-mutedText">
                {metaAccountsLoading
                  ? "Checking your Meta connection…"
                  : metaAccountsLoadError
                    ? "Your connection status could not be checked."
                    : connectedList.length > 0
                  ? `${connectedList.join(", ")} loaded from Meta Graph API.`
                  : "No Facebook Page, Instagram Business or Creator account, or Threads account connected."}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-relaxed text-mutedText">
                <ShieldCheck className="h-3 w-3 text-success" /> Tokens AES-256-GCM encrypted ·{" "}
                <a href="/privacy" className="font-medium text-primary hover:underline">
                  Privacy & Data Security
                </a>
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setIsMetaConnectOpen(true)} size="sm" variant="secondary">
                  Connect Meta accounts
                </Button>
                <a
                  href="/privacy#revocation"
                  className="inline-flex items-center rounded-full border border-borderSoft bg-surface px-3 py-1.5 text-xs font-medium text-mutedText hover:text-ink"
                >
                  How to revoke →
                </a>
              </div>
              {metaAccountsLoadError && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-danger">
                  <p role="alert">Could not load connected accounts. Check your connection and try again.</p>
                  <button type="button" onClick={() => setMetaAccountsRetry((attempt) => attempt + 1)} className="rounded-lg border border-borderSoft px-3 py-1.5 font-semibold text-ink transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">Try again</button>
                </div>
              )}
              {connectedAccountsError && <p role="alert" className="mt-3 text-xs text-danger">{connectedAccountsError}</p>}
              {metaAccounts.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-borderSoft pt-3">
                  {metaAccounts.map((account) => {
                    const accountKey = `${account.platform}:${account.id}`;
                    return (
                      <li key={accountKey} className="flex items-center justify-between gap-3 rounded-xl border border-borderSoft bg-surface px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{account.name}</p>
                          <p className="text-[11px] capitalize text-mutedText">{account.platform} · {account.status.replaceAll("_", " ")}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void disconnectMetaAccount(account)}
                          disabled={disconnectingAccount !== null}
                          aria-label={`Disconnect ${account.name}`}
                          className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-danger transition hover:bg-danger/10 disabled:pointer-events-none disabled:opacity-50"
                        >
                          <Link2Off aria-hidden="true" className="h-3.5 w-3.5" />
                          {disconnectingAccount === accountKey ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card>
          <CardContent className="flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Notifications</p>
              <p className="mt-1 text-sm leading-6 text-mutedText">
                {notifications.weeklyReports || notifications.audienceSpikes || notifications.aiDigest
                  ? "Preferences saved in this browser. Email and alert delivery is not connected yet."
                  : "All notification preferences are off."}
              </p>
              <Button className="mt-4" onClick={() => setIsNotificationsOpen(true)} size="sm" variant="secondary">
                Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Read-aloud voice Card */}
        <Card>
          <CardHeader>
            <CardTitle>Read-aloud voice</CardTitle>
            <CardDescription>Choose the same voice for Listen and voice mode.</CardDescription>
          </CardHeader>
          <CardContent>
            <div role="group" aria-label="Read-aloud voice presentation" className="grid grid-cols-2 gap-2">
              {(["female", "male"] as const).map((presentation) => (
                <button
                  key={presentation}
                  type="button"
                  aria-pressed={ttsPresentation === presentation}
                  onClick={() => setTtsPresentation(presentation)}
                  className={`min-h-10 rounded-xl border px-3 text-sm font-medium capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${ttsPresentation === presentation ? "border-primary bg-primary/10 text-primary" : "border-borderSoft bg-surface text-mutedText hover:text-ink"}`}
                >
                  {presentation}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-mutedText">Saved in this browser for this account.</p>
          </CardContent>
        </Card>

        {/* Theme Card */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Use light, dark, or your system preference.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* Access Card */}
        <Card>
          <CardHeader>
            <CardTitle>Access</CardTitle>
            <CardDescription>{teamMembers.length - 1} local invite drafts. Only signed-in workspace members have access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsAccessOpen(true)} size="sm" variant="secondary">
              Manage invite drafts
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Card */}
        <Card className="border-danger/30">
          <CardContent className="flex gap-4 p-5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-danger">Delete account</p>
              <p className="mt-1 text-sm text-mutedText">
                Request deletion of your account and associated data. Shared workspaces owned by others remain available to their members.
              </p>
              <Button className="mt-4" onClick={() => setIsDeleteOpen(true)} size="sm" variant="secondary">
                Request account deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------- MODALS ----------------- */}

      {/* 1. Edit Profile Modal */}
      <Modal onOpenChange={setIsProfileOpen} open={isProfileOpen}>
        <ModalContent>
          <ModalTitle>Edit Profile</ModalTitle>
          <ModalDescription>Update your personal information and display title.</ModalDescription>
          <form className="mt-4 space-y-4" onSubmit={handleSaveProfile}>
            {profileError && (
              <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {profileError}
              </div>
            )}
            <div>
              <label htmlFor="profile-name" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Display Name
              </label>
              <input
                id="profile-name"
                name="name"
                autoComplete="name"
                className={SETTINGS_INPUT}
                onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                required
                value={tempProfile.name}
              />
            </div>
            <div>
              <label htmlFor="profile-role" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Role / Job Title
              </label>
              <input
                id="profile-role"
                name="role"
                autoComplete="organization-title"
                className={SETTINGS_INPUT}
                onChange={(e) => setTempProfile({ ...tempProfile, role: e.target.value })}
                required
                value={tempProfile.role}
              />
            </div>
            <div>
              <label htmlFor="profile-email" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Email Address
              </label>
              <input
                id="profile-email"
                name="email"
                type="email"
                autoComplete="email"
                spellCheck={false}
                className={`${SETTINGS_INPUT} opacity-60`}
                disabled
                value={tempProfile.email}
              />
            </div>
            <div>
              <label htmlFor="profile-bio" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Bio / Workspace Note
              </label>
              <textarea
                id="profile-bio"
                name="bio"
                className={SETTINGS_TEXTAREA}
                onChange={(e) => setTempProfile({ ...tempProfile, bio: e.target.value })}
                value={tempProfile.bio}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setIsProfileOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={profileSaving} type="submit" variant="primary">
                {profileSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </ModalContent>
      </Modal>

      {/* 2. Change Password Modal */}
      <Modal onOpenChange={setIsPasswordOpen} open={isPasswordOpen}>
        <ModalContent>
          <ModalTitle>Change Password</ModalTitle>
          <ModalDescription>Ensure your account remains secure with a strong password.</ModalDescription>
          {passwordSuccess ? (
            <div className="my-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <p className="mt-2 font-semibold">Password updated!</p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
              {passwordError && (
                <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                  {passwordError}
                </div>
              )}
              <div>
                <label htmlFor="password-current" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                  Current Password
                </label>
                <input
                  id="password-current"
                  name="current-password"
                  autoComplete="current-password"
                  className={SETTINGS_INPUT}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  required
                  type="password"
                  value={passwords.current}
                />
              </div>
              <div>
                <label htmlFor="password-new" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                  New Password
                </label>
                <input
                  id="password-new"
                  name="new-password"
                  autoComplete="new-password"
                  className={SETTINGS_INPUT}
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  placeholder="At least 8 characters…"
                  required
                  type="password"
                  value={passwords.newPass}
                />
              </div>
              <div>
                <label htmlFor="password-confirm" className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                  Confirm New Password
                </label>
                <input
                  id="password-confirm"
                  name="confirm-password"
                  autoComplete="new-password"
                  className={SETTINGS_INPUT}
                  onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                  required
                  type="password"
                  value={passwords.confirmPass}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setIsPasswordOpen(false)} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button disabled={passwordSaving} type="submit" variant="primary">
                  {passwordSaving ? "Updating…" : "Update password"}
                </Button>
              </div>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* 3. Live Meta account connection */}
      <MetaConnectModal
        isOpen={isMetaConnectOpen}
        onClose={() => setIsMetaConnectOpen(false)}
        onConnected={(accounts) => {
          setMetaAccounts(accounts);
          triggerToast(accounts.length > 0 ? "Meta accounts loaded from Graph API." : "No linked Meta accounts found.");
        }}
      />

      {/* 4. Notification Preferences Modal */}
      <Modal onOpenChange={setIsNotificationsOpen} open={isNotificationsOpen}>
        <ModalContent>
          <ModalTitle>Notification Preferences</ModalTitle>
          <ModalDescription>Choose what you want to hear about. These choices are saved in this browser; email and alert delivery is not connected yet, so nothing is sent.</ModalDescription>
          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold">Weekly Performance Email Reports</p>
                <p className="text-xs text-mutedText">Summary of audience signals & top content</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-borderSoft accent-primary"
                checked={notifications.weeklyReports}
                onChange={(e) => {
                  setNotifications({ ...notifications, weeklyReports: e.target.checked });
                  triggerToast("Weekly reports setting updated.");
                }}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold">Audience Spike Alerts</p>
                <p className="text-xs text-mutedText">Instant alerts when engagement surges +20%</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-borderSoft accent-primary"
                checked={notifications.audienceSpikes}
                onChange={(e) => {
                  setNotifications({ ...notifications, audienceSpikes: e.target.checked });
                  triggerToast("Audience spike alert setting updated.");
                }}
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-semibold">AI Content Recommendation Digest</p>
                <p className="text-xs text-mutedText">Fresh topics tailored to your niche</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-borderSoft accent-primary"
                checked={notifications.aiDigest}
                onChange={(e) => {
                  setNotifications({ ...notifications, aiDigest: e.target.checked });
                  triggerToast("AI digest setting updated.");
                }}
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsNotificationsOpen(false)} variant="primary">
              Done
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* 5. Workspace Access Modal */}
      <Modal onOpenChange={setIsAccessOpen} open={isAccessOpen}>
        <ModalContent className="max-w-lg">
          <ModalTitle>Workspace Access & Members</ModalTitle>
          <ModalDescription>These are browser-local invite drafts only. They do not send email or grant workspace access.</ModalDescription>

          <form className="mt-4 flex gap-2" onSubmit={handleInviteMember} noValidate>
            <label className="sr-only" htmlFor="invite-email">Invite email</label>
            <input
              id="invite-email"
              name="invite-email"
              className="h-10 flex-1 rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-borderSoft dark:bg-surface/[0.04]"
              onChange={(e) => { setInviteEmail(e.target.value); if (inviteError) setInviteError(""); }}
              placeholder="colleague@company.com…"
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={inviteEmail}
              aria-invalid={Boolean(inviteError)}
              aria-describedby={inviteError ? "invite-error" : undefined}
            />
            <label className="sr-only" htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              name="invite-role"
              className="h-10 rounded-xl border border-borderSoft bg-surface px-2 text-xs outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-borderSoft dark:bg-surface/[0.04]"
              onChange={(e) => setInviteRole(e.target.value)}
              value={inviteRole}
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
            <Button size="sm" type="submit" variant="primary">
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              Save draft
            </Button>
          </form>
          {inviteError && <p id="invite-error" className="mt-2 text-xs text-danger">{inviteError}</p>}
          <p className="mt-1 text-[10px] text-mutedText">Drafts stay in this browser. Invite delivery and access management are not configured.</p>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-faintText">Signed-in account and local drafts</p>
            {teamMembers.map((m, idx) => (
              <div
                className="flex items-center justify-between rounded-xl border border-borderSoft p-3 text-sm dark:border-borderSoft"
                key={`${m.email}-${idx}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{m.name}</p>
                  <p className="text-xs text-mutedText truncate">{m.email}</p>
                  {idx !== 0 && <span className="mt-1 inline-flex rounded-full bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-medium text-warning-ink">Draft only — no access</span>}
                </div>
                <div className="ml-2 flex items-center gap-2 shrink-0">
                  <Badge variant={m.role === "Owner" ? "primary" : "default"}>{m.role}</Badge>
                  {idx !== 0 && (
                    <button onClick={() => removeTeamMember(idx, m.email)} aria-label={`Remove ${m.email}`} className="rounded-full p-2 text-mutedText hover:bg-surface hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:outline-none"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => setIsAccessOpen(false)} variant="ghost">
              Close
            </Button>
          </div>
        </ModalContent>
      </Modal>

      {/* 6. Delete Account Modal — now honest, clears local + attempts server delete */}
      <Modal onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
        <ModalContent>
          <ModalTitle className="text-danger">Delete Account & Workspace</ModalTitle>
          <ModalDescription>
            Requests server-side account deletion. Browser data is cleared only after the server confirms deletion or returns its local-only fallback. Contact hello@eduverse.app if permanent deletion is unavailable.
          </ModalDescription>
          {deleteSuccess ? (
            <div className="my-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <p className="mt-2 font-semibold text-success">{serverDeleted ? "Account deleted — signing out…" : "Browser data cleared — signing out…"}</p>
              {!serverDeleted && <p className="mt-1 text-xs text-mutedText">Contact hello@eduverse.app to request permanent server deletion.</p>}
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleDeleteAccount}>
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
                Type <strong>DELETE</strong> to request account deletion. Browser data is retained if the request fails.
              </div>
              <label className="sr-only" htmlFor="delete-confirm">Type DELETE to confirm</label>
              <input
                id="delete-confirm"
                name="delete-confirm"
                aria-invalid={Boolean(deleteError)}
                aria-describedby={deleteError ? "delete-error" : undefined}
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
              className="h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none transition focus-visible:border-danger focus-visible:ring-2 focus-visible:ring-danger/50"
                onChange={(e) => { setDeleteConfirmText(e.target.value); if (deleteError) setDeleteError(""); }}
                placeholder="Type DELETE…"
                value={deleteConfirmText}
              />
              {deleteError && (
                <p id="delete-error" role="alert" className="text-xs text-danger">{deleteError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setIsDeleteOpen(false)} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={deleteLoading}
                  type="submit"
                  variant="primary"
                  className="bg-danger hover:bg-danger/90 text-background"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  {deleteLoading ? "Clearing…" : "Confirm Deletion"}
                </Button>
              </div>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
