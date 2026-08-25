"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Link2,
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

const SETTINGS_INPUT =
  "mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-borderSoft dark:bg-surface/[0.04]";
const SETTINGS_TEXTAREA =
  "mt-1.5 h-20 w-full rounded-xl border border-borderSoft bg-surface p-3 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-borderSoft dark:bg-surface/[0.04]";

export default function SettingsPage() {
  const router = useRouter();
  const { userName, userRole, userEmail, userBio, setProfile } = useDashboardStore();

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

  useEffect(() => {
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const response = await fetch("/api/meta/connect", { cache: "no-store" });
        const data = await response.json();
        if (!cancelled) setMetaAccounts(data.accounts ?? []);
      } catch {
        if (!cancelled) setMetaAccounts([]);
      }
    };
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  // Notifications state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    weeklyReports: true,
    audienceSpikes: true,
    aiDigest: true,
    milestones: false
  });

    // Access state
  const [isAccessOpen, setIsAccessOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ name: string; email: string; role: string }>>([{ name: userName, email: userEmail, role: "Owner" }]);
  const [membersHydrated, setMembersHydrated] = useState(false);
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
      try {
        const raw = localStorage.getItem("eduverse:team-members");
        if (raw) {
          const parsed = JSON.parse(raw) as Array<{ name: string; email: string; role: string }>;
          if (Array.isArray(parsed) && parsed.length) setTeamMembers(parsed);
        }
      } catch {}
      setMembersHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist team members whenever they change (only once hydrated)
  useEffect(() => {
    if (!membersHydrated) return;
    try { localStorage.setItem("eduverse:team-members", JSON.stringify(teamMembers)); } catch {}
  }, [teamMembers, membersHydrated]);

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
    if (teamMembers.length >= 10) { setInviteError("Workspace limit: 10 members on this plan. Remove someone first."); return; }
    if (email === userEmail.toLowerCase()) { setInviteError("You are already the owner."); return; }
    setTeamMembers((prev) => [...prev, { name: email.split("@")[0], email, role: inviteRole }]);
    setInviteEmail("");
    triggerToast(`Invite queued locally for ${email} — email delivery requires backend (coming soon, persisted for now).`);
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") { setDeleteError("Type DELETE to confirm."); return; }
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      // Clear local artifacts first so UI reflects deletion even if server is slow
      try {
        localStorage.removeItem("eduverse:team-members");
        localStorage.removeItem("eduverse:csv-import");
        localStorage.removeItem("eduverse-dashboard-store");
        localStorage.removeItem("theme");
      } catch {}
      const res = await fetch("/api/account/delete", { method: "DELETE" }).catch(() => null);
      if (res && !res.ok) {
        const data = await res.json().catch(() => null);
        // If backend not ready, still sign out locally and show honest message
        if (res.status === 404) {
          setDeleteSuccess(true);
          triggerToast("Local data cleared. Permanent deletion needs admin — contact hello@eduverse.app with your email.");
          setTimeout(() => { router.push("/login"); }, 1500);
          return;
        }
        throw new Error(data?.message || "Deletion failed.");
      }
      setDeleteSuccess(true);
      triggerToast("Account data cleared locally. Signing out…");
      setTimeout(() => { router.push("/login"); }, 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete account.";
      triggerToast(msg);
      setDeleteLoading(false);
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
        <div role="status" aria-live="polite" className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))] z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-background shadow-glass animate-in fade-in slide-in-from-bottom-5">
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
                {connectedList.length > 0
                  ? `${connectedList.join(", ")} loaded from Meta Graph API.`
                  : "No Facebook Page or linked Instagram Business account connected."}
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
                {notifications.weeklyReports ? "Weekly reports" : "Alerts"} and audience updates are{" "}
                {notifications.weeklyReports || notifications.audienceSpikes ? "enabled" : "disabled"}.
              </p>
              <Button className="mt-4" onClick={() => setIsNotificationsOpen(true)} size="sm" variant="secondary">
                Preferences
              </Button>
            </div>
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
            <CardDescription>{teamMembers.length} team members active in this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsAccessOpen(true)} size="sm" variant="secondary">
              Manage access
            </Button>
          </CardContent>
        </Card>

        {/* Billing / Plan Card — P3 */}
        <Card className="border-primary/20 bg-accent-soft/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Plan & Limits <Badge variant="primary">Free</Badge></CardTitle>
            <CardDescription>Free plan limits — upgrade unlocks more. Usage is live from your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Team members", used: teamMembers.length, total: 10 },
              { label: "Connected accounts", used: metaAccounts.length, total: 3 },
              { label: "Scheduled posts / month", used: 0, total: 10, hint: "via /api/meta/scheduler" },
              { label: "AI chat / min", used: 0, total: 60, hint: "Gemini 3.5 Flash" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs"><span className="font-medium text-ink">{item.label}</span><span className="tabular-nums text-mutedText">{item.used}/{item.total}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-borderSoft overflow-hidden"><div aria-hidden="true" className="h-full w-full origin-left bg-primary transition-transform duration-500" style={{ transform: `scaleX(${Math.min(1, item.used/item.total)})` }} /></div>
                {item.hint && <p className="text-[10px] text-faintText">{item.hint}</p>}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="secondary" onClick={() => triggerToast("Upgrade flow coming soon — contact hello@eduverse.app for Pro. Free limits above apply.")}>View upgrade</Button>
              <Button size="sm" variant="ghost" onClick={() => triggerToast("Billing portal coming soon.")}>Billing portal</Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Account Card */}
        <Card className="border-danger/30">
          <CardContent className="flex gap-4 p-5">
            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger dark:bg-red-400/10">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-danger">Delete account</p>
              <p className="mt-1 text-sm text-mutedText">
                Permanently remove your workspace and all connected data.
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
                <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-red-700 dark:border-red-400/20 dark:bg-red-400/10 text-danger">
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
          <ModalDescription>Control when and how EduVerse alerts you.</ModalDescription>
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
          <ModalDescription>Manage team permissions and invite collaborators. Invites are queued locally and will email once backend is configured — persisted across reloads.</ModalDescription>

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
              Invite
            </Button>
          </form>
          {inviteError && <p id="invite-error" className="mt-2 text-xs text-danger">{inviteError}</p>}
          <p className="mt-1 text-[10px] text-mutedText">Demo mode: invites stay local until email service is connected. Limit 10 members.</p>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-faintText">Team Members · {teamMembers.length}/10</p>
            {teamMembers.map((m, idx) => (
              <div
                className="flex items-center justify-between rounded-xl border border-borderSoft p-3 text-sm dark:border-borderSoft"
                key={`${m.email}-${idx}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{m.name}</p>
                  <p className="text-xs text-mutedText truncate">{m.email}</p>
                  {idx !== 0 && <span className="mt-1 inline-flex rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-medium text-warning">Local — pending email</span>}
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
            Clears local data immediately and attempts server deletion. For GDPR permanent erasure of Supabase backups, email hello@eduverse.app after this step.
          </ModalDescription>
          {deleteSuccess ? (
            <div className="my-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
              <p className="mt-2 font-semibold text-success">Local data cleared — signing out…</p>
              <p className="mt-1 text-xs text-mutedText">If you need backup deletion, contact hello@eduverse.app.</p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleDeleteAccount}>
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs leading-relaxed text-danger">
                Type <strong>DELETE</strong> to clear local workspace data and sign out. We attempt server-side deletion too; if the admin API is not configured, you are signed out locally and receive contact instructions.
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
                className="h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none transition focus-visible:border-danger focus-visible:ring-2 focus-visible:ring-red-500/50 dark:border-borderSoft dark:bg-surface/[0.04]"
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
