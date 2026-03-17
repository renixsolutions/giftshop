// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (min 6 characters)
const isValidPassword = (password) => {
  return password && password.length >= 6;
};

// Validate product data
const validateProduct = (data) => {
  const errors = [];
  
  if (!data.title || data.title.trim().length < 3) {
    errors.push('Title must be at least 3 characters');
  }
  
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (!data.price || isNaN(data.price) || parseFloat(data.price) <= 0) {
    errors.push('Price must be a positive number');
  }
  
  if (!data.stock || isNaN(data.stock) || parseInt(data.stock) < 0) {
    errors.push('Stock must be a non-negative number');
  }
  
  if (!data.category || data.category.trim().length === 0) {
    errors.push('Category is required');
  }
  
  return errors;
};

// Validate user registration
const validateUserRegistration = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push('Valid email is required');
  }
  
  if (!data.password || !isValidPassword(data.password)) {
    errors.push('Password must be at least 6 characters');
  }
  
  if (data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }
  
  return errors;
};

module.exports = {
  isValidEmail,
  isValidPassword,
  validateProduct,
  validateUserRegistration
};

