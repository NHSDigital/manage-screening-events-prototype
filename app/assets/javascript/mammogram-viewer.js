// app/assets/javascript/mammogram-viewer.js

// Single global variable to store the window reference
let mammogramWindow = null;

// Track what was the last page that had a viewer open
let lastViewerPage = '';

// Check for viewer flag on page load - only run once
document.addEventListener('DOMContentLoaded', function() {
  // Check if this page should show the viewer
  const shouldShowViewer = document.querySelector('meta[name="mammogram-viewer"]')?.getAttribute('content') === 'show';
  const participantName = document.querySelector('meta[name="participant-name"]')?.getAttribute('content');

  // Debug
  console.log("Mammogram viewer check:", shouldShowViewer ? "SHOW" : "HIDE");

  if (shouldShowViewer && participantName) {
    // We're on a page that should show the viewer
    lastViewerPage = window.location.pathname;
    MammogramViewer.open(participantName);
  } else {
    // We're on a page that should NOT show the viewer - ensure it's closed
    // BUT - don't close if we're just moving between pages in the same reading context

    // Check if we're still in a reading context by examining the URL
    const currentPath = window.location.pathname;
    const isStillInReading = currentPath.includes('/reading/batch/') &&
                             currentPath.includes('/events/');

    // If we're no longer in a reading context, close the viewer
    if (!isStillInReading) {
      MammogramViewer.close();
      lastViewerPage = '';
    }
  }
});

// Simple viewer manager object
const MammogramViewer = {
  // Open or update the mammogram viewer window
  open: function(participantName) {
    // Check if we already have a window reference
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
      // Portrait orientation
      mammogramWindow = window.open(url, 'mammogramViewer', 'width=700,height=900');

      // Store window information
      if (mammogramWindow) {
        try {
          localStorage.setItem('mammogramViewerOpen', 'true');
          console.log("Mammogram viewer opened");
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
          console.log("Mammogram viewer updated");

          // Re-randomize the images when switching participants
          if (typeof mammogramWindow.randomizeAllImages === 'function') {
            // Set a new random seed based on participant name
            const nameSeed = participantName.split('').reduce((sum, char, i) => sum + char.charCodeAt(0) * (i + 1), 0);
            mammogramWindow.Math.random = mammogramWindow.Math.seedrandom(nameSeed);

            // Apply randomization
            mammogramWindow.randomizeAllImages();
          }
        }
      } catch (e) {
        console.error('Could not update viewer window, opening new one', e);

        try {
          mammogramWindow.close();
        } catch (err) {}

        localStorage.removeItem('mammogramViewerOpen');
        mammogramWindow = window.open(`/reading/mammogram-viewer?name=${encodeURIComponent(participantName)}`,
          'mammogramViewer', 'width=700,height=900');

        if (mammogramWindow) {
          localStorage.setItem('mammogramViewerOpen', 'true');
          console.log("Mammogram viewer reopened");
        }
      }
    }

    // Force focus back to parent window to prevent focus stealing
    setTimeout(function() {
      window.focus();
    }, 100);

    return mammogramWindow;
  },

  // Close the viewer window - but only if it actually exists
  close: function() {
    // First check if we need to close anything
    let needsClosing = false;

    // Method 1: Check our direct reference
    if (mammogramWindow && !mammogramWindow.closed) {
      needsClosing = true;
    }

    // Method 2: Check localStorage flag
    try {
      if (localStorage.getItem('mammogramViewerOpen') === 'true') {
        needsClosing = true;
      }
    } catch (e) {}

    // Only proceed if we actually need to close something
    if (needsClosing) {
      console.log("Closing mammogram viewer");

      // Try to use the stored reference first
      if (mammogramWindow) {
        try {
          mammogramWindow.close();
          mammogramWindow = null;
        } catch (e) {
          console.error('Error closing viewer window:', e);
        }
      }

      // Clean up localStorage flag
      try {
        localStorage.removeItem('mammogramViewerOpen');
      } catch (e) {
        console.error('Error clearing viewer flag:', e);
      }

      // If we don't have a direct reference but the flag was set, try to find and close by name
      try {
        const viewerWindow = window.open('', 'mammogramViewer', 'noopener');
        if (viewerWindow && viewerWindow !== window) {
          viewerWindow.close();
        }
      } catch (e) {
        console.error('Error in backup window closing:', e);
      }
    }
  },

  // Check if viewer is open
  isOpen: function() {
    // Method 1: Check our direct reference
    if (mammogramWindow && !mammogramWindow.closed) {
      return true;
    }

    // Method 2: Check localStorage flag
    try {
      return localStorage.getItem('mammogramViewerOpen') === 'true';
    } catch (e) {
      return false;
    }
  }
};

// Make it globally available
window.MammogramViewer = MammogramViewer;