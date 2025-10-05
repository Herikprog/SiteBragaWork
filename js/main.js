// Main JavaScript functionality

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize application
function initializeApp() {
    // Remove loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 2000);

    // Initialize components
    initNavigation();
    initScrollAnimations();
    initSmoothScrolling();
    initParticleEffect();
    initAdminAccess();
    
    // Load projects carousel
    loadProjects();
}

// Navigation functionality
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Active nav link highlighting
    window.addEventListener('scroll', updateActiveNavLink);
}

// Update active navigation link based on scroll position
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentSection = '';
    
    sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                
                // Trigger stagger animations for child elements
                const staggerItems = entry.target.querySelectorAll('.stagger-item');
                staggerItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.animate-on-scroll, .tech-item, .feature');
    animatedElements.forEach(el => observer.observe(el));
}

// Particle effect for hero section
function initParticleEffect() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    function createParticle() {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';
        
        hero.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 5000);
    }

    // Create particles periodically
    setInterval(createParticle, 2000);
}

// Admin access (hidden feature)
function initAdminAccess() {
    const adminLink = document.getElementById('admin-link');
    let clickCount = 0;
    let clickTimer;

    // Secret access: click logo 5 times quickly
    const logo = document.querySelector('.nav-logo');
    logo.addEventListener('click', () => {
        clickCount++;
        
        if (clickCount === 1) {
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 3000);
        }
        
        if (clickCount === 5) {
            clearTimeout(clickTimer);
            adminLink.style.opacity = '1';
            clickCount = 0;
            
            // Hide admin link after 10 seconds
            setTimeout(() => {
                adminLink.style.opacity = '0';
            }, 10000);
        }
    });
}

async function loadProjects() {
    try {
        const projects = await window.BragaWorkDB.getProjects();
        const activeProjects = projects.filter(p => p.isActive);
        displayProjects(activeProjects);
    } catch (error) {
        console.error('Erro ao carregar projetos:', error);
        displayProjects([]);
    }
}

// Display projects in carousel
function displayProjects(projects) {
    const carousel = document.getElementById('projects-carousel');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!carousel || !indicators) return;

    // Clear existing content
    carousel.innerHTML = '';
    indicators.innerHTML = '';

    if (projects.length === 0) {
        displayProjectsPlaceholder();
        return;
    }

    // Create slides
    projects.forEach((project, index) => {
        const slide = createProjectSlide(project, index);
        carousel.appendChild(slide);
        
        // Create indicator
        const indicator = document.createElement('div');
        indicator.className = `indicator ${index === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToSlide(index));
        indicators.appendChild(indicator);
    });

    // Initialize carousel if there are projects
    if (projects.length > 0) {
        initializeCarousel(projects.length);
    }
}

// Create project slide element
function createProjectSlide(project, index) {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.style.transform = `translateX(${index * 100}%)`;
    
    const isVideo = project.mediaType === 'video';
    const mediaElement = isVideo ? 
        `<video src="${project.mediaUrl}" muted></video>
         <button class="play-button" onclick="toggleVideo(this)">
             <i class="fas fa-play"></i>
         </button>` :
        `<img src="${project.mediaUrl}" alt="${project.title}">`;

    slide.innerHTML = `
        <div class="slide-content">
            <div class="slide-media">
                ${mediaElement}
            </div>
            <div class="slide-info">
                <h3>${project.title}</h3>
                <p>${project.description || 'Projeto desenvolvido com tecnologias modernas e design responsivo.'}</p>
                <div class="project-tags">
                    <span class="tag">Responsivo</span>
                    <span class="tag">Moderno</span>
                    <span class="tag">Otimizado</span>
                </div>
            </div>
        </div>
    `;
    
    return slide;
}

// Display placeholder projects when no data is available
function displayProjectsPlaceholder() {
    const carousel = document.getElementById('projects-carousel');
    const indicators = document.getElementById('carousel-indicators');
    
    if (!carousel || !indicators) return;

    const placeholderProjects = [
        {
            title: "Site Empresarial Moderno",
            description: "Website corporativo com design responsivo e otimizado para conversões.",
            mediaUrl: "https://via.placeholder.com/600x400/1a1a2e/00BFFF?text=Projeto+1",
            mediaType: "image"
        },
        {
            title: "E-commerce Avançado",
            description: "Loja virtual completa com sistema de pagamento integrado e painel administrativo.",
            mediaUrl: "https://via.placeholder.com/600x400/1a1a2e/00BFFF?text=Projeto+2",
            mediaType: "image"
        },
        {
            title: "Portal de Notícias",
            description: "Portal dinâmico com sistema de gestão de conteúdo e área de comentários.",
            mediaUrl: "https://via.placeholder.com/600x400/1a1a2e/00BFFF?text=Projeto+3",
            mediaType: "image"
        }
    ];

    displayProjects(placeholderProjects);
}

// Toggle video play/pause
function toggleVideo(button) {
    const video = button.previousElementSibling;
    const icon = button.querySelector('i');
    
    if (video.paused) {
        video.play();
        icon.className = 'fas fa-pause';
    } else {
        video.pause();
        icon.className = 'fas fa-play';
    }
}

// Utility functions
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: 'white',
        zIndex: '10001',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        backgroundColor: type === 'success' ? '#4ecdc4' : '#ff6b6b'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Format phone number
function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 11) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (value.length >= 7) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (value.length >= 3) {
        value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
    }
    
    input.value = value;
}

// Initialize phone formatting
document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            formatPhoneNumber(this);
        });
    }
});

// Modal functions
function closeModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showModal() {
    const modal = document.getElementById('success-modal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('success-modal');
    if (event.target === modal) {
        closeModal();
    }
});

// Error handling
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
});

// Performance monitoring
window.addEventListener('load', function() {
    if ('performance' in window) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    }
});