/**
 * Progress Components
 * Reusable progress bar primitives for Kocekku 2.0
 */

/**
 * Create a progress bar element
 * @param {Object} options
 * @param {number} options.value - Current value (0-100)
 * @param {number} options.max - Maximum value (default 100)
 * @param {string} options.size - 'sm' | 'md' | 'lg'
 * @param {string} options.color - Progress color class
 * @param {boolean} options.showLabel - Show percentage label
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function ProgressBar(options = {}) {
  const {
    value = 0,
    max = 100,
    size = 'md',
    color = 'bg-primary-600',
    showLabel = false,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `w-full ${className}`;
  
  // Calculate percentage
  const percentage = Math.min(Math.round((value / max) * 100), 100);
  
  // Determine color based on percentage if using auto-coloring
  let progressColor = color;
  if (color === 'auto') {
    if (percentage >= 100) {
      progressColor = 'bg-danger-600';
    } else if (percentage >= 90) {
      progressColor = 'bg-warning-600';
    } else if (percentage >= 70) {
      progressColor = 'bg-success-600';
    } else {
      progressColor = 'bg-primary-600';
    }
  }
  
  // Track
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };
  
  const track = document.createElement('div');
  track.className = `w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size] || sizeClasses.md}`;
  
  // Fill
  const fill = document.createElement('div');
  fill.className = `${progressColor} rounded-full transition-all duration-300 ease-out`;
  fill.style.width = `${percentage}%`;
  
  track.appendChild(fill);
  container.appendChild(track);
  
  // Label
  if (showLabel) {
    const label = document.createElement('div');
    label.className = 'flex justify-between items-center mt-1';
    
    const percentageText = document.createElement('span');
    percentageText.className = 'text-sm font-medium text-gray-700 dark:text-gray-300';
    percentageText.textContent = `${percentage}%`;
    
    label.appendChild(percentageText);
    container.appendChild(label);
  }
  
  container.progressFill = fill;
  container.setPercentage = (newPercentage) => {
    const clamped = Math.min(Math.max(newPercentage, 0), 100);
    fill.style.width = `${clamped}%`;
    
    if (color === 'auto') {
      let newColor;
      if (clamped >= 100) {
        newColor = 'bg-danger-600';
      } else if (clamped >= 90) {
        newColor = 'bg-warning-600';
      } else if (clamped >= 70) {
        newColor = 'bg-success-600';
      } else {
        newColor = 'bg-primary-600';
      }
      fill.className = fill.className.replace(/bg-(danger|warning|success|primary)-600/, newColor);
    }
  };
  
  return container;
}

/**
 * Create a circular progress indicator
 * @param {Object} options
 * @param {number} options.value - Current value (0-100)
 * @param {number} options.size - Diameter in pixels
 * @param {number} options.strokeWidth - Stroke width
 * @param {string} options.color - Stroke color
 * @param {string} options.trackColor - Track color
 * @param {boolean} options.showLabel - Show percentage in center
 * @param {string} options.className
 * @returns {HTMLElement}
 */
export function CircularProgress(options = {}) {
  const {
    value = 0,
    size = 80,
    strokeWidth = 6,
    color = '#0ea5e9',
    trackColor = '#e5e7eb',
    showLabel = true,
    className = ''
  } = options;
  
  const container = document.createElement('div');
  container.className = `relative inline-flex items-center justify-center ${className}`;
  container.style.width = `${size}px`;
  container.style.height = `${size}px`;
  
  const percentage = Math.min(Math.round(value), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  container.innerHTML = `
    <svg class="w-full h-full -rotate-90" viewBox="0 0 ${size} ${size}">
      <circle
        cx="${size/2}"
        cy="${size/2}"
        r="${radius}"
        fill="none"
        stroke="${trackColor}"
        stroke-width="${strokeWidth}"
      />
      <circle
        cx="${size/2}"
        cy="${size/2}"
        r="${radius}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
        class="transition-all duration-300 ease-out"
      />
    </svg>
    ${showLabel ? `
      <span class="absolute text-sm font-semibold text-gray-900 dark:text-white">${percentage}%</span>
    ` : ''}
  `;
  
  container.setPercentage = (newPercentage) => {
    const clamped = Math.min(Math.max(newPercentage, 0), 100);
    const newOffset = circumference - (clamped / 100) * circumference;
    const circle = container.querySelector('circle:last-of-type');
    if (circle) {
      circle.setAttribute('stroke-dashoffset', newOffset);
    }
    const label = container.querySelector('span');
    if (label) {
      label.textContent = `${clamped}%`;
    }
  };
  
  return container;
}
