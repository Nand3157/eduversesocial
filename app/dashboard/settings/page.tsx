"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

export default function SettingsPage() {
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
  const [teamMembers, setTeamMembers] = useState([
    { name: userName, email: userEmail, role: "Owner" }
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Member");

  // Account deletion state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState(false);

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
      setPasswordError("New passwords do not match.");
      return;
    }

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
  }

  function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setTeamMembers((prev) => [...prev, { name: inviteEmail.split("@")[0], email: inviteEmail, role: inviteRole }]);
    setInviteEmail("");
    triggerToast(`Invitation sent to ${inviteEmail}`);
  }

  function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    setDeleteSuccess(true);
    triggerToast("Account deletion request submitted.");
    setTimeout(() => {
      setIsDeleteOpen(false);
      setDeleteSuccess(false);
      setDeleteConfirmText("");
    }, 2000);
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
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-background shadow-glass animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardContent className="flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
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
              <Button className="mt-4" onClick={() => setIsMetaConnectOpen(true)} size="sm" variant="secondary">
                Connect Meta accounts
              </Button>
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

        {/* Delete Account Card */}
        <Card className="border-danger/30">
          <CardContent className="flex gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger dark:bg-red-400/10">
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
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                {profileError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Display Name
              </label>
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
                onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                required
                value={tempProfile.name}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Role / Job Title
              </label>
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
                onChange={(e) => setTempProfile({ ...tempProfile, role: e.target.value })}
                required
                value={tempProfile.role}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Email Address
              </label>
              <input
                className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none"
                disabled
                value={tempProfile.email}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                Bio / Workspace Note
              </label>
              <textarea
                className="mt-1.5 h-20 w-full rounded-xl border border-borderSoft bg-surface p-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
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
                <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-red-700 dark:border-red-400/20 dark:bg-red-400/10 text-danger">
                  {passwordError}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                  Current Password
                </label>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  required
                  type="password"
                  value={passwords.current}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                  New Password
                </label>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
                  onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                  placeholder="At least 8 characters"
                  required
                  type="password"
                  value={passwords.newPass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-faintText">
                  Confirm New Password
                </label>
                <input
                  className="mt-1.5 h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
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
                <Button type="submit" variant="primary">
                  Update password
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
          <ModalDescription>Manage team permissions and invite collaborators.</ModalDescription>

          <form className="mt-4 flex gap-2" onSubmit={handleInviteMember}>
            <input
              className="h-10 flex-1 rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-primary focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              type="email"
              value={inviteEmail}
            />
            <select
              className="h-10 rounded-xl border border-borderSoft bg-surface px-2 text-xs outline-none dark:border-borderSoft dark:bg-surface/[0.04]"
              onChange={(e) => setInviteRole(e.target.value)}
              value={inviteRole}
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
            <Button size="sm" type="submit" variant="primary">
              <UserPlus className="h-4 w-4" />
              Invite
            </Button>
          </form>

          <div className="mt-5 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-faintText">Team Members</p>
            {teamMembers.map((m, idx) => (
              <div
                className="flex items-center justify-between rounded-xl border border-borderSoft p-3 text-sm dark:border-borderSoft"
                key={idx}
              >
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-xs text-mutedText">{m.email}</p>
                </div>
                <Badge variant={m.role === "Owner" ? "primary" : "default"}>{m.role}</Badge>
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

      {/* 6. Delete Account Modal */}
      <Modal onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
        <ModalContent>
          <ModalTitle className="text-danger">Delete Account & Workspace</ModalTitle>
          <ModalDescription>
            This action cannot be undone. All social metrics, post drafts, and audience memory will be erased.
          </ModalDescription>
          {deleteSuccess ? (
            <div className="my-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-danger" />
              <p className="mt-2 font-semibold text-danger">Account deletion request received.</p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleDeleteAccount}>
              <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-red-700 dark:border-red-400/20 dark:bg-red-400/10 text-danger">
                To confirm deletion, type <strong>DELETE</strong> below.
              </div>
              <input
                className="h-10 w-full rounded-xl border border-borderSoft bg-surface px-3 text-sm outline-none ring-red-500 focus:ring-2 dark:border-borderSoft dark:bg-surface/[0.04]"
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                value={deleteConfirmText}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button onClick={() => setIsDeleteOpen(false)} type="button" variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                  type="submit"
                  variant="primary"
                  className="bg-danger hover:bg-danger/90 text-background"
                >
                  <Trash2 className="h-4 w-4" />
                  Confirm Deletion
                </Button>
              </div>
            </form>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
