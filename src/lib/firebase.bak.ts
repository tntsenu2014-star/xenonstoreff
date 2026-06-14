import { getFirestore } from './firestore-compat';
// removed top-level imports causing ReferenceError

// ... (keep the User mock type for now as other files depend on it) ...

export function initializeApp(config?: any) {
  return { name: 'mock-firebase-app', config };
}

// === firebase/auth Mock ===
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous?: boolean;
  tenantId?: string | null;
  providerData?: {
    providerId: string;
    email: string | null;
  }[];
}

let currentMockUser: User | null = null;
const authListeners = new Set<(user: User | null) => void>();

// Read initial auth state from localStorage
try {
  const stored = localStorage.getItem('authUser');
  if (stored) {
    currentMockUser = JSON.parse(stored);
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (urlParams.get('apiKey') === 'mock-magic-link' && emailParam) {
      currentMockUser = {
        uid: 'user_' + emailParam.replace(/[^a-zA-Z0-9]/g, '_'),
        email: emailParam,
        displayName: emailParam.split('@')[0],
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100',
        emailVerified: true,
        providerData: [{ providerId: 'email', email: emailParam }]
      };
      localStorage.setItem('authUser', JSON.stringify(currentMockUser));
    }
  }
} catch (e) {
  console.error("Local storage auth read failed:", e);
}

export const auth = {
  get currentUser() {
    return currentMockUser;
  },
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(this, callback);
  }
};

export function getAuth(app?: any) {
  return auth;
}

export function onAuthStateChanged(authInstance: any, callback: (user: User | null) => void) {
  authListeners.add(callback);
  // Immediate trigger
  callback(currentMockUser);
  return () => {
    authListeners.delete(callback);
  };
}

export async function updateProfile(userInstance: any, updates: { photoURL?: string | null; displayName?: string | null }) {
  if (currentMockUser) {
    if (updates.photoURL !== undefined) currentMockUser.photoURL = updates.photoURL;
    if (updates.displayName !== undefined) currentMockUser.displayName = updates.displayName;
    localStorage.setItem('authUser', JSON.stringify(currentMockUser));
    authListeners.forEach(listener => listener({ ...currentMockUser }));
  }
}

export class GoogleAuthProvider {
  // Empty mock class
}

export async function signInWithPopup(authInstance: any, provider?: any) {
  return new Promise<{ user: User }>((resolve, reject) => {
    // Create container
    const container = document.createElement('div');
    container.id = 'google-signin-mock-modal-root';
    
    // Check if theme or dark mode is applied
    const isDark = document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
    if (isDark) {
      container.classList.add('dark');
    }

    container.innerHTML = `
      <style>
        @keyframes fadeInPopup {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-popup {
          animation: fadeInPopup 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      </style>
      <div class="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-sans select-none">
        <div class="w-full max-w-md bg-white dark:bg-[#0d0d0f] border border-gray-100 dark:border-white/10 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative animate-fade-in-popup transition-colors duration-300">
          
          <!-- Header -->
          <div class="text-center mb-5">
            <div class="inline-flex items-center justify-center p-3 bg-gray-50 dark:bg-white/5 rounded-2xl mb-3">
              <!-- Google colored Logo -->
              <svg class="h-7 w-7" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </div>
            <h2 class="text-xl font-black tracking-tight text-gray-900 dark:text-white">Xenon Store</h2>
            <p class="text-gray-400 dark:text-gray-500 font-bold text-[9px] uppercase tracking-widest mt-1">Select authentication method</p>
          </div>

          <!-- Tabs Switcher -->
          <div class="flex border-b border-gray-100 dark:border-white/10 mb-5 font-bold text-xs uppercase tracking-widest text-center">
            <button type="button" id="tab-login-btn" class="flex-1 pb-2.5 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 transition-all cursor-pointer font-extrabold">Log In</button>
            <button type="button" id="tab-register-btn" class="flex-1 pb-2.5 text-gray-400 dark:text-gray-500 border-b-2 border-transparent transition-all cursor-pointer font-extrabold">Register</button>
          </div>

          <!-- LOGIN CONTENT -->
          <div id="content-login" class="block space-y-4">
            <!-- Accounts Selector -->
            <div class="space-y-2 mb-4 max-h-[190px] overflow-y-auto pr-1">
              
              <button type="button" class="google-acc-btn w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all text-left group cursor-pointer border border-transparent hover:border-blue-500/10" data-email="tntsenu2014@gmail.com" data-name="Miyula Senu">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0">
                    M
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Miyula Senu</div>
                    <div class="text-[9px] text-gray-400 dark:text-gray-500 font-bold font-mono truncate">tntsenu2014@gmail.com</div>
                  </div>
                </div>
                <span class="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button type="button" class="google-acc-btn w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all text-left group cursor-pointer border border-transparent hover:border-emerald-500/10" data-email="bloovalk@gmail.com" data-name="Xenon Store Admin">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                    X
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-xs text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Xenon Store Admin</div>
                    <div class="text-[9px] text-gray-400 dark:text-gray-500 font-bold font-mono truncate">bloovalk@gmail.com</div>
                  </div>
                </div>
                <span class="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button type="button" class="google-acc-btn w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-all text-left group cursor-pointer border border-transparent hover:border-violet-500/10" data-email="gamingremo2010@gmail.com" data-name="Gaming Demo">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black text-xs shrink-0">
                    G
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-xs text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Gaming Demo</div>
                    <div class="text-[9px] text-gray-400 dark:text-gray-500 font-bold font-mono truncate">gamingremo2010@gmail.com</div>
                  </div>
                </div>
                <span class="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0 group-hover:translate-x-1 transition-transform">→</span>
              </button>

            </div>

            <!-- Divider -->
            <div class="relative flex items-center py-1">
              <div class="flex-grow border-t border-gray-100 dark:border-white/10"></div>
              <span class="flex-shrink mx-3 text-gray-400 dark:text-gray-500 text-[8px] font-black uppercase tracking-widest">Or login with registered email</span>
              <div class="flex-grow border-t border-gray-100 dark:border-white/10"></div>
            </div>

            <!-- Custom email login flow -->
            <form id="google-login-custom-form" class="space-y-4">
              <input 
                type="email" 
                id="google-login-custom-email"
                placeholder="example@gmail.com" 
                required
                class="w-full h-11 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 tracking-wide text-xs"
              />
              <input 
                type="password" 
                id="google-login-custom-pass"
                placeholder="password" 
                required
                class="w-full h-11 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 tracking-wide text-xs"
              />
              
              <div class="flex items-center gap-2">
                <button 
                  type="button" 
                  id="google-login-cancel"
                  class="flex-1 h-11 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-bold uppercase tracking-widest text-[9px] transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  class="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/20 transition-all cursor-pointer text-center"
                >
                  Log In
                </button>
              </div>
            </form>
          </div>

          <!-- REGISTER CONTENT -->
          <div id="content-register" class="hidden">
            <form id="google-register-form" class="space-y-3.5">
              <div>
                <label class="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">Full Name</label>
                <input 
                  type="text" 
                  id="reg-name" 
                  placeholder="Miyula Senu" 
                  required 
                  class="w-full h-11 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-xs" 
                />
              </div>

              <div>
                <label class="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">Email Address</label>
                <input 
                  type="email" 
                  id="reg-email" 
                  placeholder="example@gmail.com" 
                  required 
                  class="w-full h-11 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-xs" 
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">WhatsApp Number</label>
                  <input 
                    type="text" 
                    id="reg-whatsapp" 
                    placeholder="+94 77 XXXXXXX" 
                    class="w-full h-11 px-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-emerald-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-xs" 
                  />
                </div>
                <div>
                  <label class="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">Player ID (UID)</label>
                  <input 
                    type="text" 
                    id="reg-playerid" 
                    placeholder="23145678" 
                    class="w-full h-11 px-3 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-xs" 
                  />
                </div>
              </div>

              <div>
                <label class="block text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 px-0.5">Password</label>
                <input 
                  type="password" 
                  id="reg-password" 
                  placeholder="********" 
                  required 
                  class="w-full h-11 px-4 rounded-xl border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:border-blue-500 focus:bg-white dark:focus:bg-white/10 outline-none transition-all font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-xs" 
                />
              </div>

              <div class="flex items-center gap-2 pt-2">
                <button 
                  type="button" 
                  id="google-register-cancel"
                  class="flex-1 h-11 border border-gray-200 dark:border-white/10 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 font-bold uppercase tracking-widest text-[9px] transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  class="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-widest text-[9px] shadow-lg shadow-blue-500/20 transition-all cursor-pointer text-center"
                >
                  Create & Login
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(container);

    const closeModal = () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };

    // Tabs navigation
    const tabLoginBtn = container.querySelector('#tab-login-btn') as HTMLButtonElement;
    const tabRegisterBtn = container.querySelector('#tab-register-btn') as HTMLButtonElement;
    const contentLogin = container.querySelector('#content-login') as HTMLDivElement;
    const contentRegister = container.querySelector('#content-register') as HTMLDivElement;

    tabLoginBtn?.addEventListener('click', () => {
      tabLoginBtn.classList.add('text-blue-600', 'dark:text-blue-400', 'border-b-2', 'border-blue-600', 'dark:border-blue-400');
      tabLoginBtn.classList.remove('text-gray-400', 'dark:text-gray-500', 'border-transparent');
      tabRegisterBtn.classList.remove('text-blue-600', 'dark:text-blue-400', 'border-b-2', 'border-blue-600', 'dark:border-blue-400');
      tabRegisterBtn.classList.add('text-gray-400', 'dark:text-gray-500', 'border-transparent');
      contentLogin.style.display = 'block';
      contentRegister.style.display = 'none';
    });

    tabRegisterBtn?.addEventListener('click', () => {
      tabRegisterBtn.classList.add('text-blue-600', 'dark:text-blue-400', 'border-b-2', 'border-blue-600', 'dark:border-blue-400');
      tabRegisterBtn.classList.remove('text-gray-400', 'dark:text-gray-500', 'border-transparent');
      tabLoginBtn.classList.remove('text-blue-600', 'dark:text-blue-400', 'border-b-2', 'border-blue-600', 'dark:border-blue-400');
      tabLoginBtn.classList.add('text-gray-400', 'dark:text-gray-500', 'border-transparent');
      contentRegister.style.display = 'block';
      contentLogin.style.display = 'none';
    });

    // Handle button clicks for login
    const accButtons = container.querySelectorAll('.google-acc-btn');
    accButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email') || '';
        const name = btn.getAttribute('data-name') || email.split('@')[0];
        completeLogin(email, name);
      });
    });

    // ... (tabs navigation code) ...

    const customForm = container.querySelector('#google-login-custom-form');
    customForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = container.querySelector('#google-login-custom-email') as HTMLInputElement;
      const passInput = container.querySelector('#google-login-custom-pass') as HTMLInputElement;
      if (emailInput && emailInput.value) {
        try {
          const { auth: realAuth } = await import('./firebase-config');
          const { signInWithEmailAndPassword } = await import('firebase/auth');
          const userCredential = await signInWithEmailAndPassword(realAuth, emailInput.value, passInput.value);
          completeLogin(userCredential.user.email || '', userCredential.user.displayName || emailInput.value.split('@')[0]);
        } catch (error) {
          alert("Login failed: " + error);
        }
      }
    });

    // ... (rest of the file) ...

    const cancelLoginBtn = container.querySelector('#google-login-cancel');
    cancelLoginBtn?.addEventListener('click', () => {
      closeModal();
      reject({ code: 'auth/cancelled-popup-request', message: 'Popup closed by user' });
    });

    const cancelRegBtn = container.querySelector('#google-register-cancel');
    cancelRegBtn?.addEventListener('click', () => {
      closeModal();
      reject({ code: 'auth/cancelled-popup-request', message: 'Popup closed by user' });
    });

    // Handle submit for registration
    const registerForm = container.querySelector('#google-register-form');
    registerForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = (container.querySelector('#reg-name') as HTMLInputElement).value;
      const emailVal = (container.querySelector('#reg-email') as HTMLInputElement).value;
      const whatsappVal = (container.querySelector('#reg-whatsapp') as HTMLInputElement).value;
      const playerIdVal = (container.querySelector('#reg-playerid') as HTMLInputElement).value;
      const passwordVal = (container.querySelector('#reg-password') as HTMLInputElement).value;

      if (emailVal && nameVal && passwordVal) {
        const uid = 'user_' + emailVal.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Save password
        const passwords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
        passwords[emailVal] = passwordVal;
        localStorage.setItem('userPasswords', JSON.stringify(passwords));

        // Build user profile
        const customProfile = {
          id: uid,
          playerId: playerIdVal || '',
          whatsappNumber: whatsappVal || '',
          customerName: nameVal,
          email: emailVal,
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100",
          createdAt: Date.now()
        };

        // Cache registration in localStorage beforehand
        localStorage.setItem('userProfile', JSON.stringify(customProfile));

        // Attempt direct sync to MongoDB Proxy
        try {
          await fetch(`/api/db/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customProfile)
          });
        } catch (dbErr) {
          console.warn("Direct mongodb registration push failed:", dbErr);
        }

        completeLogin(emailVal, nameVal);
      } else {
        alert("Please fill all required fields, including password.");
      }
    });

    const completeLogin = (email: string, displayName: string) => {
      // Create prompt for password
      const passwordContainer = document.createElement('div');
      passwordContainer.className = "fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4";
      passwordContainer.innerHTML = `
        <div class="bg-white dark:bg-[#0d0d0f] p-6 rounded-2xl w-full max-w-xs shadow-2xl space-y-4 font-sans">
          <h3 class="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">Verify Account</h3>
          <p class="text-[10px] text-gray-500">Please enter the email and password associated with this account to continue.</p>
          <input type="email" id="ver-email" value="${email}" readonly class="w-full h-9 px-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-500 font-mono" />
          <input type="password" id="ver-pass" placeholder="Enter Password" class="w-full h-9 px-3 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white font-bold outline-none focus:border-blue-500" />
          <button id="ver-btn" class="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all">Verify & Login</button>
        </div>
      `;
      document.body.appendChild(passwordContainer);
      
      const vBtn = passwordContainer.querySelector('#ver-btn');
      vBtn?.addEventListener('click', () => {
        const pass = (passwordContainer.querySelector('#ver-pass') as HTMLInputElement).value;
        const storedPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
        const storedPass = storedPasswords[email];

        if (storedPass && pass === storedPass) { 
          document.body.removeChild(passwordContainer);
          const user: User = {
            uid: 'user_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
            email: email,
            displayName: displayName,
            photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100",
            emailVerified: true,
            providerData: [{ providerId: 'google.com', email }]
          };
          
          currentMockUser = user;
          localStorage.setItem('authUser', JSON.stringify(user));
          authListeners.forEach(listener => listener(user));
          
          closeModal();
          resolve({ user });
        } else if (!storedPass) {
          alert("This account requires a password. Please register with a password.");
        } else {
          alert("Incorrect password.");
        }
      });
    };
  });
}

export async function signOut(authInstance: any) {
  currentMockUser = null;
  localStorage.removeItem('authUser');
  authListeners.forEach(listener => listener(null));
}

export function isSignInWithEmailLink(authInstance: any, url: string) {
  return url.includes('apiKey=mock-magic-link');
}

export async function sendSignInLinkToEmail(authInstance: any, email: string, actionCodeSettings: any) {
  localStorage.setItem('emailForSignIn', email);
  setTimeout(() => {
    let confirmation = true;
    try {
      confirmation = window.confirm(`[SIMULATOR] Magic Link requested for: ${email}\n\nWould you like to simulate clicking this login email link?`);
    } catch (e) {
      console.warn("window.confirm blocked or not supported:", e);
    }
    if (confirmation) {
      window.location.href = `${actionCodeSettings.url}?apiKey=mock-magic-link&email=${encodeURIComponent(email)}`;
    }
  }, 800);
  return true;
}

export async function signInWithEmailLink(authInstance: any, email: string, url: string) {
  const user: User = {
    uid: 'user_' + email.replace(/[^a-zA-Z0-9]/g, '_'),
    email: email,
    displayName: email.split('@')[0],
    photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100",
    emailVerified: true,
    providerData: [{ providerId: 'email', email }]
  };
  
  currentMockUser = user;
  localStorage.setItem('authUser', JSON.stringify(user));
  authListeners.forEach(listener => listener(user));
  
  return { user };
}

// === firebase/storage Mock ===
export function getStorage(app?: any) {
  return { type: 'mock-storage' };
}

export const storage = getStorage();

export function ref(storageInstance: any, path: string) {
  return { type: 'storage-ref', path, downloadURL: '' };
}

export async function uploadBytes(storageRef: any, file: File) {
  return new Promise<{ ref: any }>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const rawBase64 = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'image/jpeg',
            data: rawBase64
          })
        });
        
        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const result = await res.json();
        
        resolve({
          ref: {
            ...storageRef,
            downloadURL: result.url
          }
        });
      } catch (err) {
        console.error("Upload mock failed:", err);
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
  });
}

export async function getDownloadURL(storageRef: any): Promise<string> {
  return storageRef.downloadURL || '';
}

// === firebase/firestore Integration Bridge ===
export const db = getFirestore();
