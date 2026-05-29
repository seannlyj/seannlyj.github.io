"use strict";

/* ============================================================================
   HEADER — translucent background once the page is scrolled
   ============================================================================ */

const header = document.querySelector("[data-header]");

const updateHeader = () => {
  header.classList.toggle("scrolled", window.scrollY > 8);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

/* ============================================================================
   MOBILE NAVIGATION
   ============================================================================ */

const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = document.querySelectorAll("[data-nav-link]");

const setNav = (open) => {
  nav.classList.toggle("open", open);
  navToggle.classList.toggle("open", open);
  navToggle.setAttribute("aria-expanded", String(open));
};

navToggle.addEventListener("click", () => {
  setNav(!nav.classList.contains("open"));
});

// Close the mobile menu after choosing a destination
navLinks.forEach((link) => {
  link.addEventListener("click", () => setNav(false));
});

/* ============================================================================
   SCROLL SPY — highlight the nav link for the section in view
   ============================================================================ */

const spyTargets = document.querySelectorAll("section[id], footer[id]");

const setActiveLink = (id) => {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
  });
};

const spyObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setActiveLink(entry.target.id);
    });
  },
  { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
);

spyTargets.forEach((target) => spyObserver.observe(target));

/* ============================================================================
   SCROLL REVEAL — fade/slide elements in as they enter the viewport
   ============================================================================ */

const revealEls = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
  );

  revealEls.forEach((el) => revealObserver.observe(el));
}

/* ============================================================================
   FOOTER YEAR
   ============================================================================ */

const yearEl = document.querySelector("[data-year]");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ============================================================================
   PORTFOLIO FILTER
   ============================================================================ */

const filterBtns = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");

/**
 * Show only the project items matching the selected category.
 * @param {string} value - The category to filter by ("all" shows everything)
 */
const filterProjects = (value) => {
  filterItems.forEach((item) => {
    const match = value === "all" || value === item.dataset.category;
    item.classList.toggle("active", match);
  });
};

let activeFilterBtn = filterBtns[0];

filterBtns.forEach((btn) => {
  btn.addEventListener("click", function () {
    filterProjects(this.textContent.trim().toLowerCase());

    if (activeFilterBtn) activeFilterBtn.classList.remove("active");
    this.classList.add("active");
    activeFilterBtn = this;
  });
});

/* ============================================================================
   PROJECT MODAL
   ============================================================================ */

// --- Image preloading cache for instant modal display ---
const preloadedImages = new Map();

const preloadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      preloadedImages.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });

const preloadProjectMedia = (item) => {
  const mediaData = item.getAttribute("data-media");
  if (!mediaData) return;
  try {
    JSON.parse(mediaData).forEach((media) => {
      if (media.type === "image" && media.src && !preloadedImages.has(media.src)) {
        preloadImage(media.src).catch(() => {});
      }
    });
  } catch (e) {
    console.warn("Error parsing media data:", e);
  }
};

// --- Modal DOM references ---
const modal = document.getElementById("projectModal");
const closeBtn = modal.querySelector(".close");
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

let currentMediaIndex = 0;
let currentMediaArray = [];

/**
 * Extract a YouTube video ID from any of its URL formats.
 */
const getYouTubeVideoId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

/**
 * Render the media item at a given index.
 */
const showMedia = (index) => {
  if (currentMediaArray.length === 0) return;

  currentMediaIndex = index;
  const media = currentMediaArray[currentMediaIndex];

  modalImage.style.display = "none";
  modalVideo.style.display = "none";
  modalIframe.style.display = "none";

  if (media.type === "image") {
    modalImage.src = media.src;
    modalImage.alt = media.alt || "";
    modalImage.style.display = "block";
  } else if (media.type === "video") {
    const videoId = getYouTubeVideoId(media.src);
    if (videoId) {
      modalIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
      modalIframe.style.display = "block";
    } else {
      modalImage.src = media.src;
      modalImage.alt = media.alt || "";
      modalImage.style.display = "block";
    }
  }

  updateIndicators();
  updateNavigationButtons();
};

const updateIndicators = () => {
  modalMediaIndicators.innerHTML = "";

  if (currentMediaArray.length <= 1) {
    modalMediaIndicators.style.display = "none";
    return;
  }

  modalMediaIndicators.style.display = "flex";

  currentMediaArray.forEach((media, index) => {
    const indicator = document.createElement("button");
    indicator.type = "button";
    indicator.className = `modal-indicator ${
      index === currentMediaIndex ? "active" : ""
    }`;
    indicator.setAttribute("aria-label", `View media ${index + 1}`);
    indicator.addEventListener("click", () => showMedia(index));
    modalMediaIndicators.appendChild(indicator);
  });
};

const updateNavigationButtons = () => {
  const hasMultiple = currentMediaArray.length > 1;
  modalNavPrev.style.display = hasMultiple ? "grid" : "none";
  modalNavNext.style.display = hasMultiple ? "grid" : "none";
};

const showNextMedia = () =>
  showMedia((currentMediaIndex + 1) % currentMediaArray.length);

const showPrevMedia = () =>
  showMedia(
    (currentMediaIndex - 1 + currentMediaArray.length) %
      currentMediaArray.length
  );

/**
 * Populate and open the modal.
 */
const openModal = (title, subtitle, description, mediaArray, videoLink, siteLink) => {
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalDescription.innerHTML = description;

  currentMediaArray = mediaArray || [];
  currentMediaIndex = 0;
  if (currentMediaArray.length > 0) showMedia(0);

  // Optional "Video Demo" link
  if (videoLink) {
    modalVideoLink.href = videoLink;
    modalVideoLink.style.display = "inline-flex";
  } else {
    modalVideoLink.style.display = "none";
  }

  // Optional "Learn More" link (supports internal #section navigation)
  if (siteLink) {
    modalSiteLink.href = siteLink;
    modalSiteLink.style.display = "inline-flex";
    modalSiteLink.onclick = null;

    if (siteLink.startsWith("#")) {
      modalSiteLink.removeAttribute("target");
      modalSiteLink.onclick = (e) => {
        e.preventDefault();
        closeModal();
        document.querySelector(siteLink)?.scrollIntoView({ behavior: "smooth" });
      };
    } else {
      modalSiteLink.setAttribute("target", "_blank");
    }
  } else {
    modalSiteLink.style.display = "none";
  }

  modal.style.display = "block";
  document.body.style.overflow = "hidden";

  // Re-trigger the entrance animation on every open
  const modalContent = modal.querySelector(".modal-content");
  modalContent.style.animation = "none";
  void modalContent.offsetWidth; // force reflow
  modalContent.style.animation = "popUp 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)";
};

/**
 * Close the modal and stop any playing media.
 */
const closeModal = () => {
  if (modalIframe.src) modalIframe.src = "";
  if (modalVideo.src) {
    modalVideo.pause();
    modalVideo.removeAttribute("src");
  }

  const modalContent = modal.querySelector(".modal-content");
  modalContent.style.animation = "popDown 0.16s ease forwards";
  modalContent.addEventListener(
    "animationend",
    () => {
      modal.style.display = "none";
      modalContent.style.animation = "";
      document.body.style.overflow = "";
      currentMediaArray = [];
      currentMediaIndex = 0;
    },
    { once: true }
  );
};

// --- Modal events ---
closeBtn.addEventListener("click", closeModal);
modalNavPrev.addEventListener("click", showPrevMedia);
modalNavNext.addEventListener("click", showNextMedia);

modal.addEventListener("click", (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (modal.style.display !== "block") return;
  if (event.key === "Escape") closeModal();
  if (event.key === "ArrowLeft") showPrevMedia();
  if (event.key === "ArrowRight") showNextMedia();
});

// --- Wire up each project card ---
document.querySelectorAll(".project-item").forEach((item) => {
  item.addEventListener("mouseenter", () => preloadProjectMedia(item));

  item.addEventListener("click", (event) => {
    event.preventDefault();

    const title = item.getAttribute("data-title");
    const subtitle = item.getAttribute("data-subtitle");
    const description = item.getAttribute("data-description");
    const videoLink = item.getAttribute("data-video-link");
    const siteLink = item.getAttribute("data-site-link");

    let mediaArray = [];
    try {
      mediaArray = JSON.parse(item.getAttribute("data-media"));
    } catch (e) {
      console.error("Error parsing media data:", e);
    }

    openModal(title, subtitle, description, mediaArray, videoLink, siteLink);
  });
});

// Preload all modal imagery once the rest of the page has loaded
window.addEventListener("load", () => {
  document.querySelectorAll(".project-item").forEach(preloadProjectMedia);
});
