import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import validator from 'validator';

// Define the User schema
const userSchema = new mongoose.Schema({
  fname: {
    type: String,
    required: true
  },
  lname: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid email format']
  },
  residenceId: {
    type: String,   // ID of the residence or building
    required: true,
  },
  mobile: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  admintype: {
    type: Boolean,
    default: false // Default value is `false` for non-admin users
  }
});

// Static signup method
userSchema.statics.signup = async function(fname, lname, mobile, email,residenceId, password, admintype) {
  // Validation checks
  if (!email || !password || !fname || !lname || !mobile || !residenceId) {
    throw Error('All fields must be filled');
  }
  
  // Check if the email is already registered
  const exists = await this.findOne({ email });

  if (exists) {
    throw Error('Email already in use');
  }

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create and save the user
  const user = await this.create({ fname, lname, mobile, email,residenceId, password: hashedPassword, admintype, });

  return user;
};

// Static login method
userSchema.statics.login = async function(email, password) {
  if (!email || !password) {
    throw Error('Both email and password are required');
  }

  // Find the user by email
  const user = await this.findOne({ email });
  
  if (!user) {
    throw Error('Incorrect email');
  }

  // Compare the password with the hashed version in the database
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw Error('Incorrect password');
  }

  return user;
};

// Create the User model
const User = mongoose.model('User', userSchema);

export default User;