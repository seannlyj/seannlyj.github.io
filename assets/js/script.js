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
});

/* MODAL */


// Get the modal
var modal = document.getElementById("projectModal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// Get the modal content elements
var modalTitle = document.getElementById("modalTitle");
var modalSubtitle = document.getElementById("modalSubtitle");
var modalDescription = document.getElementById("modalDescription");
var modalImage = document.getElementById("modalImage");
var modalVideoLink = document.getElementById("modalVideoLink");
var modalSiteLink = document.getElementById("modalSiteLink");

// Function to open the modal with specific content
function openModal(title, subtitle, description, imageSrc, videoLink, siteLink) {
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle;
  modalDescription.innerHTML = description;
  modalImage.src = imageSrc;    

  //If there is a link provided, show the link button
  if(videoLink){
    modalVideoLink.href = videoLink; // Set the href attribute
    modalVideoLink.style.display = "inline";
  } else {
    modalVideoLink.style.display = "none";
  }

  if(siteLink){
    modalSiteLink.href = siteLink; // Set the href attribute
    modalSiteLink.style.display = "inline";
  } else {
    modalSiteLink.style.display = "none";
  }

  modal.style.display = "block";
  modal.querySelector('.modal-content').style.animation = 'popUp 0.2s ease';

}

// Function to close the modal with animation
function closeModal() {
  var modalContent = modal.querySelector('.modal-content');
  modalContent.style.animation = 'popDown 0.15s ease';
  modalContent.addEventListener('animationend', function() {
    modal.style.display = "none";
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

// Add event listeners to project items
document.querySelectorAll('.project-item').forEach(function(item) {
  item.addEventListener('click', function() {

    event.preventDefault(); // Prevent the default action (scrolling to the top)

    var title = item.getAttribute('data-title');
    var subtitle = item.getAttribute('data-subtitle');
    var description = item.getAttribute('data-description');
    var imageSrc = item.getAttribute('data-image');
    var videoLink = item.getAttribute('data-video-link');
    var siteLink = item.getAttribute('data-site-link');
    openModal(title, subtitle, description, imageSrc, videoLink, siteLink);
  });
});

/* END OF MODAL */

