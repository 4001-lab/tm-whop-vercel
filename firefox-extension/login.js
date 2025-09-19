// login.js
// Content script to automate login
(function () {
  console.log("Login.js loaded");
  
    // Check if we're on the authorization page that sometimes gets stuck
  const isAuthPage = window.location.href.includes('auth.ticketmaster.com/as/authorization.oauth2');
  
  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }

  function waitForElement(selector, maxAttempts = 10) {
    return new Promise((resolve) => {
      let attempts = 0;
      function check() {
        const element = document.querySelector(selector);
        if (element || attempts >= maxAttempts) {
          resolve(element);
        } else {
          attempts++;
          setTimeout(check, 1000);
        }
      }
      check();
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function initLogin() {
    const usernameField = await waitForElement('input[type="email"]');
    if (usernameField) {
      await delay(2000);
      try {
        const data = await browser.runtime.sendMessage({ action: "getCredentials" });
        if (data && data.username && data.password) {
          //console.log("Credentials received:", data);

          // Fill username
          usernameField.focus();
          usernameField.dispatchEvent(new Event('change', { bubbles: true }));
          usernameField.dispatchEvent(new Event('blur', { bubbles: true }));

          // Submit form
          await delay(2000);
          const loginButton = document.querySelector('button[type="submit"]');
          if (loginButton) {
            loginButton.click();
          }

          // Wait for password field
          await delay(5000);
          const passwordField = await waitForElement('input[id="password-input"]');
          if (passwordField) {
            passwordField.focus();
            passwordField.value = data.password;
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('blur', { bubbles: true }));

            // Submit form
            await delay(3000);
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) {
              //await delay(2000);
              browser.runtime.sendMessage({ action: "loginComplete" });
              submitButton.click();
              // Notify background script that login is complete

            }
          } else {
            //console.log("Password field not found");
            // Still notify completion even if password field not found
            browser.runtime.sendMessage({ action: "loginComplete" });
          }
        } else {
          console.log("Nothing received: ", data);
          // Notify completion even if no credentials
          //browser.runtime.sendMessage({ action: "loginComplete" });
        }
      } catch (error) {
        console.log('Error getting credentials:', error);
        // Notify completion even on error
        //browser.runtime.sendMessage({ action: "loginComplete" });
      }
    } else {
      console.log('Username field not found.');

            // Check if we're on the auth page that got stuck
      if (isAuthPage && document.body.textContent.trim().length < 50) {
        console.log("Detected stuck auth page, refreshing...");
        window.location.reload();
        return;
      }
      
      // Notify completion even if username field not found
      const found = document.body.textContent.includes("Your Browsing Activity Has Been Paused");
      if (found) {
        console.log("Message found!");
        browser.runtime.sendMessage({ action: "loginComplete" });
      } else {
        console.log("Message not found.");
      }

    }
  }
})();