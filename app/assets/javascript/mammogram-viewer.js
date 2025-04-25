// app/assets/javascript/mammogram-viewer.js

// Single global variable to store the window reference
let mammogramWindow = null;

// Track what was the last event ID that had a viewer open
let currentEventId = '';

// Track the current participant name to detect if we truly need to update
let currentParticipantName = '';

// Track if we're in a reading context - export to make it visible to the viewer
window.inReadingContext = false;

// Check for viewer flag on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if this page should show the viewer
  const viewerMeta = document.querySelector('meta[name="mammogram-viewer"]');
  const shouldShowViewer = viewerMeta?.getAttribute('content') === 'show';
  const participantName = document.querySelector('meta[name="participant-name"]')?.getAttribute('content');
  const eventId = document.querySelector('meta[name="event-id"]')?.getAttribute('content');

  console.log("Mammogram viewer check:", shouldShowViewer ? "SHOW" : "HIDE", "Event ID:", eventId);

  // Update our reading context status - this is checked by the viewer window
  window.inReadingContext = shouldShowViewer;

  // If we're in a reading context with metadata present
  if (shouldShowViewer && participantName) {
    // Very strict checks to prevent unnecessary updates:
    // 1. Do we already have the same event open?
    // 2. Is the window reference still valid?
    // 3. Is it the same participant as before?

    const isSameEvent = eventId && eventId === currentEventId;
    const isSameParticipant = participantName === currentParticipantName;
    const hasValidWindow = mammogramWindow && !mammogramWindow.closed;

    if (hasValidWindow && isSameEvent && isSameParticipant) {
      console.log("Same event and participant, not touching the viewer at all");
      // Same event and participant with valid window - do absolutely nothing
      return;
    }

    // Only update tracking variables when there's an actual change
    if (!isSameEvent) {
      console.log("New event detected, updating from", currentEventId, "to", eventId);
      currentEventId = eventId || '';
    }

    if (!isSameParticipant) {
      console.log("New participant detected:", participantName);
      currentParticipantName = participantName;
    }

    // Only open/update when we truly need to (new event, new participant, or no window)
    if (!hasValidWindow || !isSameEvent || !isSameParticipant) {
      MammogramViewer.open(participantName);
    }
  } else {
    // We're on a page that should NOT show the viewer
    console.log("Not in reading context - marking for close");
    // Just set the flag - the viewer will see this and self-close
    window.inReadingContext = false;

    // Try to send a message to the viewer window
    if (mammogramWindow && !mammogramWindow.closed) {
      try {
        mammogramWindow.postMessage('please-close', '*');
      } catch (e) {
        console.error("Error posting close message:", e);
      }
    }

    // Reset tracking variables
    currentEventId = '';
    currentParticipantName = '';
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
      const url = `/reading/mammogram-viewer?name=${encodeURIComponent(participantName)}&ts=${Date.now()}`;
      // Portrait orientation
      mammogramWindow = window.open(url, 'mammogramViewer', 'width=700,height=900');

      // Store window information
      if (mammogramWindow) {
        try {
          localStorage.setItem('mammogramViewerOpen', 'true');
          console.log("Mammogram viewer opened");

          // Keep focus on the main window
          setTimeout(function() {
            window.focus();
          }, 100);
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

          // Keep focus on the main window
          window.focus();
        }
      } catch (e) {
        console.error('Could not update viewer window, opening new one', e);

        try {
          mammogramWindow.close();
        } catch (err) {}

        localStorage.removeItem('mammogramViewerOpen');
        mammogramWindow = window.open(`/reading/mammogram-viewer?name=${encodeURIComponent(participantName)}&ts=${Date.now()}`,
          'mammogramViewer', 'width=700,height=900');

        if (mammogramWindow) {
          localStorage.setItem('mammogramViewerOpen', 'true');
          console.log("Mammogram viewer reopened");

          // Keep focus on the main window
          setTimeout(function() {
            window.focus();
          }, 100);
        }
      }
    }

    return mammogramWindow;
  },

  // No longer trying to directly close - just signal intent
  close: function() {
    console.log("Signaling viewer to close");
    window.inReadingContext = false;

    // Try to send a message to the viewer
    if (mammogramWindow && !mammogramWindow.closed) {
      try {
        mammogramWindow.postMessage('please-close', '*');
      } catch (e) {
        console.error("Error posting close message:", e);
      }
    }

    // Clean up our references
    mammogramWindow = null;
    localStorage.removeItem('mammogramViewerOpen');
  },

  // Check if viewer is open
  isOpen: function() {
    try {
      return mammogramWindow && !mammogramWindow.closed;
    } catch (e) {
      return false;
    }
  }
};

// Make it globally available
window.MammogramViewer = MammogramViewer;