const API_BASE_URL = "https://crop-price-prediction-model-11.onrender.com";
let priceChart = null;
let historicalData = [];
let predictedData = [];

// Price Alert System
let activeAlerts = [];

// Initialize tables and chart
function initializeElements() {
    try {
        // Wait for Chart.js to be available
        if (typeof Chart === 'undefined') {
            console.error("Chart.js not loaded yet");
            return false;
        }

        // Initialize chart if not already initialized
        if (!priceChart) {
            const canvas = document.getElementById('priceChart');
            if (!canvas) {
                console.error("Chart canvas not found");
                return false;
            }

            const ctx = canvas.getContext('2d');
            priceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Historical Prices',
                            data: [],
                            borderColor: '#2196F3',
                            backgroundColor: 'rgba(33, 150, 243, 0.1)',
                            tension: 0.1,
                            pointRadius: 3
                        },
                        {
                            label: 'Predicted Prices',
                            data: [],
                            borderColor: '#FF9800',
                            backgroundColor: 'rgba(255, 152, 0, 0.1)',
                            borderDash: [5, 5],
                            tension: 0.1,
                            pointRadius: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            },
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Price (₹)'
                            },
                            beginAtZero: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Commodity Price Trends & Forecast',
                            font: {
                                size: 16
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            });
        }
        
        return true;
    } catch (error) {
        console.error("Error initializing elements:", error);
        return false;
    }
}

// Slideshow functionality
function initializeSlideshow() {
    const slides = document.querySelectorAll('.slide');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    // Change slide every 5 seconds
    setInterval(nextSlide, 5000);
}

// Fetch historical prices
async function fetchPrices() {
    showLoading();
    try {
        let commodity = document.getElementById("commodity").value;
        
        if (!commodity) {
            showNotification('Please select a commodity', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/get_prices?commodity=${encodeURIComponent(commodity)}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('auth-modal').style.display = 'block';
                throw new Error('Please log in to access this feature');
            }
            throw new Error('Failed to fetch historical prices');
        }
        
        const data = await response.json();
        
        const tableBody = document.querySelector("#priceTable tbody");
        if (!tableBody) {
            showNotification('Error: Price table not found', 'error');
            return;
        }
        
        if (data.length === 0 || data.error) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="2" class="empty-message">
                        ${data.error || 'No data available for this commodity'}
                    </td>
                </tr>
            `;
            return;
        }
        
        // Store data for chart
        historicalData = data;
        
        // Update table
        let tableContent = '';
        data.forEach(item => {
            tableContent += `
                <tr>
                    <td>${formatDate(item.date)}</td>
                    <td>₹${item.price.toFixed(2)}</td>
                </tr>
            `;
        });
        tableBody.innerHTML = tableContent;
        
        // Update chart
        updateChart();

        // Update analytics if we have both historical and predicted data
        if (historicalData.length > 0 && predictedData.length > 0) {
            updateAnalytics(historicalData, predictedData);
        }
    } catch (error) {
        console.error('Error fetching prices:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Predict future prices
async function getPredictions() {
    showLoading();
    try {
        let commodity = document.getElementById("commodity").value;
        
        if (!commodity) {
            showNotification('Please select a commodity', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/predict_prices?commodity=${encodeURIComponent(commodity)}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('auth-modal').style.display = 'block';
                throw new Error('Please log in to access this feature');
            }
            throw new Error('Failed to predict prices');
        }
        
        const data = await response.json();
        
        const tableBody = document.querySelector("#predictionTable tbody");
        if (!tableBody) {
            showNotification('Error: Prediction table not found', 'error');
            return;
        }
        
        if (data.error) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="2" class="empty-message">
                        ${data.error}
                    </td>
                </tr>
            `;
            return;
        }
        
        if (!data.monthly_predictions || data.monthly_predictions.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="2" class="empty-message">
                        No predictions available for this commodity
                    </td>
                </tr>
            `;
            return;
        }
        
        // Store data for chart
        predictedData = data.monthly_predictions;
        
        // Update table with monthly predictions
        let tableContent = '';
        data.monthly_predictions.forEach(pred => {
            tableContent += `
                <tr>
                    <td>${formatDate(pred.date)}</td>
                    <td>₹${pred.price.toFixed(2)}</td>
                </tr>
            `;
        });
        tableBody.innerHTML = tableContent;
        
        // Update chart
        updateChart();

        // Update analytics if we have both historical and predicted data
        if (historicalData.length > 0 && predictedData.length > 0) {
            updateAnalytics(historicalData, predictedData);
        }
    } catch (error) {
        console.error('Error getting predictions:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Update chart with historical and predicted data
function updateChart() {
    if (!priceChart) {
        console.error("Chart not initialized");
        return;
    }

    const labels = [];
    const historicalPrices = [];
    const predictedPrices = [];

    // Add historical data
    if (historicalData && historicalData.length > 0) {
        historicalData.forEach(item => {
            labels.push(formatDate(item.date));
            historicalPrices.push(item.price);
            predictedPrices.push(null);
        });
    }

    // Add predicted data
    if (predictedData && predictedData.length > 0) {
        predictedData.forEach(item => {
            labels.push(formatDate(item.date));
            historicalPrices.push(null);
            predictedPrices.push(item.price);
        });
    }

    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = historicalPrices;
    priceChart.data.datasets[1].data = predictedPrices;
    priceChart.update();
}

// Helper function to format dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short'
    });
}

// Loading state functions
function showLoading() {
    const element = document.getElementById('loadingSpinner');
    if (element) {
        element.style.display = 'flex';
    }
}

function hideLoading() {
    const element = document.getElementById('loadingSpinner');
    if (element) {
        element.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    
    // Initialize slideshow
    initializeSlideshow();

    // Setup event listeners
    const commoditySelect = document.getElementById('commodity');
    if (commoditySelect) {
        commoditySelect.addEventListener('change', async function() {
            const commodity = this.value;
            if (commodity) {
                try {
                    await fetchPrices();
                    await getPredictions();
                } catch (error) {
                    console.error('Error updating data:', error);
                    showNotification('Error updating data', 'error');
                }
            }
        });
    }

    // Check authentication status on page load
    checkAuthStatus();

    // Modal functionality
    const modal = document.getElementById('auth-modal');
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const getStartedBtn = document.getElementById('get-started');
    
    // Open modal
    loginBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    // Open modal from get started button
    getStartedBtn.addEventListener('click', () => {
        modal.style.display = 'block';
    });
    
    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Deactivate all tabs
            tabBtns.forEach(tb => tb.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Activate current tab
            btn.classList.add('active');
            document.getElementById(`${tabId}-form`).classList.add('active');
        });
    });
    
    // Handle form submissions
    document.getElementById('login').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        // Call login API
        loginUser(username, password);
    });
    
    // Add password strength indicator
    const signupPassword = document.getElementById('signup-password');
    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';
    strengthIndicator.innerHTML = `
        <div class="strength-meter">
            <div class="strength-meter-fill"></div>
        </div>
        <div class="strength-text"></div>
        <ul class="strength-feedback"></ul>
    `;
    signupPassword.parentNode.insertBefore(strengthIndicator, signupPassword.nextSibling);

    // Monitor password input
    signupPassword.addEventListener('input', function() {
        const result = checkPasswordStrength(this.value);
        const meterFill = strengthIndicator.querySelector('.strength-meter-fill');
        const strengthText = strengthIndicator.querySelector('.strength-text');
        const feedbackList = strengthIndicator.querySelector('.strength-feedback');

        // Update meter
        meterFill.style.width = `${(result.strength / 5) * 100}%`;
        meterFill.className = 'strength-meter-fill ' + result.text.toLowerCase();

        // Update text
        strengthText.textContent = result.text;
        strengthText.className = 'strength-text ' + result.text.toLowerCase();

        // Update feedback
        feedbackList.innerHTML = result.feedback.map(item => `<li>${item}</li>`).join('');
    });

    // Monitor username input
    const signupUsername = document.getElementById('signup-username');
    const usernameError = document.createElement('div');
    usernameError.className = 'username-error';
    signupUsername.parentNode.insertBefore(usernameError, signupUsername.nextSibling);

    signupUsername.addEventListener('input', function() {
        const result = validateUsername(this.value);
        if (!result.valid) {
            usernameError.textContent = result.message;
            usernameError.style.display = 'block';
        } else {
            usernameError.style.display = 'none';
        }
    });

    // Update form submission to include validation
    document.getElementById('signup').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const contact = document.getElementById('signup-contact').value;
        
        // Validate username
        const usernameValidation = validateUsername(username);
        if (!usernameValidation.valid) {
            showNotification(usernameValidation.message, 'error');
            return;
        }

        // Validate password
        const passwordStrength = checkPasswordStrength(password);
        if (passwordStrength.strength < 3) {
            showNotification('Password is too weak. Please make it stronger.', 'error');
            return;
        }

        // Validate contact (email or phone)
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        const isPhone = /^\d{10}$/.test(contact);
        
        if (!isEmail && !isPhone) {
            showNotification('Please enter a valid email address or 10-digit phone number', 'error');
            return;
        }
        
        // Call signup API if validation passes
        registerUser(username, password, contact);
    });

    // Handle sign out
    document.getElementById('signoutBtn').addEventListener('click', function() {
        fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success || data.message) {
                // Clear any stored data
                historicalData = [];
                predictedData = [];
                
                // Clear tables
                const priceTableBody = document.querySelector("#priceTable tbody");
                const predictionTableBody = document.querySelector("#predictionTable tbody");
                if (priceTableBody) priceTableBody.innerHTML = '';
                if (predictionTableBody) predictionTableBody.innerHTML = '';
                
                // Clear chart
                if (priceChart) {
                    priceChart.data.labels = [];
                    priceChart.data.datasets[0].data = [];
                    priceChart.data.datasets[1].data = [];
                    priceChart.update();
                }
                
                // Update UI elements
               showNotification('Registration successful! Please login.', 'success');
               document.getElementById('auth-modal').style.display = 'none';
                
                showNotification('Successfully signed out', 'success');
            } else {
                showNotification('Error signing out', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error signing out', 'error');
            
            // Still clear UI state even if there's an error
            document.getElementById('loginBtn').style.display = 'block';
            document.getElementById('signoutBtn').style.display = 'none';
            document.querySelector('.predictor-card').style.display = 'none';
        });
    });

    // Dark mode functionality
    const darkModeToggle = document.getElementById('darkModeToggle');
    const icon = darkModeToggle.querySelector('i');

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateIcon(savedTheme === 'dark');
    }

    darkModeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme === 'dark');
    });

    function updateIcon(isDark) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Add smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add hover effect to cards
    document.querySelectorAll('.predictor-card, .metrics-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Price Alert System
    document.getElementById('alert-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const commodity = document.getElementById('commodity').value;
        const price = document.getElementById('alert-price').value;
        const condition = document.getElementById('alert-condition').value;
        const notificationMethod = document.getElementById('alert-notification').value;

        if (!commodity) {
            showNotification('Please select a commodity first', 'error');
            return;
        }

        const alert = {
            id: Date.now(),
            commodity,
            price: parseFloat(price),
            condition,
            notificationMethod,
            status: 'active'
        };

        activeAlerts.push(alert);
        updateAlertsList();
        showNotification('Price alert set successfully', 'success');
        this.reset();
    });

    function updateAlertsList() {
        const alertsList = document.getElementById('alertsList');
        if (!alertsList) return;

        alertsList.innerHTML = activeAlerts.length === 0 ? 
            '<p class="empty-message">No active alerts</p>' :
            activeAlerts.map(alert => `
                <div class="alert-item">
                    <div class="alert-info">
                        <strong>${alert.commodity}</strong>
                        <p>${alert.condition === 'above' ? 'Above' : 'Below'} ₹${alert.price}</p>
                        <small>Notification via: ${alert.notificationMethod}</small>
                    </div>
                    <div class="alert-actions">
                        <button onclick="deleteAlert(${alert.id})" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
    }

    function deleteAlert(alertId) {
        activeAlerts = activeAlerts.filter(alert => alert.id !== alertId);
        updateAlertsList();
        showNotification('Alert deleted successfully', 'success');
    }
});

// Authentication Functions
function loginUser(username, password) {
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        handleLoginSuccess(data);
    })
    .catch(error => {
        console.error("Login error:", error);
        showNotification(error.message || 'Login failed. Please try again.', 'error');
    });
}

function registerUser(username, password, contact) {
    fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, contact })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        // Show OTP verification form
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('otp-verification').style.display = 'block';
        showNotification('Verification code sent to your contact', 'success');
    })
    .catch(error => {
        console.error("Registration error:", error);
        showNotification(error.message || 'Registration failed. Please try again.', 'error');
    });
}

function verifyOTP(contact, otp) {
    fetch(`${API_BASE_URL}/verify_otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ contact, otp })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        showNotification('Verification successful! Please log in.', 'success');
        // Switch to login tab
        document.querySelector('[data-tab="login"]').click();
    })
    .catch(error => {
        console.error("Verification error:", error);
        showNotification(error.message || 'Verification failed. Please try again.', 'error');
    });
}

function resendOTP() {
    const contact = document.getElementById('signup-contact').value;
    fetch(`${API_BASE_URL}/resend_otp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ contact })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        showNotification('New verification code sent', 'success');
    })
    .catch(error => {
        console.error("Resend OTP error:", error);
        showNotification(error.message || 'Failed to resend code. Please try again.', 'error');
    });
}

function logoutUser() {
    fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        showNotification('Logged out successfully!', 'success');
        updateLoginButton();
        checkPredictionAccess();
    })
    .catch(error => {
        console.error("Logout error:", error);
        showNotification('Logout failed. Please try again.', 'error');
    });
}

function checkAuthStatus() {
    fetch(`${API_BASE_URL}/check_auth`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('signoutBtn').style.display = 'block';
            document.querySelector('.predictor-card').style.display = 'block';
        } else {
            document.getElementById('loginBtn').style.display = 'block';
            document.getElementById('signoutBtn').style.display = 'none';
            document.querySelector('.predictor-card').style.display = 'none';
        }
        checkPredictionAccess();
    })
    .catch(error => {
        console.error("Auth check error:", error);
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('signoutBtn').style.display = 'none';
        document.querySelector('.predictor-card').style.display = 'none';
    });
}

function updateLoginButton(username = null) {
    const loginBtn = document.getElementById('loginBtn');
    if (username) {
        loginBtn.textContent = username;
        loginBtn.onclick = logoutUser;
    } else {
        loginBtn.textContent = 'Login';
        loginBtn.onclick = () => document.getElementById('auth-modal').style.display = 'block';
    }
}

function checkPredictionAccess() {
    const predictorCard = document.querySelector('.predictor-card');
    const getStartedBtn = document.getElementById('get-started');
    
    fetch(`${API_BASE_URL}/check_auth`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.authenticated) {
            predictorCard.style.display = 'block';
            if (getStartedBtn) {
                getStartedBtn.style.display = 'none';
            }
        } else {
            predictorCard.style.display = 'none';
            if (getStartedBtn) {
                getStartedBtn.style.display = 'block';
                getStartedBtn.onclick = () => document.getElementById('auth-modal').style.display = 'block';
            }
        }
    })
    .catch(error => {
        console.error("Access check error:", error);
        predictorCard.style.display = 'none';
    });
}

// API calls with credentials
function fetchHistoricalPrices(commodity) {
    return fetch(`${API_BASE_URL}/get_prices?commodity=${encodeURIComponent(commodity)}`, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('auth-modal').style.display = 'block';
                throw new Error('Please log in to access this feature');
            }
            throw new Error('Failed to fetch historical prices');
        }
        return response.json();
    });
}

function fetchPredictions(commodity) {
    return fetch(`${API_BASE_URL}/predict_prices?commodity=${encodeURIComponent(commodity)}`, {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                document.getElementById('auth-modal').style.display = 'block';
                throw new Error('Please log in to access this feature');
            }
            throw new Error('Failed to predict prices');
        }
        return response.json();
    });
}

// Update the login success handler to show sign out button
function handleLoginSuccess(data) {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('loginBtn').style.display = 'none';
    document.getElementById('signoutBtn').style.display = 'block';
    document.querySelector('.predictor-card').style.display = 'block';
    showNotification('Successfully logged in', 'success');
}

// Password strength checker
function checkPasswordStrength(password) {
    let strength = 0;
    const feedback = [];

    // Length check
    if (password.length < 8) {
        feedback.push('At least 8 characters');
    } else {
        strength += 1;
    }

    // Uppercase check
    if (!/[A-Z]/.test(password)) {
        feedback.push('At least one uppercase letter');
    } else {
        strength += 1;
    }

    // Lowercase check
    if (!/[a-z]/.test(password)) {
        feedback.push('At least one lowercase letter');
    } else {
        strength += 1;
    }

    // Number check
    if (!/[0-9]/.test(password)) {
        feedback.push('At least one number');
    } else {
        strength += 1;
    }

    // Special character check
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        feedback.push('At least one special character');
    } else {
        strength += 1;
    }

    return {
        strength: strength,
        feedback: feedback,
        text: strength === 0 ? 'Very Weak' :
              strength === 1 ? 'Weak' :
              strength === 2 ? 'Fair' :
              strength === 3 ? 'Good' :
              strength === 4 ? 'Strong' : 'Very Strong'
    };
}

// Username validation
function validateUsername(username) {
    // Username should not start with a number
    if (/^[0-9]/.test(username)) {
        return { valid: false, message: 'Username cannot start with a number' };
    }

    // Username should be at least 3 characters long
    if (username.length < 3) {
        return { valid: false, message: 'Username must be at least 3 characters long' };
    }

    // Username should only contain letters, numbers, and underscores
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(username)) {
        return { valid: false, message: 'Username can only contain letters, numbers, and underscores' };
    }

    return { valid: true };
}

// Advanced Analytics Functions
function updateAnalytics(historicalData, predictedData) {
    if (!historicalData || !predictedData) return;

    // Calculate price changes
    const priceChanges = calculatePriceChanges(historicalData);
    updatePriceChanges(priceChanges);

    // Calculate best time to sell
    const sellRecommendation = calculateBestTimeToSell(historicalData, predictedData);
    updateSellRecommendations(sellRecommendation);

    // Update seasonal analysis
    updateSeasonalAnalysis(historicalData);

    // Update market insights
    updateMarketInsights(historicalData, predictedData);
}

function calculatePriceChanges(historicalData) {
    try {
        if (!historicalData || historicalData.length === 0) {
            return { thirtyDay: 0, ninetyDay: 0, ytd: 0 };
        }

        const today = new Date();
        const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));
        const ninetyDaysAgo = new Date(today.setDate(today.getDate() - 90));
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        const latest = historicalData[historicalData.length - 1].price;
        const thirtyDayOld = findClosestPrice(historicalData, thirtyDaysAgo);
        const ninetyDayOld = findClosestPrice(historicalData, ninetyDaysAgo);
        const yearStart = findClosestPrice(historicalData, startOfYear);

        return {
            thirtyDay: calculatePercentageChange(thirtyDayOld, latest),
            ninetyDay: calculatePercentageChange(ninetyDayOld, latest),
            ytd: calculatePercentageChange(yearStart, latest)
        };
    } catch (error) {
        console.error('Error calculating price changes:', error);
        return { thirtyDay: 0, ninetyDay: 0, ytd: 0 };
    }
}

function updatePriceChanges(changes) {
    document.getElementById('thirtyDayChange').textContent = formatPercentage(changes.thirtyDay);
    document.getElementById('thirtyDayChange').className = `trend-value ${changes.thirtyDay >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('ninetyDayChange').textContent = formatPercentage(changes.ninetyDay);
    document.getElementById('ninetyDayChange').className = `trend-value ${changes.ninetyDay >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('ytdChange').textContent = formatPercentage(changes.ytd);
    document.getElementById('ytdChange').className = `trend-value ${changes.ytd >= 0 ? 'positive' : 'negative'}`;
}

function calculateBestTimeToSell(historicalData, predictedData) {
    try {
        if (!historicalData || !predictedData || historicalData.length === 0 || predictedData.length === 0) {
            return {
                optimalPeriod: 'Not enough data',
                priceRange: '₹0.00 - ₹0.00',
                confidence: 0
            };
        }

        // Analyze seasonal patterns
        const monthlyAverages = calculateMonthlyAverages(historicalData);
        const bestMonths = findBestSellingMonths(monthlyAverages);
        
        // Analyze predicted prices
        const highestPredicted = findHighestPredictedPrice(predictedData);
        
        // Calculate confidence score based on historical accuracy
        const confidence = calculatePredictionConfidence(historicalData, predictedData);
        
        return {
            optimalPeriod: bestMonths.length > 0 ? bestMonths.join(', ') : 'Not enough data',
            priceRange: `₹${highestPredicted.min.toFixed(2)} - ₹${highestPredicted.max.toFixed(2)}`,
            confidence: confidence
        };
    } catch (error) {
        console.error('Error calculating best time to sell:', error);
        return {
            optimalPeriod: 'Error in calculation',
            priceRange: '₹0.00 - ₹0.00',
            confidence: 0
        };
    }
}

function updateSellRecommendations(recommendation) {
    document.getElementById('optimalSellPeriod').textContent = recommendation.optimalPeriod;
    document.getElementById('expectedPriceRange').textContent = recommendation.priceRange;
    document.getElementById('confidenceMeter').style.width = `${recommendation.confidence}%`;
}

function updateSeasonalAnalysis(historicalData) {
    const seasonalChart = document.getElementById('seasonalChart');
    if (!seasonalChart) return;

    const monthlyAverages = calculateMonthlyAverages(historicalData);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (window.seasonalAnalysisChart) {
        window.seasonalAnalysisChart.destroy();
    }

    window.seasonalAnalysisChart = new Chart(seasonalChart, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Average Price',
                data: monthlyAverages,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Price Averages'
                }
            }
        }
    });
}

function updateMarketInsights(historicalData, predictedData) {
    // Calculate price volatility
    const volatility = calculateVolatility(historicalData);
    document.getElementById('volatilityMetric').textContent = 
        volatility < 0.1 ? 'Low' :
        volatility < 0.2 ? 'Moderate' : 'High';

    // Calculate seasonal strength
    const seasonalStrength = calculateSeasonalStrength(historicalData);
    document.getElementById('seasonalStrength').textContent = 
        seasonalStrength < 0.3 ? 'Weak' :
        seasonalStrength < 0.6 ? 'Moderate' : 'Strong';
}

// Helper Functions
function findClosestPrice(data, targetDate) {
    try {
        if (!data || data.length === 0) return 0;

        return data.reduce((prev, curr) => {
            const prevDate = new Date(prev.date);
            const currDate = new Date(curr.date);
            return Math.abs(currDate - targetDate) < Math.abs(prevDate - targetDate) ? curr : prev;
        }).price;
    } catch (error) {
        console.error('Error finding closest price:', error);
        return 0;
    }
}

function calculatePercentageChange(oldValue, newValue) {
    try {
        if (oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    } catch (error) {
        console.error('Error calculating percentage change:', error);
        return 0;
    }
}

function formatPercentage(value) {
    const formatted = value.toFixed(1);
    return `${formatted > 0 ? '+' : ''}${formatted}%`;
}

function calculateMonthlyAverages(data) {
    try {
        if (!data || data.length === 0) return Array(12).fill(0);

        const monthlyData = Array(12).fill(0).map(() => ({ sum: 0, count: 0 }));
        
        data.forEach(item => {
            const month = new Date(item.date).getMonth();
            monthlyData[month].sum += item.price;
            monthlyData[month].count++;
        });
        
        return monthlyData.map(month => month.count > 0 ? month.sum / month.count : 0);
    } catch (error) {
        console.error('Error calculating monthly averages:', error);
        return Array(12).fill(0);
    }
}

function findBestSellingMonths(monthlyAverages) {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const threshold = Math.max(...monthlyAverages) * 0.9;
    
    return months.filter((_, index) => monthlyAverages[index] >= threshold);
}

function findHighestPredictedPrice(predictedData) {
    try {
        if (!predictedData || predictedData.length === 0) {
            return { min: 0, max: 0 };
        }

        const prices = predictedData.map(item => item.price);
        return {
            min: Math.min(...prices),
            max: Math.max(...prices)
        };
    } catch (error) {
        console.error('Error finding highest predicted price:', error);
        return { min: 0, max: 0 };
    }
}

function calculatePredictionConfidence(historicalData, predictedData) {
    try {
        if (!historicalData || !predictedData || historicalData.length === 0 || predictedData.length === 0) {
            return 0;
        }

        // Calculate volatility and seasonal strength
        const volatility = calculateVolatility(historicalData);
        const seasonalStrength = calculateSeasonalStrength(historicalData);
        
        // Combine factors to get confidence score (0-100)
        return Math.min(100, Math.max(0, (1 - volatility) * 70 + seasonalStrength * 30));
    } catch (error) {
        console.error('Error calculating prediction confidence:', error);
        return 0;
    }
}

function calculateVolatility(data) {
    try {
        if (!data || data.length === 0) return 1; // High volatility for no data

        const prices = data.map(item => item.price);
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
        return Math.sqrt(variance) / mean;
    } catch (error) {
        console.error('Error calculating volatility:', error);
        return 1;
    }
}

function calculateSeasonalStrength(data) {
    try {
        if (!data || data.length === 0) return 0;

        const monthlyAverages = calculateMonthlyAverages(data);
        const mean = monthlyAverages.reduce((a, b) => a + b, 0) / 12;
        if (mean === 0) return 0;

        const maxDeviation = Math.max(...monthlyAverages.map(price => Math.abs(price - mean)));
        return maxDeviation / mean;
    } catch (error) {
        console.error('Error calculating seasonal strength:', error);
        return 0;
    }
}