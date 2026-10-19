import { Suspense, lazy, useEffect, useState } from 'react';
import { getFirebase, isAdminEmail } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { useAppConfig } from './hooks/useAppConfig';
import { useTheme } from './hooks/useTheme';
import { LoginScreen } from './components/auth/LoginScreen';
import { OnboardingScreen } from './components/auth/OnboardingScreen';
import { SetupScreen } from './components/auth/SetupScreen';
import { ErrorScreen } from './components/auth/ErrorScreen';
import { Splash } from './components/auth/Splash';
import RoomApp from './RoomApp';

const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

type ThemeApi = ReturnType<typeof useTheme>;

/** Browser storage left behind by older builds (guest / test sessions, local ledgers) — wiped on every start. */
const LEGACY_KEYS = ['rk.demo.active', 'rk.demo.v1', 'rk.demo.v2', 'rk.demo.me', 'rk.data.v1', 'rk.me'];

/**
 * Strict Google authentication gate — there is no guest or test path:
 *   no Firebase config → Login → one-time Setup
 *   loading → Login (Google only) → (new user / no room) Onboarding → Dashboard
 */
export default function App() {
  const theme = useTheme();
  useEffect(() => {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  }, []);

  if (!getFirebase()) return <NoFirebase />;
  return <Gate {...theme} />;
}

/** No Firebase project configured yet: the login screen leads to the one-time Firebase setup */
function NoFirebase() {
  const [setup, setSetup] = useState(false);
  if (setup) return <SetupScreen onBack={() => setSetup(false)} />;
  return (
    <div key="login" className="anim-fade">
      <LoginScreen busy={false} error="" needsSetup onSignIn={() => setSetup(true)} />
    </div>
  );
}

function Gate({ theme, toggleTheme }: ThemeApi) {
  const auth = useAuth();
  const config = useAppConfig(auth.phase === 'in');
  const [adminOpen, setAdminOpen] = useState(false);

  if (auth.phase === 'loading') return <Splash label="Checking your session…" />;

    if (auth.phase === 'out' || !auth.user) {
    return (
      <div key="login" className="anim-fade">
        <LoginScreen
          busy={auth.busy}
          error={auth.error}
          onSignIn={auth.signIn}
          onSignUp={auth.signUp}
        />
      </div>
    );
  }

  const { profile, user } = auth;
  const isAdmin = isAdminEmail(user.email, user.emailVerified);

  if (!profile) {
    if (auth.error) {
      return (
        <ErrorScreen
          title="Couldn’t load your profile"
          message={auth.error}
          onRetry={() => window.location.reload()}
          retryLabel="Reload"
          onSignOut={() => void auth.signOut()}
        />
      );
    }
    return <Splash label="Loading your profile…" />;
  }

  // No active room → clean slate: Create Room / Join with Room Code
  if (!profile.currentRoomCode) {
    return (
      <div key="onboarding" className="anim-fade">
        <OnboardingScreen
          user={user}
          profile={profile}
          onSaveProfile={auth.updateProfile}
          onSignOut={() => void auth.signOut()}
          onOpenAdmin={isAdmin ? () => setAdminOpen(true) : undefined}
        />
        {isAdmin && adminOpen && (
          <Suspense fallback={<Splash label="Opening admin panel…" />}>
            <AdminPanel
              user={{ uid: user.uid, email: user.email, emailVerified: user.emailVerified }}
              config={config}
              onClose={() => setAdminOpen(false)}
            />
          </Suspense>
        )}
      </div>
    );
  }

  return <RoomApp key={profile.currentRoomCode} auth={auth} config={config} theme={theme} toggleTheme={toggleTheme} />;
}
