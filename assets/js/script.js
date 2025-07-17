'use strict';



// element toggle function
const elementToggleFunc = function (elem) { elem.classList.toggle("active"); }



// sidebar variables
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

// sidebar toggle functionality for mobile
sidebarBtn.addEventListener("click", function () { elementToggleFunc(sidebar); });


// custom select variables
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-selecct-value]");
const filterBtn = document.querySelectorAll("[data-filter-btn]");

select.addEventListener("click", function () { elementToggleFunc(this); });

// add event in all select items
for (let i = 0; i < selectItems.length; i++) {
  selectItems[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    elementToggleFunc(select);
    filterFunc(selectedValue);

  });
}

// filter variables
const filterItems = document.querySelectorAll("[data-filter-item]");

const filterFunc = function (selectedValue) {

  for (let i = 0; i < filterItems.length; i++) {

    if (selectedValue === "all") {
      filterItems[i].classList.add("active");
    } else if (selectedValue === filterItems[i].dataset.category) {
      filterItems[i].classList.add("active");
    } else {
      filterItems[i].classList.remove("active");
    }

  }

}

// add event in all filter button items for large screen
let lastClickedBtn = filterBtn[0];

for (let i = 0; i < filterBtn.length; i++) {

  filterBtn[i].addEventListener("click", function () {

    let selectedValue = this.innerText.toLowerCase();
    selectValue.innerText = this.innerText;
    filterFunc(selectedValue);

    lastClickedBtn.classList.remove("active");
    this.classList.add("active");
    lastClickedBtn = this;

  });

}



// contact form variables
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");

// add event to all form input field
for (let i = 0; i < formInputs.length; i++) {
  formInputs[i].addEventListener("input", function () {

    // check form validation
    if (form.checkValidity()) {
      formBtn.removeAttribute("disabled");
    } else {
      formBtn.setAttribute("disabled", "");
    }

  });
}



// page navigation variables
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

// add event to all nav link
for (let i = 0; i < navigationLinks.length; i++) {
  navigationLinks[i].addEventListener("click", function () {

    for (let i = 0; i < pages.length; i++) {
      if (this.innerHTML.toLowerCase() === pages[i].dataset.page) {
        pages[i].classList.add("active");
        navigationLinks[i].classList.add("active");
        window.scrollTo(0, 0);
      } else {
        pages[i].classList.remove("active");
        navigationLinks[i].classList.remove("active");
      }
    }

  });
}


document.addEventListener('DOMContentLoaded', ()=>{
  const navbarLinks = document.querySelectorAll('.navbar-link');
  const miniCircle = document.querySelector('.navbar-mini-circle');

  function moveMiniCircle(target){
    const rect = target.getBoundingClientRect();
    const navbarRect = target.closest('.navbar').getBoundingClientRect();
    const offsetLeft = rect.left - navbarRect.left + (rect.width / 2) - (miniCircle.offsetWidth / 2);
    miniCircle.style.transform = `translateX(${offsetLeft}px)`;
  }

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

/* MODAL */

// Image preloading system
const preloadedImages = new Map();

// Function to preload images
function preloadImage(src) {
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
}

// Preload all modal images when the page loads
function preloadAllModalImages() {
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
  
  // Log progress (optional)
  Promise.allSettled(imagePromises).then(results => {
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const total = results.length;
    console.log(`Preloaded ${successful}/${total} modal images`);
  });
}
// Get the modal
var modal = document.getElementById("projectModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// Get the modal content elements
var modalTitle = document.getElementById("modalTitle");
var modalSubtitle = document.getElementById("modalSubtitle");
var modalDescription = document.getElementById("modalDescription");
var modalImage = document.getElementById("modalImage");
var modalVideo = document.getElementById("modalVideo");
var modalIframe = document.getElementById("modalIframe");
var modalVideoLink = document.getElementById("modalVideoLink");
var modalSiteLink = document.getElementById("modalSiteLink");
var modalNavPrev = document.getElementById("modalNavPrev");
var modalNavNext = document.getElementById("modalNavNext");
var modalMediaIndicators = document.getElementById("modalMediaIndicators");

// Global variables for media gallery
var currentMediaIndex = 0;
var currentMediaArray = [];

// Function to show media at specific index
function showMedia(index) {
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
  
  // Update indicators
  updateIndicators();
  
  // Update navigation buttons
  updateNavigationButtons();
}

// Function to get YouTube video ID from URL
function getYouTubeVideoId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Function to update indicators
function updateIndicators() {
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
}

// Function to update navigation buttons
function updateNavigationButtons() {
  modalNavPrev.style.display = currentMediaArray.length > 1 ? "flex" : "none";
  modalNavNext.style.display = currentMediaArray.length > 1 ? "flex" : "none";
}

// Function to show next media
function showNextMedia() {
  if (currentMediaIndex < currentMediaArray.length - 1) {
    showMedia(currentMediaIndex + 1);
  } else {
    showMedia(0); // Loop back to first
  }
}

// Function to show previous media
function showPrevMedia() {
  if (currentMediaIndex > 0) {
    showMedia(currentMediaIndex - 1);
  } else {
    showMedia(currentMediaArray.length - 1); // Loop to last
  }
}

// Function to open the modal with specific content
function openModal(title, subtitle, description, mediaArray, videoLink, siteLink) {
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalDescription.innerHTML = description;
  
  // Set up media gallery
  currentMediaArray = mediaArray || [];
  currentMediaIndex = 0;
  
  if (currentMediaArray.length > 0) {
    showMedia(0);
  }

  // If there is a link provided, show the link button
  if(videoLink){
    modalVideoLink.href = videoLink;
    modalVideoLink.style.display = "inline";
  } else {
    modalVideoLink.style.display = "none";
  }

  if(siteLink){
    modalSiteLink.href = siteLink;
    modalSiteLink.style.display = "inline";
  } else {
    modalSiteLink.style.display = "none";
  }

  modal.style.display = "block";
  modal.querySelector('.modal-content').style.animation = 'popUp 0.2s ease';
}

// Function to close the modal with animation
function closeModal() {
  // Stop any playing videos
  if (modalIframe.src) {
    modalIframe.src = "";
  }
  if (modalVideo.src) {
    modalVideo.pause();
    modalVideo.src = "";
  }
  
  var modalContent = modal.querySelector('.modal-content');
  modalContent.style.animation = 'popDown 0.15s ease';
  modalContent.addEventListener('animationend', function() {
    modal.style.display = "none";
    // Reset media
    currentMediaArray = [];
    currentMediaIndex = 0;
  }, { once: true });
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  closeModal();
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    closeModal();
  }
}

// Navigation button event listeners
modalNavPrev.addEventListener('click', showPrevMedia);
modalNavNext.addEventListener('click', showNextMedia);

// Keyboard navigation
document.addEventListener('keydown', function(event) {
  if (modal.style.display === 'block') {
    if (event.key === 'ArrowLeft') {
      showPrevMedia();
    } else if (event.key === 'ArrowRight') {
      showNextMedia();
    } else if (event.key === 'Escape') {
      closeModal();
    }
  }
});

// Add event listeners to project items
document.querySelectorAll('.project-item').forEach(function(item) {
  // Preload images on hover for even faster loading
  item.addEventListener('mouseenter', function() {
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

  item.addEventListener('click', function() {
    event.preventDefault(); // Prevent the default action (scrolling to the top)

    var title = item.getAttribute('data-title');
    var subtitle = item.getAttribute('data-subtitle');
    var description = item.getAttribute('data-description');
    var mediaData = item.getAttribute('data-media');
    var videoLink = item.getAttribute('data-video-link');
    var siteLink = item.getAttribute('data-site-link');
    
    // Parse media data
    var mediaArray = [];
    try {
      mediaArray = JSON.parse(mediaData);
    } catch (e) {
      console.error('Error parsing media data:', e);
      // Fallback to old data-image if available
      var imageSrc = item.getAttribute('data-image');
      if (imageSrc) {
        mediaArray = [{"type": "image", "src": imageSrc, "alt": title}];
      }
    }
    
    openModal(title, subtitle, description, mediaArray, videoLink, siteLink);
  });
});

/* END OF MODAL */

