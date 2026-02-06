// Weather Toggle Functionality
(function() {
  'use strict';

  // Wait for DOM to be ready
  function initWeather() {
    const weatherButtons = document.querySelectorAll('.weather-btn');
    const weatherContainers = {
      sunny: document.getElementById('sunny-weather'),
      rainy: document.getElementById('rainy-weather'),
      snowy: document.getElementById('snowy-weather')
    };

    // Load saved weather preference
    const savedWeather = localStorage.getItem('weather_preference') || 'sunny';
    setWeather(savedWeather);

    // Add click event listeners to weather buttons
    weatherButtons.forEach(button => {
      button.addEventListener('click', () => {
        const weather = button.dataset.weather;
        setWeather(weather);

        // Save preference
        localStorage.setItem('weather_preference', weather);
      });
    });

    function setWeather(weather) {
      // Remove active class from all buttons
      weatherButtons.forEach(btn => btn.classList.remove('active'));

      // Add active class to selected button
      const activeButton = document.querySelector(`[data-weather="${weather}"]`);
      if (activeButton) {
        activeButton.classList.add('active');
      }

      // Hide all weather containers
      Object.values(weatherContainers).forEach(container => {
        if (container) {
          container.classList.remove('active');
        }
      });

      // Show selected weather container
      if (weatherContainers[weather]) {
        weatherContainers[weather].classList.add('active');
      }

      // Update body class for background color
      document.body.classList.remove('weather-sunny', 'weather-rainy', 'weather-snowy');
      document.body.classList.add(`weather-${weather}`);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeather);
  } else {
    initWeather();
  }
})();
