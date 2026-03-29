const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');
const { isValidEmail, isValidPassword, validateUserRegistration } = require('../../utils/validators');
const path = require('path');
const ejs = require('ejs');
const { sendMail } = require('../../config/mailer');

// User Registration
const register = async (req, res) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;
    
    const errors = validateUserRegistration({ name, email, password, confirmPassword });
    
    if (errors.length > 0) {
      setFlash(req, 'error', errors[0]);
      return res.redirect('/auth/register');
    }
    
    // Validate phone number (10 digits)
    if (!phone || phone.trim() === '') {
      setFlash(req, 'error', 'Phone number is required');
      return res.redirect('/auth/register');
    }
    
    // Remove any non-digit characters and validate length
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFlash(req, 'error', 'Phone number must be exactly 10 digits');
      return res.redirect('/auth/register');
    }
    
    // Check if phone number already exists
    const existingPhone = await db('users').where({ phone: `+91${cleanPhone}` }).first();
    if (existingPhone) {
      setFlash(req, 'error', 'Mobile number already registered. Please log in.');
      return res.redirect('/auth/register');
    }
    
    // Check if user already exists
    const existingUser = await db('users').where({ email }).first();
    if (existingUser) {
      setFlash(req, 'error', 'Email already exists. Please log in.');
      return res.redirect('/auth/register');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token (2-step signup)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with +91 prefix (do NOT login until email is verified)
    const [user] = await db('users')
      .insert({
        name,
        email,
        password: hashedPassword,
        phone: `+91${cleanPhone}`,
        email_verified: false,
        email_verification_token: token,
        email_verification_expires_at: expiresAt
      })
      .returning('*');

    // Send verification email
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
    const verifyUrl = `${appUrl}/auth/verify-email/confirm?token=${encodeURIComponent(token)}`;

    let emailSent = false;
    try {
      const templatePath = path.join(__dirname, '../../views/emails/verify-email.ejs');
      const html = await ejs.renderFile(templatePath, {
        name: user.name,
        verifyUrl
      });

      const subject = 'Verify your email - GiftHouse';
      await sendMail({
        to: user.email,
        subject,
        html,
        text: `Hi ${user.name},\n\nPlease verify your email by clicking:\n${verifyUrl}\n\nIf you didn't create an account, ignore this email.`
      });
      emailSent = true;
    } catch (mailErr) {
      // Keep the account created so user can retry via resend.
      console.error('Verification email send failed:', mailErr);
      emailSent = false;
    }

    req.session.pendingVerificationEmail = user.email;
    if (emailSent) {
      setFlash(req, 'success', 'Registration successful! Please verify your email to login.');
    } else {
      setFlash(req, 'error', 'Registration successful, but we could not send the verification email. Please try resend verification.');
    }
    res.redirect('/auth/verify-email');
  } catch (error) {
    console.error('Registration error:', error);
    setFlash(req, 'error', 'Registration failed. Please try again.');
    res.redirect('/auth/register');
  }
};

// User Login
const login = async (req, res) => {
  try {
    const { email, password, redirectTo } = req.body;
    
    if (!email || !password) {
      setFlash(req, 'error', 'Email and password are required. Please login again.');
      return res.redirect(`/auth/login${redirectTo ? '?redirectTo=' + encodeURIComponent(redirectTo) : ''}`);
    }
    
    // Find user
    const user = await db('users').where({ email }).first();
    if (!user) {
      setFlash(req, 'error', 'Invalid email or password. Please login again.');
      return res.redirect('/auth/login');
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      setFlash(req, 'error', 'Invalid email or password. Please login again.');
      return res.redirect(`/auth/login${redirectTo ? '?redirectTo=' + encodeURIComponent(redirectTo) : ''}`);
    }

    // Enforce email verification before login
    // Backwards compatibility: if column is NULL, treat as verified.
    if (user.email_verified === false) {
      req.session.pendingVerificationEmail = user.email;
      setFlash(
        req,
        'error',
        'First, verify your account. We have sent a verification mail—please verify to login.'
      );
      return res.redirect('/auth/verify-email');
    }
    
    // Set session
    req.session.userId = user.id;
    req.session.userName = user.name;
    
    setFlash(req, 'success', 'Login successful!');
    
    // Safety check for redirect: only allow local paths
    const finalRedirect = (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) ? redirectTo : '/';
    res.redirect(finalRedirect);
  } catch (error) {
    console.error('Login error:', error);
    setFlash(req, 'error', 'Login failed. Please login again.');
    res.redirect('/auth/login');
  }
};

// Logout
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
};

// Show registration form
const showRegister = (req, res) => {
  res.render('user/register', { title: 'Register' });
};

// Show login form
const showLogin = (req, res) => {
  res.render('user/login', { 
    title: 'Login',
    redirectTo: req.query.redirectTo || ''
  });
};

// Show verify-email page
const showVerifyEmail = (req, res) => {
  const email = req.session.pendingVerificationEmail || req.query.email || null;
  res.render('user/verify-email', {
    title: 'Verify Email',
    email: email
  });
};

// Confirm email verification from token
const confirmEmailVerification = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) {
      setFlash(req, 'error', 'Invalid verification link.');
      return res.redirect('/auth/verify-email');
    }

    const user = await db('users')
      .where({ email_verification_token: token })
      .first();

    if (!user || user.email_verification_expires_at == null) {
      setFlash(req, 'error', 'Verification link expired or invalid.');
      return res.redirect('/auth/verify-email');
    }

    const expiresAt = new Date(user.email_verification_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      setFlash(req, 'error', 'Verification link expired or invalid.');
      return res.redirect('/auth/verify-email');
    }

    await db('users').where({ id: user.id }).update({
      email_verified: true,
      email_verified_at: new Date(),
      email_verification_token: null,
      email_verification_expires_at: null
    });

    req.session.pendingVerificationEmail = null;
    setFlash(req, 'success', 'Email verified successfully! You can now log in.');
    return res.redirect('/');
  } catch (e) {
    console.error('confirmEmailVerification error:', e);
    setFlash(req, 'error', 'Verification failed. Please request a new link.');
    return res.redirect('/auth/verify-email');
  }
};

// Resend verification email
const resendEmailVerification = async (req, res) => {
  try {
    const email = req.body.email || req.session.pendingVerificationEmail;
    if (!email) {
      setFlash(req, 'error', 'Email is required.');
      return res.redirect('/auth/verify-email');
    }

    const user = await db('users').where({ email }).first();
    if (!user) {
      setFlash(req, 'error', 'Account not found.');
      return res.redirect('/auth/verify-email');
    }

    if (user.email_verified === true) {
      setFlash(req, 'success', 'Your email is already verified. Please log in.');
      return res.redirect('/');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db('users').where({ id: user.id }).update({
      email_verification_token: token,
      email_verification_expires_at: expiresAt,
      email_verified: false
    });

    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
    const verifyUrl = `${appUrl}/auth/verify-email/confirm?token=${encodeURIComponent(token)}`;

    const templatePath = path.join(__dirname, '../../views/emails/verify-email.ejs');
    const html = await ejs.renderFile(templatePath, {
      name: user.name,
      verifyUrl
    });

    await sendMail({
      to: user.email,
      subject: 'Verify your email - GiftHouse',
      html,
      text: `Hi ${user.name},\n\nPlease verify your email by clicking:\n${verifyUrl}`
    });

    req.session.pendingVerificationEmail = user.email;
    setFlash(req, 'success', 'Verification email resent. Please check your inbox.');
    return res.redirect('/auth/verify-email');
  } catch (e) {
    console.error('resendEmailVerification error:', e);
    setFlash(req, 'error', 'Could not resend verification email. Try again.');
    return res.redirect('/auth/verify-email');
  }
};

module.exports = {
  register,
  login,
  logout,
  showRegister,
  showLogin,
  showVerifyEmail,
  confirmEmailVerification,
  resendEmailVerification
};

