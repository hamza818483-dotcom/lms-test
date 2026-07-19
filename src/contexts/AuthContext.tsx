import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { apiLogin, apiSignup } from "@/lib/d1-api";

interface Profile {
  id: string;
  registration_id: string;
  full_name: string | null;
  phone: string | null;
  school: string | null;
  batch_year: number | null;
  status?: string | null;
  father_name?: string | null;
  mother_name?: string | null;
  hsc_batch?: string | null;
  college_name?: string | null;
  ssc_gpa?: number | null;
  hsc_gpa?: number | null;
  omr_roll_no?: string | null;
  omr_reg_no?: string | null;
}

interface SimpleUser {
  id: string;
  email: string;
  phone?: string | null;
}

interface AuthContextType {
  user: SimpleUser | null;
  session: { user: SimpleUser } | null;
  profile: Profile | null;
  isAdmin: boolean;
  isTeacher: boolean;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signIn: (identifier: string, password: string, captchaToken?: string) => Promise<{ error: any }>;
  signOut: (forced?: boolean) => Promise<void>;
  signUp: (payload: { email: string; password: string; full_name?: string; phone?: string }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const STORAGE_KEY = "d1_auth_session";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Restore session from localStorage on load
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed.user);
        setProfile(parsed.profile);
        setIsAdmin(parsed.role === "admin");
        setIsTeacher(parsed.role === "moderator");
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (identifier: string, password: string, _captchaToken?: string) => {
    try {
      const { ok, data } = await apiLogin(identifier, password);
      if (!ok || data.error) {
        return { error: { message: data.error || "Invalid registration ID or password" } };
      }

      if (data.profile?.status === "banned") {
        return { error: { message: "Account is banned" } };
      }

      setUser(data.user);
      setProfile(data.profile);
      setIsAdmin(data.role === "admin");
      setIsTeacher(data.role === "moderator");

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      return { error: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { error: { message: error.message || "Invalid registration ID or password" } };
    }
  }, []);

  const signUp = useCallback(async (payload: { email: string; password: string; full_name?: string; phone?: string }) => {
    try {
      const { ok, data } = await apiSignup(payload);
      if (!ok || data.error) {
        return { error: { message: data.error || "Registration failed" } };
      }
      return { error: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      return { error: { message: error.message || "Registration failed" } };
    }
  }, []);

  const signOut = useCallback(async (forced: boolean = false) => {
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsTeacher(false);
    localStorage.removeItem(STORAGE_KEY);

    if (forced) {
      window.location.href = "/login?reason=session_mismatch";
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session: user ? { user } : null,
        profile,
        isAdmin,
        isTeacher,
        loading,
        signIn,
        signOut,
        signUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
