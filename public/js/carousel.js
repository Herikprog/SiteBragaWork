// Carousel functionality

let currentSlide = 0;
let totalSlides = 0;
let autoSlideInterval;

// Initialize carousel
function initializeCarousel(slidesCount) {
    totalSlides = slidesCount;
    currentSlide = 0;
    
    setupCarouselControls();
    startAutoSlide();
    
    // Update carousel on window resize
    window.addEventListener('resize', updateCarouselSize);
}

// Setup carousel control buttons
function setupCarouselControls() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            previousSlide();
            resetAutoSlide();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoSlide();
        });
    }
    
    // Touch/swipe support
    const carousel = document.getElementById('projects-carousel');
    if (carousel) {
        let startX = 0;
        let isDragging = false;
        
        carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
        carousel.addEventListener('touchmove', handleTouchMove, { passive: true });
        carousel.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        // Mouse events for desktop
        carousel.addEventListener('mousedown', handleMouseDown);
        carousel.addEventListener('mousemove', handleMouseMove);
        carousel.addEventListener('mouseup', handleMouseUp);
        carousel.addEventListener('mouseleave', handleMouseUp);
        
        function handleTouchStart(e) {
            startX = e.touches[0].clientX;
            isDragging = true;
        }
        
        function handleTouchMove(e) {
            if (!isDragging) return;
            // Prevent default to avoid scrolling
            if (Math.abs(e.touches[0].clientX - startX) > 10) {
                e.preventDefault();
            }
        }
        
        function handleTouchEnd(e) {
            if (!isDragging) return;
            isDragging = false;
            
            const endX = e.changedTouches[0].clientX;
            const diffX = startX - endX;
            
            if (Math.abs(diffX) > 50) { // Minimum swipe distance
                if (diffX > 0) {
                    nextSlide();
                } else {
                    previousSlide();
                }
                resetAutoSlide();
            }
        }
        
        function handleMouseDown(e) {
            startX = e.clientX;
            isDragging = true;
            carousel.style.cursor = 'grabbing';
        }
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            e.preventDefault();
        }
        
        function handleMouseUp(e) {
            if (!isDragging) return;
            isDragging = false;
            carousel.style.cursor = 'grab';
            
            const endX = e.clientX;
            const diffX = startX - endX;
            
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    nextSlide();
                } else {
                    previousSlide();
                }
                resetAutoSlide();
            }
        }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const carousel = document.getElementById('projects-carousel');
        if (!carousel || !isElementInViewport(carousel)) return;
        
        if (e.key === 'ArrowLeft') {
            previousSlide();
            resetAutoSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
            resetAutoSlide();
        }
    });
}

// Go to specific slide
function goToSlide(slideIndex) {
    if (slideIndex < 0 || slideIndex >= totalSlides) return;
    
    currentSlide = slideIndex;
    updateCarousel();
    updateIndicators();
    updateControlButtons();
}

// Next slide
function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
    updateIndicators();
    updateControlButtons();
}

// Previous slide
function previousSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateCarousel();
    updateIndicators();
    updateControlButtons();
}

// Update carousel position
function updateCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    
    slides.forEach((slide, index) => {
        slide.style.transform = `translateX(${(index - currentSlide) * 100}%)`;
        slide.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    });
    
    // Pause all videos when slide changes
    const videos = document.querySelectorAll('.carousel-slide video');
    videos.forEach(video => {
        video.pause();
        const playButton = video.nextElementSibling;
        if (playButton && playButton.classList.contains('play-button')) {
            playButton.querySelector('i').className = 'fas fa-play';
        }
    });
}

// Update indicators
function updateIndicators() {
    const indicators = document.querySelectorAll('.indicator');
    
    indicators.forEach((indicator, index) => {
        if (index === currentSlide) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

// Update control buttons state
function updateControlButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    if (totalSlides <= 1) {
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }
    
    if (prevBtn) {
        prevBtn.style.display = 'block';
        prevBtn.disabled = false;
    }
    
    if (nextBtn) {
        nextBtn.style.display = 'block';
        nextBtn.disabled = false;
    }
}

// Auto-slide functionality
function startAutoSlide() {
    if (totalSlides <= 1) return;
    
    autoSlideInterval = setInterval(() => {
        nextSlide();
    }, 5000); // Change slide every 5 seconds
}

function stopAutoSlide() {
    if (autoSlideInterval) {
        clearInterval(autoSlideInterval);
        autoSlideInterval = null;
    }
}

function resetAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
}

// Pause auto-slide when carousel is hovered
function initAutoSlidePause() {
    const carouselContainer = document.querySelector('.carousel-container');
    
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
    }
}

// Update carousel size on window resize
function updateCarouselSize() {
    // Force recalculation of carousel positions
    setTimeout(() => {
        updateCarousel();
    }, 100);
}

// Check if element is in viewport
function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// Lazy loading for carousel images
function initCarouselLazyLoading() {
    const images = document.querySelectorAll('.carousel-slide img');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => {
        imageObserver.observe(img);
    });
}

// Preload next and previous slides for better performance
function preloadAdjacentSlides() {
    const slides = document.querySelectorAll('.carousel-slide');
    
    slides.forEach((slide, index) => {
        const img = slide.querySelector('img');
        const video = slide.querySelector('video');
        
        // Preload images/videos for current, next, and previous slides
        const shouldPreload = 
            index === currentSlide ||
            index === (currentSlide + 1) % totalSlides ||
            index === (currentSlide - 1 + totalSlides) % totalSlides;
        
        if (shouldPreload) {
            if (img && img.dataset.src) {
                img.src = img.dataset.src;
            }
            if (video && video.dataset.src) {
                video.src = video.dataset.src;
            }
        }
    });
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for projects to load before initializing auto-slide pause
    setTimeout(() => {
        initAutoSlidePause();
        initCarouselLazyLoading();
    }, 1000);
});

// Handle visibility change (pause when tab is not active)
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        stopAutoSlide();
    } else {
        resetAutoSlide();
    }
});

// Carousel performance optimization
function optimizeCarouselPerformance() {
    const carousel = document.getElementById('projects-carousel');
    if (!carousel) return;
    
    // Use transform3d for better performance
    const slides = carousel.querySelectorAll('.carousel-slide');
    slides.forEach(slide => {
        slide.style.willChange = 'transform';
        slide.style.backfaceVisibility = 'hidden';
    });
}

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', optimizeCarouselPerformance);