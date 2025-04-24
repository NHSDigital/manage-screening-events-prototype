// ES6 or Vanilla JavaScript


document.addEventListener('DOMContentLoaded', () => {

  // Function to check for and close an orphaned mammogram viewer window
  function closeOrphanedViewer() {
    // Only do this on non-reading pages
    if (!window.location.pathname.includes('/reading/batch/')) {
      // Check if the viewer should be closed
      if (window.MammogramViewer) {
        window.MammogramViewer.close();
      } else {
        // Try to find and close the window by name as a fallback
        try {
          const savedOpenState = localStorage.getItem('mammogramViewerOpen');
          if (savedOpenState === 'true') {
            const viewerWindow = window.open('', 'mammogramViewer');
            if (viewerWindow) {
              viewerWindow.close();
            }
            localStorage.removeItem('mammogramViewerOpen');
          }
        } catch (e) {
          console.error('Error in fallback closing:', e);
        }
      }
    }
  }

  // Close orphaned viewers when page loads
  closeOrphanedViewer();

  // Global navigation handling for mammogram viewer
  document.addEventListener('click', function(e) {
    // Only process link clicks
    let linkElement = e.target;
    while (linkElement && linkElement.tagName !== 'A' && linkElement !== document.body) {
      linkElement = linkElement.parentElement;
    }

    // Only process if it's an actual link click
    if (!linkElement || linkElement.tagName !== 'A') return;

    // If the mammogram viewer exists
    if (window.MammogramViewer) {
      const targetHref = linkElement.href || '';
      const currentPath = window.location.pathname;

      // Function to determine if we're staying within the same batch
      function isSameBatchNavigation(currentPath, targetHref) {
        // Extract batch ID from both paths
        const currentBatchMatch = currentPath.match(/\/reading\/batch\/([^\/]+)/);
        const targetBatchMatch = targetHref.match(/\/reading\/batch\/([^\/]+)/);

        // If either doesn't have a batch ID, or they differ, it's not same-batch navigation
        if (!currentBatchMatch || !targetBatchMatch ||
            currentBatchMatch[1] !== targetBatchMatch[1]) {
          return false;
        }

        // We're staying within the same batch
        return true;
      }

      // If we're in a batch page and not clicking on an event link, don't do anything
      // This avoids interference with batch page's own window closing
      if (currentPath.includes('/reading/batch/') &&
          !currentPath.includes('/events/') &&
          targetHref.includes('/reading/batch/')) {
        return;
      }

      // Don't close if navigating between events in same batch
      if (currentPath.includes('/events/') &&
          isSameBatchNavigation(currentPath, targetHref) &&
          targetHref.includes('/events/')) {
        return;
      }

      // If we're navigating away from reading completely, close the viewer
      if (!targetHref.includes('/reading/batch/') ||
          (targetHref.includes('/reading/batch/') && !targetHref.includes('/events/'))) {
        // Only close if actually open
        if (window.MammogramViewer.isOpen()) {
          window.MammogramViewer.close();
        }
      }
    }
  });


  // Inline check in without requiring page reload
  const checkInLinks = document.querySelectorAll('.js-check-in-link')

  checkInLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault()
      const link = e.currentTarget
      const clinicId = link.dataset.clinicId
      const eventId = link.dataset.eventId

      try {
        const response = await fetch(
          `/clinics/${clinicId}/check-in/${eventId}`,
          {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to check in participant')
        }

        // Find the containing element by data attribute
        const container = document.querySelector(`[data-event-status-container="${eventId}"]`)
        if (container) {
          container.innerHTML = `
            <strong class="nhsuk-tag">
              Checked in
            </strong>
          `
        }
      } catch (error) {
        console.error('Error checking in participant:', error)
        window.location.href = link.href
      }
    })
  })

  // Handle clear data link with AJAX
  const clearDataLinks = document.querySelectorAll('a[href="/clear-data"]')
  clearDataLinks.forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault()
      try {
        const response = await fetch('/clear-data', {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          throw new Error('Failed to clear data')
        }

        const result = await response.json()
        if (result.success) {
          // Refresh the page to reflect the cleared data
          window.location.reload()
        } else {
          throw new Error('Failed to clear data')
        }
      } catch (error) {
        console.error('Error clearing data:', error)
        window.location.href = link.href
      }
    })
  })
})