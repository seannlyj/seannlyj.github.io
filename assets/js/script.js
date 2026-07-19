"use strict";

/* ============================================================================
   HEADER — translucent background once the page is scrolled
   ============================================================================ */

const header = document.querySelector("[data-header]");

const sentinel = document.getElementById("scroll-sentinel");
new IntersectionObserver(([entry]) => {
  header.classList.toggle("scrolled", !entry.isIntersecting);
}).observe(sentinel);

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
  { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
);

spyTargets.forEach((target) => spyObserver.observe(target));

/* ============================================================================
   SCROLL REVEAL — fade/slide elements in as they enter the viewport
   ============================================================================ */

const revealEls = document.querySelectorAll(".reveal");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (prefersReducedMotion) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.willChange = "opacity, transform";
          requestAnimationFrame(() => {
            entry.target.classList.add("is-visible");
            entry.target.addEventListener(
              "transitionend",
              () => {
                entry.target.style.willChange = "";
              },
              { once: true },
            );
          });
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
  );

  revealEls.forEach((el) => revealObserver.observe(el));
}

/* ============================================================================
   VIDEO LAZY-LOAD — defer video loading until each enters the viewport
   ============================================================================ */

const lazyVideos = document.querySelectorAll("video[data-lazy-video]");

if (lazyVideos.length > 0) {
  const videoObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        const source = target.querySelector("source[data-src]");
        if (source) {
          source.src = source.dataset.src;
          source.removeAttribute("data-src");
          target.load();
          target.play().catch(() => {});
        }
        observer.unobserve(target);
      });
    },
    { rootMargin: "0px 0px 300px 0px" },
  );

  lazyVideos.forEach((v) => videoObserver.observe(v));
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

// --- Work index: sticky hover-preview ---
const workPreviewImg = document.querySelector(".work-preview-img");

/** Point the sticky preview pane at a given project's thumbnail. */
const setWorkPreview = (item) => {
  if (!workPreviewImg || !item) return;
  const thumb = item.querySelector(".project-row-thumb");
  const src = thumb ? thumb.getAttribute("src") : null;
  if (src && workPreviewImg.getAttribute("src") !== src) {
    workPreviewImg.setAttribute("src", src);
  }
};

/**
 * Show only the project items matching the selected category.
 * @param {string} value - The category to filter by ("all" shows everything)
 */
const filterProjects = (value) => {
  filterItems.forEach((item) => {
    const match = value === "all" || value === item.dataset.category;
    item.classList.toggle("active", match);
  });
  // Keep the preview on a currently-visible project.
  setWorkPreview(document.querySelector(".project-item.active"));
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
      if (
        media.type === "image" &&
        media.src &&
        !preloadedImages.has(media.src)
      ) {
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
const modalMediaStack = document.getElementById("modalMediaStack");
const mobileMediaQuery = window.matchMedia("(max-width: 600px)");

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
      currentMediaArray.length,
  );

/**
 * Build the full-width vertical media stack used on mobile.
 */
const renderMediaStack = () => {
  modalMediaStack.innerHTML = "";
  currentMediaArray.forEach((media) => {
    if (media.type === "video") {
      const videoId = getYouTubeVideoId(media.src);
      if (videoId) {
        const iframe = document.createElement("iframe");
        iframe.className = "modal-stack-item modal-stack-iframe";
        iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0`;
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("allowfullscreen", "");
        modalMediaStack.appendChild(iframe);
        return;
      }
    }
    const img = document.createElement("img");
    img.className = "modal-stack-item";
    img.src = media.src;
    img.alt = media.alt || "";
    img.loading = "lazy";
    modalMediaStack.appendChild(img);
  });
};

/**
 * Choose how media is shown: a vertical stack on mobile, the carousel on
 * larger screens. Safe to re-run when the viewport crosses the breakpoint.
 */
const setupMediaView = () => {
  if (mobileMediaQuery.matches) {
    // Mobile: hide the single-item carousel + its controls, show the stack.
    modalImage.style.display = "none";
    modalVideo.style.display = "none";
    modalIframe.style.display = "none";
    if (modalIframe.src) modalIframe.src = "";
    modalNavPrev.style.display = "none";
    modalNavNext.style.display = "none";
    modalMediaIndicators.style.display = "none";
    renderMediaStack();
  } else {
    // Desktop: clear the stack (stops any embeds) and use the carousel.
    modalMediaStack.innerHTML = "";
    if (currentMediaArray.length > 0) showMedia(currentMediaIndex);
  }
};

/**
 * Populate and open the modal.
 */
const openModal = (
  title,
  subtitle,
  description,
  mediaArray,
  videoLink,
  siteLink,
) => {
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;

  // Render the comma-separated tech list as light chips (mirrors the card pattern).
  // Runs every open: clear the line above, then rebuild so projects don't stack chips.
  const techTags = (subtitle || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  modalSubtitle.textContent = "";
  techTags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "modal-tag";
    chip.textContent = tag;
    modalSubtitle.appendChild(chip);
  });

  modalDescription.innerHTML = description;

  currentMediaArray = mediaArray || [];
  currentMediaIndex = 0;
  setupMediaView();

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
        document
          .querySelector(siteLink)
          ?.scrollIntoView({ behavior: "smooth" });
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
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      modalContent.style.animation =
        "popUp 0.28s cubic-bezier(0.22, 0.61, 0.36, 1)";
    });
  });
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
  modalMediaStack.innerHTML = "";

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
    { once: true },
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

// Re-render the media view if the viewport crosses the mobile breakpoint.
mobileMediaQuery.addEventListener("change", () => {
  if (modal.style.display === "block") setupMediaView();
});

// --- Touch swipe navigation for the media carousel (desktop/tablet only) ---
const modalMediaContainer = modal.querySelector(".modal-media-container");
let mediaTouchStartX = 0;
let mediaTouchStartY = 0;

modalMediaContainer.addEventListener(
  "touchstart",
  (event) => {
    mediaTouchStartX = event.changedTouches[0].clientX;
    mediaTouchStartY = event.changedTouches[0].clientY;
  },
  { passive: true },
);

modalMediaContainer.addEventListener(
  "touchend",
  (event) => {
    if (mobileMediaQuery.matches || currentMediaArray.length < 2) return;
    const dx = event.changedTouches[0].clientX - mediaTouchStartX;
    const dy = event.changedTouches[0].clientY - mediaTouchStartY;
    // Only act on a clearly horizontal swipe so vertical scrolling still works.
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) showNextMedia();
      else showPrevMedia();
    }
  },
  { passive: true },
);

// --- Wire up each project card ---
document.querySelectorAll(".project-item").forEach((item) => {
  item.addEventListener("mouseenter", () => {
    preloadProjectMedia(item);
    setWorkPreview(item);
  });
  // Keyboard users: sync the preview when a row receives focus.
  item.addEventListener("focusin", () => setWorkPreview(item));

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

// Preload modal imagery only when a project card approaches the viewport
const preloadObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      preloadProjectMedia(target);
      observer.unobserve(target);
    });
  },
  { rootMargin: "200px" },
);

document.querySelectorAll(".project-item").forEach((item) => {
  preloadObserver.observe(item);
});
