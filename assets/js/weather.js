/*
 Weather Toggle
Still need to figure out correct sun placement
 */

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

    const savedWeather = localStorage.getItem('weather_preference') || 'sunny';
    setWeather(savedWeather);

    weatherButtons.forEach(button => {
      button.addEventListener('click', () => {
        const weather = button.dataset.weather;
        setWeather(weather);

        localStorage.setItem('weather_preference', weather);
      });
    });

    function setWeather(weather) {
      weatherButtons.forEach(btn => btn.classList.remove('active'));
      const activeButton = document.querySelector(`[data-weather="${weather}"]`);
      if (activeButton) {
        activeButton.classList.add('active');
      }

      Object.values(weatherContainers).forEach(container => {
        if (container) {
          container.classList.remove('active');
        }
      });

      // Show selected weather container
      if (weatherContainers[weather]) {
        weatherContainers[weather].classList.add('active');
      }
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
