// app/assets/javascript/mammogram-viewer.js

// Single global variable to store the window reference
let mammogramWindow = null;

// Try to restore window reference from localStorage if possible
try {
  if (localStorage.getItem('mammogramViewerOpen') === 'true') {
    mammogramWindow = window.open('', 'mammogramViewer');
    if (mammogramWindow && mammogramWindow.closed) {
      mammogramWindow = null;
      localStorage.removeItem('mammogramViewerOpen');
    }
  }
} catch (e) {
  console.error('Error restoring viewer reference:', e);
}

// Simple viewer manager object
const MammogramViewer = {
  // Open or update the mammogram viewer window
  open: function(participantName) {
    // Close existing window if it exists but can't be accessed
    try {
      if (mammogramWindow && mammogramWindow.closed) {
        mammogramWindow = null;
        localStorage.removeItem('mammogramViewerOpen');
      }
    } catch (e) {
      mammogramWindow = null;
      localStorage.removeItem('mammogramViewerOpen');
    }

    // Create window if it doesn't exist
    if (!mammogramWindow) {
      const url = `/reading/mammogram-viewer?name=${encodeURIComponent(participantName)}`;
      // Changed window dimensions to portrait orientation (700x900)
      mammogramWindow = window.open(url, 'mammogramViewer', 'width=700,height=900');

      // Set a flag on the window to identify it as our viewer
      if (mammogramWindow) {
        try {
          // Store window name in local storage to help with cleanup
          localStorage.setItem('mammogramViewerOpen', 'true');
        } catch (e) {
          console.error('Error marking viewer as open:', e);
        }
      }
    } else {
      // Update existing window without reopening it
      try {
        const nameElement = mammogramWindow.document.getElementById('participant-name');
        if (nameElement) {
          nameElement.textContent = participantName;
          mammogramWindow.document.title = 'Mammogram: ' + participantName;

          // Re-randomize the images when switching participants
          if (typeof mammogramWindow.randomizeAllImages === 'function') {
            // Set a new random seed based on participant name
            const nameSeed = participantName.split('').reduce((sum, char, i) => sum + char.charCodeAt(0) * (i + 1), 0);
            mammogramWindow.Math.random = mammogramWindow.Math.seedrandom(nameSeed);

            // Apply randomization
            mammogramWindow.randomizeAllImages();
          }
        } else {
          throw new Error('Name element not found');
        }
      } catch (e) {
        console.error('Could not update viewer window, opening new one', e);
        try {
          mammogramWindow.close();
        } catch (err) {}

        localStorage.removeItem('mammogramViewerOpen');
        // Changed window dimensions to portrait orientation (700x900)
        mammogramWindow = window.open(`/reading/mammogram-viewer?name=${encodeURIComponent(participantName)}`,
          'mammogramViewer', 'width=700,height=900');

        if (mammogramWindow) {
          localStorage.setItem('mammogramViewerOpen', 'true');
        }
      }
    }

    // Force focus back to parent window to prevent focus stealing
    setTimeout(function() {
      window.focus();
    }, 100);

    return mammogramWindow;
  },

  // Close the viewer window
  close: function() {
    // Try to use the stored reference first
    if (mammogramWindow) {
      try {
        mammogramWindow.close();
        mammogramWindow = null;
      } catch (e) {
        console.error('Error closing viewer window:', e);
      }
    }

    // Clear the flag
    try {
      localStorage.removeItem('mammogramViewerOpen');
    } catch (e) {
      console.error('Error clearing viewer flag:', e);
    }

    // As a backup, try to find and close any window named 'mammogramViewer'
    try {
      const windows = window.opener ? [window.opener] : [window];
      windows.forEach(function(win) {
        if (win && win.mammogramWindow && !win.mammogramWindow.closed) {
          win.mammogramWindow.close();
        }
      });

      // Also try to directly open and close the named window
      const viewerWindow = window.open('', 'mammogramViewer');
      if (viewerWindow) {
        viewerWindow.close();
      }
    } catch (e) {
      console.error('Error in backup window closing:', e);
    }
  },

  // Check if viewer is open
  isOpen: function() {
    // First check our direct reference
    if (mammogramWindow && !mammogramWindow.closed) {
      return true;
    }

    // Check the flag as fallback
    try {
      return localStorage.getItem('mammogramViewerOpen') === 'true';
    } catch (e) {
      return false;
    }
  }
};

// Make it globally available
window.MammogramViewer = MammogramViewer;

// Global close handler for all pages
window.addEventListener('beforeunload', function() {
  // Don't close on page navigation within the same batch
  // This is important to keep the viewer open when changing participants
  const currentPath = window.location.pathname;

  // Only close if we're not in a reading batch
  if (!currentPath.includes('/reading/batch/') || !currentPath.includes('/events/')) {
    if (window.MammogramViewer) {
      window.MammogramViewer.close();
    }
  }
});