const BACKEND_URL = 'https://vigilant-eureka-eta.vercel.app';

// Global variable to track auth polling
let authPolling = null;

// Load saved data and check authentication
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  
  browser.storage.local.get(['eventUrls', 'credentials']).then((result) => {
    if (result.eventUrls) {
      document.getElementById("eventUrls").value = result.eventUrls;
    }
    if (result.credentials) {
      document.getElementById("credentials").value = result.credentials;
    }
  });
});

// Check authentication status
async function checkAuthStatus() {
  const sessionToken = await browser.storage.local.get('sessionToken');
  
  if (sessionToken.sessionToken) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/verify-session`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ sessionToken: sessionToken.sessionToken })
      });
      
      const result = await response.json();
      console.log(result);

      if (result.valid) {
        showAuthenticatedState(result.user);
      } else {
        showUnauthenticatedState();
        await browser.storage.local.remove('sessionToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      showUnauthenticatedState();
    }
  } else {
    showUnauthenticatedState();
  }
}

function showAuthenticatedState(user) {
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('userSection').classList.remove('hidden');
  document.getElementById('mainContent').classList.remove('hidden');
  document.getElementById('username').textContent = user.username;
}

function showUnauthenticatedState() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('userSection').classList.add('hidden');
  document.getElementById('mainContent').classList.add('hidden');
}

// Whop OAuth login
document.getElementById('whopLoginBtn').addEventListener('click', async () => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/whop`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const { authUrl } = await response.json();
    
    document.getElementById('status').textContent = 'Opening login window...';
    const authWindow = window.open(authUrl, 'whop-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
    
    if (!authWindow) {
      document.getElementById('status').textContent = 'Popup blocked. Please allow popups and try again.';
      return;
    }
    
    // Start polling for authentication success
    startAuthPolling();
    
  } catch (error) {
    console.error('Login error:', error);
    document.getElementById('status').textContent = 'Login failed. Please try again.';
  }
});

// Poll for authentication success
function startAuthPolling() {
  if (authPolling) clearInterval(authPolling);
  
  document.getElementById('status').textContent = 'Waiting for authentication...';
  
  authPolling = setInterval(async () => {
    try {
      // Check localStorage via a backend endpoint
      const response = await fetch(`${BACKEND_URL}/api/check-status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'x-session-id': 'firefox-extension-session'
        }
      });
      
      const result = await response.json();
      
      if (result.sessionToken) {
        clearInterval(authPolling);
        await browser.storage.local.set({ sessionToken: result.sessionToken });
        showAuthenticatedState(result.user);
        document.getElementById('status').textContent = 'Login successful!';
        
        // Clear the backend storage
        await fetch(`${BACKEND_URL}/api/check-status`, { 
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'x-session-id': 'firefox-extension-session'
          }
        });
      } else if (result.error) {
        clearInterval(authPolling);
        document.getElementById('status').textContent = `Error: ${result.error}`;
        
        // Clear the backend storage
        await fetch(`${BACKEND_URL}/api/check-status`, { 
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'x-session-id': 'firefox-extension-session'
          }
        });
      }
    } catch (error) {
      console.error('Auth polling error:', error);
    }
  }, 2000); // Check every 2 seconds
  
  // Stop polling after 5 minutes
  setTimeout(() => {
    if (authPolling) {
      clearInterval(authPolling);
      document.getElementById('status').textContent = 'Login timeout. Please try again.';
    }
  }, 300000);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  const sessionToken = await browser.storage.local.get('sessionToken');
  
  if (sessionToken.sessionToken) {
    try {
      await fetch(`${BACKEND_URL}/api/logout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ sessionToken: sessionToken.sessionToken })
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
  }
  
  await browser.storage.local.remove('sessionToken');
  showUnauthenticatedState();
});

// Save data when input changes
document.getElementById("eventUrls").addEventListener('input', (e) => {
  browser.storage.local.set({ eventUrls: e.target.value });
});

document.getElementById("credentials").addEventListener('input', (e) => {
  browser.storage.local.set({ credentials: e.target.value });
});

document.getElementById("startBtn").addEventListener("click", async () => {
  // Check auth status first
  await checkAuthStatus();
  
  const sessionToken = await browser.storage.local.get('sessionToken');
  
  if (!sessionToken.sessionToken) {
    alert('Please login with Whop first.');
    return;
  }
  
  const eventUrls = document.getElementById("eventUrls").value;
  const credentials = document.getElementById("credentials").value;

  const eventUrlsArray = eventUrls.split('\n').filter(url => url.trim() !== '');
  const credentialsArray = credentials.split('\n').filter(line => line.trim() !== '');

  if (eventUrlsArray.length === 0 || credentialsArray.length === 0) {
    alert("Please provide at least one event URL and one credential.");
    return;
  }

  try {
    // Send data to backend for validation and processing
    const response = await fetch(`${BACKEND_URL}/api/start-login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        sessionToken: sessionToken.sessionToken,
        eventUrls: eventUrlsArray,
        credentials: credentialsArray
      })
    });
    
    const result = await response.json();
    
    if (!result.success) {
      if (response.status === 403) {
        alert('Access denied. Please ensure you have an active paid subscription.');
        showUnauthenticatedState();
      } else {
        alert(result.error || 'Request failed');
      }
      return;
    }

    // Send validated data to background script
    browser.runtime.sendMessage({
      action: "start",
      eventUrls: result.data.eventUrls,
      credentials: result.data.credentials
    });
  } catch (error) {
    alert('Connection failed. Please check your internet connection.');
  }
});