// ES6 or Vanilla JavaScript


document.addEventListener('DOMContentLoaded', () => {

  window.addEventListener('focus', function() {
    // If we have the viewer and we're on a page that should show it
    const shouldShowViewer = document.querySelector('meta[name="mammogram-viewer"]')?.getAttribute('content') === 'show';
    if (shouldShowViewer && window.MammogramViewer && window.MammogramViewer.isOpen()) {
      // Return focus to main window after a brief delay
      setTimeout(() => window.focus(), 100);
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