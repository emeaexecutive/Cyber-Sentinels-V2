import { redirect } from "next/navigation";
import { PASSWORD_RECOVERY_PATH } from "@/lib/auth/password-recovery";

export default function LegacyResetPasswordPage() {
  redirect(PASSWORD_RECOVERY_PATH);
}
