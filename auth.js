// ============================================================
//  AUTH.JS - Centralized Authentication for All Pages
// ============================================================

// ---- SUPABASE CONFIG ----
const SUPABASE_URL = "https://kbyfvqkfcxqgjjtfvvxf.supabase.co/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtieWZ2cWtmY3hxZ2pqdGZ2dnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDM1MzMsImV4cCI6MjA5NjIxOTUzM30.TQQZJJi27pNcXMlD0m8MsrAbqjLHGgVnw-L3bNDR2bU";

// ---- ROLE-BASED ACCESS CONTROL ----
const ALLOWED_ROLES = {
    public: ['admin', 'president', 'secretary', 'editor', 'viewer'],
    admin: ['admin'],
    minutes: ['admin', 'president', 'secretary', 'editor']
};

// ============================================================
//  ✅ FIXED: SUPABASE CLIENT WITH RETRY
// ============================================================
let supabaseClient = null;
let initAttempts = 0;
const MAX_ATTEMPTS = 10;

function initSupabaseClient() {
    initAttempts++;
    console.log(`🔄 Attempt ${initAttempts} to initialize Supabase...`);
    
    try {
        // Check if supabase is available globally
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase client initialized successfully!');
            return true;
        } else {
            console.warn('⚠️ Supabase not available yet. Attempt:', initAttempts);
            
            // If supabase is not available, try to load it
            if (initAttempts === 1) {
                // Try to load Supabase CDN dynamically
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = function() {
                    console.log('✅ Supabase CDN loaded dynamically.');
                    initSupabaseClient();
                };
                script.onerror = function() {
                    console.error('❌ Failed to load Supabase CDN.');
                };
                document.head.appendChild(script);
            }
            
            // Retry after delay
            if (initAttempts < MAX_ATTEMPTS) {
                setTimeout(initSupabaseClient, 500);
            } else {
                console.error('❌ Failed to initialize Supabase after', MAX_ATTEMPTS, 'attempts.');
                // Show error on page
                showSupabaseError();
            }
            return false;
        }
    } catch (e) {
        console.error('❌ Supabase init error:', e.message);
        if (initAttempts < MAX_ATTEMPTS) {
            setTimeout(initSupabaseClient, 500);
        }
        return false;
    }
}

function showSupabaseError() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 99999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 90%;
        text-align: center;
    `;
    errorDiv.innerHTML = `
        ⚠️ Authentication service unavailable. 
        <button onclick="location.reload()" style="
            background: white;
            color: #ef4444;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            margin-left: 10px;
            cursor: pointer;
            font-weight: bold;
        ">Refresh</button>
    `;
    document.body.appendChild(errorDiv);
}

// Start initialization
initSupabaseClient();

// Also try on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    if (!supabaseClient) {
        initSupabaseClient();
    }
});

console.log('📋 supabaseClient status:', supabaseClient ? '✅ OK' : '⏳ Loading...');

// ============================================================
//  CORE AUTH FUNCTIONS
// ============================================================

async function login(email, password) {
    // Wait for supabase client to be ready
    if (!supabaseClient) {
        // Wait for client to initialize
        await new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (supabaseClient) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 200);
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
        
        if (!supabaseClient) {
            throw new Error('Authentication service is unavailable. Please refresh the page.');
        }
    }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw new Error(error.message);

        const user = data.user;
        if (!user) throw new Error('No user data returned.');

        console.log('🔍 User authenticated:', user.id, user.email);

        // Try by user_id first, then by email
        let { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role, status')
            .eq('user_id', user.id)
            .maybeSingle();

        // If not found by user_id, try by email
        if (!roleData && user.email) {
            console.log('🔍 Searching by email:', user.email);
            const { data: emailData, error: emailError } = await supabaseClient
                .from('user_roles')
                .select('role, status')
                .eq('email', user.email)
                .maybeSingle();

            if (!emailError && emailData) {
                roleData = emailData;
                console.log('✅ Found by email:', emailData);
            }
        }

        if (!roleData) {
            console.error('❌ No role found for user:', user.id, user.email);
            throw new Error('No role assigned. Please contact admin.');
        }

        if (roleData.status !== 'active') {
            throw new Error(`Your account is ${roleData.status}. Please contact admin.`);
        }

        console.log('✅ Role found:', roleData);

        // Store session
        sessionStorage.setItem('auth_user_id', user.id);
        sessionStorage.setItem('auth_email', user.email);
        sessionStorage.setItem('auth_role', roleData.role);
        sessionStorage.setItem('auth_status', roleData.status);
        sessionStorage.setItem('auth_verified', 'true');
        sessionStorage.setItem('auth_timestamp', Date.now().toString());

        return {
            user: user,
            role: roleData.role,
            status: roleData.status
        };

    } catch (err) {
        console.error('Login error:', err);
        throw err;
    }
}

async function logout() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
    } catch (e) {
        console.warn('Signout error:', e);
    }

    sessionStorage.removeItem('auth_user_id');
    sessionStorage.removeItem('auth_email');
    sessionStorage.removeItem('auth_role');
    sessionStorage.removeItem('auth_status');
    sessionStorage.removeItem('auth_verified');
    sessionStorage.removeItem('auth_timestamp');
}

function getCurrentUser() {
    const verified = sessionStorage.getItem('auth_verified') === 'true';
    const userId = sessionStorage.getItem('auth_user_id');
    const email = sessionStorage.getItem('auth_email');
    const role = sessionStorage.getItem('auth_role');
    const status = sessionStorage.getItem('auth_status');

    if (!verified || !userId) {
        return null;
    }

    return {
        id: userId,
        email: email,
        role: role,
        status: status
    };
}

function isLoggedIn() {
    return sessionStorage.getItem('auth_verified') === 'true' && 
           sessionStorage.getItem('auth_user_id') !== null;
}

function getUserRole() {
    return sessionStorage.getItem('auth_role') || null;
}

function isAdmin() {
    return getUserRole() === 'admin';
}

function getRoleDisplayName(role) {
    const roleMap = {
        'admin': 'Administrator',
        'editor': 'Editor',
        'president': 'President',
        'secretary': 'Secretary',
        'viewer': 'Viewer'
    };
    return roleMap[role] || role;
}

// ============================================================
//  NAVBAR UPDATE
// ============================================================
function updateNavbarAuth() {
    const user = getCurrentUser();
    const loginBtn = document.getElementById('loginNavBtn');
    const userEmail = document.getElementById('userEmailDisplay');
    const userRole = document.getElementById('userRoleBadge');
    const dashboardLink = document.getElementById('dashboardLink');

    console.log('🔄 Updating navbar... User:', user);

    if (user) {
        if (loginBtn) {
            loginBtn.textContent = '🚪 Logout';
            loginBtn.classList.add('logged-in');
            loginBtn.onclick = async function() {
                if (confirm('Are you sure you want to logout?')) {
                    await logout();
                    window.location.reload();
                }
            };
        }
        if (userEmail) {
            userEmail.textContent = `👤 ${user.email}`;
        }
        if (userRole) {
            userRole.textContent = user.role.toUpperCase();
            userRole.className = `role-badge ${user.role}`;
        }
        if (dashboardLink) {
            dashboardLink.style.display = user.role === 'admin' ? 'inline' : 'none';
        }
        return true;
    } else {
        if (loginBtn) {
            loginBtn.textContent = '🔐 Login';
            loginBtn.classList.remove('logged-in');
            loginBtn.onclick = function() {
                console.log('🔐 Opening login modal');
                const modal = document.getElementById('loginModal');
                if (modal) {
                    modal.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    const emailInput = document.getElementById('auth-email');
                    if (emailInput) emailInput.focus();
                } else {
                    console.error('❌ Login modal not found!');
                    window.location.href = 'blog.html';
                }
            };
        }
        if (userEmail) {
            userEmail.textContent = '👤 Guest';
        }
        if (userRole) {
            userRole.textContent = '—';
            userRole.className = 'role-badge';
        }
        if (dashboardLink) {
            dashboardLink.style.display = 'none';
        }
        return false;
    }
}

// ============================================================
//  AUTO-INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 auth.js initialized');
    // Try to init again if not already
    if (!supabaseClient) {
        initSupabaseClient();
    }
    updateNavbarAuth();
});

// ---- EXPOSE GLOBALLY ----
window.supabaseClient = supabaseClient;
window.login = login;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;
window.getUserRole = getUserRole;
window.isAdmin = isAdmin;
window.updateNavbarAuth = updateNavbarAuth;
window.getRoleDisplayName = getRoleDisplayName;
window.ALLOWED_ROLES = ALLOWED_ROLES;

console.log('✅ Auth system loaded.');
console.log('📋 supabaseClient:', supabaseClient ? '✅ OK' : '❌ NULL');