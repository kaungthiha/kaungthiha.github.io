// Expandable Sections Functionality
(function() {
  'use strict';

  function initExpandable() {
    const headers = document.querySelectorAll('.expandable-header');

    // Add click event listeners to all expandable headers
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const section = header.dataset.section;
        const content = document.querySelector(`[data-content="${section}"]`);

        header.classList.toggle('active');
        content.classList.toggle('active');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExpandable);
  } else {
    initExpandable();
  }
})();
