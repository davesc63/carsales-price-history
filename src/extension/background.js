// Listener for when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    // Start version checking immediately
    checkForUpdate();
    // Set interval to check for updates every 30 seconds (30000 ms)
    setInterval(checkForUpdate, 30000);
});

// Function to check for update
function checkForUpdate() {
    // Define the URL where the version file is hosted
    const versionUrl = 'https://raw.githubusercontent.com/davesc63/carsales-price-history/refs/heads/main/src/extension/version.txt';

    // Fetch the version from GitHub
    fetch(versionUrl)
        .then(response => response.text())  // Get the version from the text file
        .then(remoteVersion => {
            // Get the current version from the extension's manifest
            const currentVersion = chrome.runtime.getManifest().version;

            // Compare the versions
            if (remoteVersion.trim() !== currentVersion) {
                // Check when the last version check was performed
                chrome.storage.local.get(['lastVersionCheck'], (result) => {
                    const now = Date.now();
                    const lastCheck = result.lastVersionCheck || 0;
                    const timeSinceLastCheck = now - lastCheck;

                    // Show modal even if we check every 30 seconds (for testing)
                    if (remoteVersion.trim() > currentVersion) {
                        // Store the new check time
                        chrome.storage.local.set({ lastVersionCheck: now });

                        // Version mismatch: Show modal to update
                        showModal('Update Available', 'A new version of the extension is available. Please update.');
                    } else {
                        // User is using a lower version, indicate beta testing
                        showModal('Beta Testing', 'You are using a beta version of the extension. Please use it responsibly.');
                    }
                });
            } else {
                console.log('Extension is up-to-date.');
            }
        })
        .catch(error => {
            console.error('Failed to fetch version:', error);
        });
}

// Function to show the modal with a message
function showModal(title, message) {
    const modalHtml = `
        <div id="updateModal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h2>${title}</h2>
                <p>${message}</p>
                <button id="closeModal" style="padding: 10px 20px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
            </div>
        </div>
    `;
    // Inject the modal HTML into the page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listener to close the modal
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('updateModal').remove();
    });
}
