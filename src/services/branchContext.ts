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

export function getActiveBranchId(user: any): string {
  const role = String(user?.role || "").toUpperCase();
  const userBranch = user?.branchId ? String(user.branchId) : "";

  if (role === "STAFF") return userBranch; // STAFF khóa theo branchId
  const saved = localStorage.getItem(BRANCH_KEY);
  return saved && saved.length ? saved : "all"; // ADMIN/MANAGER cho all
}

/**
 * POS bắt buộc 1 cửa hàng:
 * - STAFF: branchId user
 * - ADMIN/MANAGER: lấy từ localStorage nếu có, nếu không => "" (bắt chọn)
 */
export function getPosBranchId(user: any): string {
  const role = String(user?.role || "").toUpperCase();
  const userBranch = user?.branchId ? String(user.branchId) : "";

  if (role === "STAFF") return userBranch;

  const saved = localStorage.getItem(BRANCH_KEY);
  if (saved && saved !== "all") return saved; // dùng lại key nhưng không cho all
  return "";
}
