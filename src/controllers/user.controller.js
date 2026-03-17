const db = require('../../config/database');
const { setFlash } = require('../../libs/helpers');
const bcrypt = require('bcryptjs');

// Show user profile
const showProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      setFlash(req, 'error', 'Please login to view your profile');
      return res.redirect('/auth/login');
    }
    
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      setFlash(req, 'error', 'User not found');
      return res.redirect('/');
    }
    
    // Get user's order count
    const orderCount = await db('orders').where({ user_id: userId }).count('* as count').first();
    
    res.render('user/profile', {
      title: 'My Profile - Shubham Garments',
      user,
      orderCount: parseInt(orderCount?.count || 0),
      userId
    });
  } catch (error) {
    console.error('Show profile error:', error);
    setFlash(req, 'error', 'Error loading profile');
    res.redirect('/');
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { name, email, phone } = req.body;
    
    if (!userId) {
      setFlash(req, 'error', 'Please login to update your profile');
      return res.redirect('/auth/login');
    }
    
    // Update user (only name can be updated, email and phone are not editable)
    const updateData = {};
    if (name) updateData.name = name.trim();
    
    await db('users').where({ id: userId }).update(updateData);
    
    // Update session
    if (name) {
      req.session.userName = name.trim();
    }
    
    setFlash(req, 'success', 'Profile updated successfully!');
    res.redirect('/profile');
  } catch (error) {
    console.error('Update profile error:', error);
    setFlash(req, 'error', 'Error updating profile');
    res.redirect('/profile');
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (!userId) {
      setFlash(req, 'error', 'Please login to change your password');
      return res.redirect('/auth/login');
    }
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setFlash(req, 'error', 'All password fields are required');
      return res.redirect('/profile');
    }
    
    if (newPassword !== confirmPassword) {
      setFlash(req, 'error', 'New password and confirm password do not match');
      return res.redirect('/profile');
    }
    
    if (newPassword.length < 6) {
      setFlash(req, 'error', 'Password must be at least 6 characters long');
      return res.redirect('/profile');
    }
    
    // Get user
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      setFlash(req, 'error', 'User not found');
      return res.redirect('/profile');
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      setFlash(req, 'error', 'Current password is incorrect');
      return res.redirect('/profile');
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await db('users').where({ id: userId }).update({ password: hashedPassword });
    
    setFlash(req, 'success', 'Password changed successfully!');
    res.redirect('/profile');
  } catch (error) {
    console.error('Change password error:', error);
    setFlash(req, 'error', 'Error changing password');
    res.redirect('/profile');
  }
};

module.exports = {
  showProfile,
  updateProfile,
  changePassword
};

