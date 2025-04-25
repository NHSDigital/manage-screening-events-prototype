// app/assets/javascript/mammogram-viewer.js

// Single global variable to store the window reference
let mammogramWindow = null;

// Track what was the last event ID that had a viewer open
let currentEventId = '';

// Track if we're in a reading context
let inReadingContext = false;

// Check for viewer flag on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if this page should show the viewer
  const viewerMeta = document.querySelector('meta[name="mammogram-viewer"]');
  const shouldShowViewer = viewerMeta?.getAttribute('content') === 'show';
  const participantName = document.querySelector('meta[name="participant-name"]')?.getAttribute('content');
  const eventId = document.querySelector('meta[name="event-id"]')?.getAttribute('content');

  console.log("Mammogram viewer check:", shouldShowViewer ? "SHOW" : "HIDE", "Event ID:", eventId);

  // Track our reading context status
  const previousReadingContext = inReadingContext;
  inReadingContext = shouldShowViewer;

  // If we were in reading and now we're not, force close the viewer
  if (previousReadingContext && !inReadingContext) {
    console.log("Leaving reading context, forcing viewer close");
    forceCloseViewer();
    currentEventId = '';
    return;
  }

  // If we're in a reading context with metadata present
  if (shouldShowViewer && participantName) {
    // Check if it's the same event as we're currently showing
    if (eventId && eventId === currentEventId && mammogramWindow && !mammogramWindow.closed) {
      console.log("Same event, not updating viewer");
      // Same event, do nothing - this prevents flashing when moving between sub-pages
      return;
    }

    // New event or first load, update the viewer
    currentEventId = eventId || '';
    MammogramViewer.open(participantName);
  } else if (!shouldShowViewer) {
    // We're on a page that should NOT show the viewer
    console.log("Page lacks viewer meta tag or has it set to hide - closing viewer");
    MammogramViewer.close();
    currentEventId = '';
  }
});

// More aggressive forced close approach
function forceCloseViewer() {
  console.log("FORCE CLOSING mammogram viewer");

  // Try the standard close first
  if (mammogramWindow && !mammogramWindow.closed) {
    try {
      mammogramWindow.close();
      mammogramWindow = null;
    } catch (e) {
      console.error("Error closing mammogram window:", e);
    }
  }

  // Clean up localStorage
  try {
    localStorage.removeItem('mammogramViewerOpen');
  } catch (e) {}

  // Try to grab any window with that name and close it
  try {
    const viewerWindow = window.open('', 'mammogramViewer', 'noopener');
    if (viewerWindow && viewerWindow !== window) {
      viewerWindow.close();
    }
  } catch (e) {}

  // Last resort - add a message asking user to close manually
  if (mammogramWindow && !mammogramWindow.closed) {
    try {
      mammogramWindow.document.body.innerHTML =
        '<div style="text-align:center;margin-top:100px;font-family:sans-serif">' +
        '<h1>This window should close automatically</h1>' +
        '<p>Please close this window manually if it does not close.</p>' +
        '<button onclick="window.close()" style="padding:10px 20px;font-size:16px;margin-top:20px">' +
        'Close Window</button></div>';
    } catch (e) {}
  }
}

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
          console.log("Mammogram viewer updated for:", participantName);

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
    console.log("Attempting to close mammogram viewer");
    forceCloseViewer();
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

// Add a listener for page navigation using History API
window.addEventListener('popstate', function() {
  // If we were in reading and now going elsewhere, close the viewer
  if (inReadingContext && !window.location.pathname.includes('/reading/batch/')) {
    console.log("Navigation detected - closing viewer");
    forceCloseViewer();
    inReadingContext = false;
    currentEventId = '';
  }
});

// Before unload handler - close the viewer when leaving the site
window.addEventListener('beforeunload', function() {
  if (mammogramWindow && !mammogramWindow.closed) {
    mammogramWindow.close();
  }
});