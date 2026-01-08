// src/services/branchContext.ts
export const BRANCH_KEY = "activeBranchId"; // "all" | "<id>"

// ✅ Raw value for UI dropdown
export function getActiveBranchRaw(user: any): string {
  const role = String(user?.role || "").toUpperCase();
  const userBranch = user?.branchId ? String(user.branchId) : "";

  if (role === "STAFF") return userBranch || ""; // staff must have branchId

  // ADMIN/MANAGER
  const saved = localStorage.getItem(BRANCH_KEY);
  return saved && saved.length ? saved : "all";
}

// ✅ Effective value for API (null = ALL)
export function getEffectiveBranchId(user: any): string | null {
  const role = String(user?.role || "").toUpperCase();
  const userBranch = user?.branchId ? String(user.branchId) : "";

  if (role === "STAFF") return userBranch || null;

  const raw = getActiveBranchRaw(user);
  if (!raw || raw === "all") return null;
  return raw;
}

export function setActiveBranchId(id: string) {
  localStorage.setItem(BRANCH_KEY, id); // id = "all" or real branch _id
}

export function getActiveBranchId(user?: any): string {
  // Return saved branchId if present; for STAFF fall back to user's branchId; otherwise default to "all"
  const saved = localStorage.getItem(BRANCH_KEY);
  if (user?.role === "STAFF") {
    return saved || user.branchId || "all";
  }
  return saved || "all";
}