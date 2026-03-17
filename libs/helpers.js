// Flash message helper
const setFlash = (req, type, message) => {
  req.session.flash = { type, message };
};

const getFlash = (req) => {
  const flash = req.session.flash;
  delete req.session.flash;
  return flash;
};

// Format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

// Format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

module.exports = {
  setFlash,
  getFlash,
  formatCurrency,
  formatDate
};

