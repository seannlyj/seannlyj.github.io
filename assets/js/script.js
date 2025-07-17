'use strict';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Toggle the 'active' class on an element
 * @param {HTMLElement} elem - The element to toggle
 */
const elementToggleFunc = (elem) => {
  elem.classList.toggle("active");
};

// ============================================================================
// SIDEBAR FUNCTIONALITY
// ============================================================================

const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// Sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", () => {
  elementToggleFunc(sidebar);
});

// ============================================================================
// FILTER SYSTEM
// ============================================================================

const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");

// Custom select functionality
select.addEventListener("click", () => {
  elementToggleFunc(select);
});

// Add event listeners to all select items
selectItems.forEach(item => {
  item.addEventListener("click", function() {
    const selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);
  });
});

/**
 * Filter items based on selected category
 * @param {string} selectedValue - The category to filter by
 */
const filterFunc = (selectedValue) => {
  filterItems.forEach(item => {
    if (selectedValue === "all" || selectedValue === item.dataset.category) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
};

// Add event listeners to all filter button items for large screen
let lastClickedBtn = filterBtn[0];

filterBtn.forEach(btn => {
  btn.addEventListener("click", function() {
    const selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;
  });
});

// ============================================================================
// CONTACT FORM
// ============================================================================

const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// Add event listeners to all form input fields
formInputs.forEach(input => {
  input.addEventListener("input", () => {
    // Check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }
  });
});

// ============================================================================
// PAGE NAVIGATION
// ============================================================================

const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// Add event listeners to all navigation links
navigationLinks.forEach(link => {
  link.addEventListener("click", function() {
    pages.forEach((page, index) => {
      if (this.innerHTML.toLowerCase() === page.dataset.page) {
        page.classList.add("active");
        navigationLinks[index].classList.add("active");
        window.scrollTo(0, 0);
      } else {
        page.classList.remove("active");
        navigationLinks[index].classList.remove("active");
      }
    });
  });
});

// ============================================================================
// NAVBAR MINI CIRCLE ANIMATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  const navbarLinks = document.querySelectorAll('.navbar-link');
  const miniCircle = document.querySelector('.navbar-mini-circle');

  /**
   * Move the mini circle to the target element
   * @param {HTMLElement} target - The target element to move the circle to
   */
  const moveMiniCircle = (target) => {
    const rect = target.getBoundingClientRect();
    const navbarRect = target.closest('.navbar').getBoundingClientRect();
    const offsetLeft = rect.left - navbarRect.left + (rect.width / 2) - (miniCircle.offsetWidth / 2);
    miniCircle.style.transform = `translateX(${offsetLeft}px)`;
  };

  // Add event listeners to navbar links
  navbarLinks.forEach(link => {
    link.addEventListener('mouseenter', (e) => {
      moveMiniCircle(e.target);
    });

    link.addEventListener('click', (e) => {
      navbarLinks.forEach(link => link.classList.remove('active'));
      e.target.classList.add('active');
      moveMiniCircle(e.target);
    });

    link.addEventListener('mouseleave', () => {
      const activeLink = document.querySelector('.navbar-link.active');
      if (activeLink) {
        moveMiniCircle(activeLink);
      }
    });
  });

  // Initialize the position of the mini circle to the active link
  const activeLink = document.querySelector('.navbar-link.active');
  if (activeLink) {
    moveMiniCircle(activeLink);
  }

  // Adjust the mini circle position on window resize
  window.addEventListener('resize', () => {
    const activeLink = document.querySelector('.navbar-link.active');
    if (activeLink) {
      moveMiniCircle(activeLink);
    }
  });

  // Preload all modal images for instant display
  preloadAllModalImages();
});

// ============================================================================
// MODAL SYSTEM
// ============================================================================

// Image preloading system
const preloadedImages = new Map();

/**
 * Preload an image and store it in the cache
 * @param {string} src - The image source URL
 * @returns {Promise<HTMLImageElement>} Promise that resolves with the loaded image
 */
const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to preload image: ${src}`);
      reject(new Error(`Failed to preload image: ${src}`));
    };
    img.src = src;
  });
};

/**
 * Preload all modal images when the page loads
 */
const preloadAllModalImages = () => {
  const projectItems = document.querySelectorAll('.project-item');
  const imagePromises = [];
  
  projectItems.forEach(item => {
    // Parse the data-media attribute to get all images
    const mediaData = item.getAttribute('data-media');
    if (mediaData) {
      try {
        const mediaArray = JSON.parse(mediaData);
        mediaArray.forEach(media => {
          if (media.type === 'image' && media.src && !preloadedImages.has(media.src)) {
            imagePromises.push(preloadImage(media.src));
          }
        });
      } catch (e) {
        console.warn('Error parsing media data for project item:', e);
      }
    }
    
    // Also check for legacy data-image attribute as fallback
    const imageSrc = item.getAttribute('data-image');
    if (imageSrc && !preloadedImages.has(imageSrc)) {
      imagePromises.push(preloadImage(imageSrc));
    }
  });
  
  // Log progress
  Promise.allSettled(imagePromises).then(results => {
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const total = results.length;
    console.log(`Preloaded ${successful}/${total} modal images`);
  });
};

// Modal DOM elements
const modal = document.getElementById("projectModal");
const span = document.getElementsByClassName("close")[0];
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalDescription = document.getElementById("modalDescription");
const modalImage = document.getElementById("modalImage");
const modalVideo = document.getElementById("modalVideo");
const modalIframe = document.getElementById("modalIframe");
const modalVideoLink = document.getElementById("modalVideoLink");
const modalSiteLink = document.getElementById("modalSiteLink");
const modalNavPrev = document.getElementById("modalNavPrev");
const modalNavNext = document.getElementById("modalNavNext");
const modalMediaIndicators = document.getElementById("modalMediaIndicators");

// Global variables for media gallery
let currentMediaIndex = 0;
let currentMediaArray = [];

/**
 * Extract YouTube video ID from URL
 * @param {string} url - The YouTube URL
 * @returns {string|null} The video ID or null if not found
 */
const getYouTubeVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Show media at specific index
 * @param {number} index - The index of the media to show
 */
const showMedia = (index) => {
  if (currentMediaArray.length === 0) return;
  
  currentMediaIndex = index;
  const media = currentMediaArray[currentMediaIndex];
  
  // Hide all media elements initially
  modalImage.style.display = "none";
  modalVideo.style.display = "none";
  modalIframe.style.display = "none";
  
  if (media.type === "image") {
    modalImage.src = media.src;
    modalImage.alt = media.alt;
    modalImage.style.display = "block";
  } else if (media.type === "video") {
    // Check if it's a YouTube video
    const videoId = getYouTubeVideoId(media.src);
    if (videoId) {
      // Embed YouTube video
      modalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      modalIframe.alt = media.alt;
      modalIframe.style.display = "block";
    } else {
      // For other video types, show thumbnail with link
      modalImage.src = `https://img.youtube.com/vi/${getYouTubeVideoId(media.src)}/maxresdefault.jpg`;
      modalImage.alt = media.alt;
      modalImage.style.display = "block";
    }
  }
  
  updateIndicators();
  updateNavigationButtons();
};

/**
 * Update the media indicators
 */
const updateIndicators = () => {
  modalMediaIndicators.innerHTML = '';
  
  // Hide indicators if there's only one media item
  if (currentMediaArray.length <= 1) {
    modalMediaIndicators.style.display = 'none';
    return;
  }
  
  // Show indicators if there are multiple media items
  modalMediaIndicators.style.display = 'flex';
  
  currentMediaArray.forEach((media, index) => {
    const indicator = document.createElement('div');
    indicator.className = `modal-indicator ${index === currentMediaIndex ? 'active' : ''}`;
    indicator.addEventListener('click', () => showMedia(index));
    modalMediaIndicators.appendChild(indicator);
  });
};

/**
 * Update navigation buttons visibility
 */
const updateNavigationButtons = () => {
  const hasMultipleItems = currentMediaArray.length > 1;
  modalNavPrev.style.display = hasMultipleItems ? "flex" : "none";
  modalNavNext.style.display = hasMultipleItems ? "flex" : "none";
};

/**
 * Show next media item
 */
const showNextMedia = () => {
  if (currentMediaIndex < currentMediaArray.length - 1) {
    showMedia(currentMediaIndex + 1);
  } else {
    showMedia(0); // Loop back to first
  }
};

/**
 * Show previous media item
 */
const showPrevMedia = () => {
  if (currentMediaIndex > 0) {
    showMedia(currentMediaIndex - 1);
  } else {
    showMedia(currentMediaArray.length - 1); // Loop to last
  }
};

/**
 * Open the modal with specific content
 * @param {string} title - The modal title
 * @param {string} subtitle - The modal subtitle
 * @param {string} description - The modal description
 * @param {Array} mediaArray - Array of media objects
 * @param {string} videoLink - Optional video link
 * @param {string} siteLink - Optional site link
 */
const openModal = (title, subtitle, description, mediaArray, videoLink, siteLink) => {
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalDescription.innerHTML = description;
  
  // Set up media gallery
  currentMediaArray = mediaArray || [];
  currentMediaIndex = 0;
  
  if (currentMediaArray.length > 0) {
    showMedia(0);
  }

  // Handle video link
  if (videoLink) {
    modalVideoLink.href = videoLink;
    modalVideoLink.style.display = "inline";
  } else {
    modalVideoLink.style.display = "none";
  }

  // Handle site link
  if (siteLink) {
    modalSiteLink.href = siteLink;
    modalSiteLink.style.display = "inline";
  } else {
    modalSiteLink.style.display = "none";
  }

  modal.style.display = "block";
  modal.querySelector('.modal-content').style.animation = 'popUp 0.2s ease';
};

/**
 * Close the modal with animation
 */
const closeModal = () => {
  // Stop any playing videos
  if (modalIframe.src) {
    modalIframe.src = "";
  }
  if (modalVideo.src) {
    modalVideo.pause();
    modalVideo.src = "";
  }
  
  const modalContent = modal.querySelector('.modal-content');
  modalContent.style.animation = 'popDown 0.15s ease';
  modalContent.addEventListener('animationend', () => {
    modal.style.display = "none";
    // Reset media
    currentMediaArray = [];
    currentMediaIndex = 0;
  }, { once: true });
};

// Modal event listeners
span.onclick = closeModal;

window.onclick = (event) => {
  if (event.target === modal) {
    closeModal();
  }
};

// Navigation button event listeners
modalNavPrev.addEventListener('click', showPrevMedia);
modalNavNext.addEventListener('click', showNextMedia);

// Keyboard navigation
document.addEventListener('keydown', (event) => {
  if (modal.style.display === 'block') {
    switch (event.key) {
      case 'ArrowLeft':
        showPrevMedia();
        break;
      case 'ArrowRight':
        showNextMedia();
        break;
      case 'Escape':
        closeModal();
        break;
    }
  }
});

// ============================================================================
// PROJECT ITEMS EVENT LISTENERS
// ============================================================================

document.querySelectorAll('.project-item').forEach(item => {
  // Preload images on hover for even faster loading
  item.addEventListener('mouseenter', () => {
    // Parse the data-media attribute to preload all images
    const mediaData = item.getAttribute('data-media');
    if (mediaData) {
      try {
        const mediaArray = JSON.parse(mediaData);
        mediaArray.forEach(media => {
          if (media.type === 'image' && media.src && !preloadedImages.has(media.src)) {
            preloadImage(media.src);
          }
        });
      } catch (e) {
        console.warn('Error parsing media data for hover preload:', e);
      }
    }
    
    // Also check for legacy data-image attribute as fallback
    const imageSrc = item.getAttribute('data-image');
    if (imageSrc && !preloadedImages.has(imageSrc)) {
      preloadImage(imageSrc);
    }
  });

  // Handle project item clicks
  item.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent the default action (scrolling to the top)

    const title = item.getAttribute('data-title');
    const subtitle = item.getAttribute('data-subtitle');
    const description = item.getAttribute('data-description');
    const mediaData = item.getAttribute('data-media');
    const videoLink = item.getAttribute('data-video-link');
    const siteLink = item.getAttribute('data-site-link');
    
    // Parse media data
    let mediaArray = [];
    try {
      mediaArray = JSON.parse(mediaData);
    } catch (e) {
      console.error('Error parsing media data:', e);
      // Fallback to old data-image if available
      const imageSrc = item.getAttribute('data-image');
      if (imageSrc) {
        mediaArray = [{"type": "image", "src": imageSrc, "alt": title}];
      }
    }
    
    openModal(title, subtitle, description, mediaArray, videoLink, siteLink);
  });
});

