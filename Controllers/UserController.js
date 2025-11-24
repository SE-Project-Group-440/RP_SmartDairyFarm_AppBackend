
import User from '../Models/UserModel.js'; 
import jwt from 'jsonwebtoken';

const createToken = (_id) => {
  return jwt.sign({ _id }, process.env.SECRET, { expiresIn: '3d' });
};

// Login a user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.login(email, password);

    // Create a token
    const token = createToken(user._id);

    res.status(200).json({ email, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Signup a user
const signupUser = async (req, res) => {
  const { email, password, fname, lname, mobile,admintype ,residenceId} = req.body;
  

  try {
    const user = await User.signup(fname, lname, mobile, email, residenceId, password,admintype);

    // Create a token
    const token = createToken(user._id);

    res.status(200).json({ email, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Sign out a user

const logoutUser = (req, res) => {
  // Check if the token is present (assuming it is sent in headers or cookies)
  const token = req.headers['authorization']?.split(' ')[1]; // Example: "Bearer token"

  if (token) {
    // Optionally, you can also add logic to invalidate the token server-side, 
    // like storing it in a blacklist if you're managing sessions.
    
    // Here we just respond with a success message
    return res.status(200).json({ message: "Logged out successfully" });
  } else {
    // If no token is present, respond with a message indicating no user was logged in
    return res.status(200).json({ message: "No user logged in" });
  }
};

const getUserDetails = async (req, res) => {
  try {
    // Since `requireAuth` middleware attaches `req.user`, we can directly use it
    const user = req.user;

    res.status(200).json({
      _id: user._id,
      email: user.email,
      residenceId: user.residenceId,
      admintype: user.admintype
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users from the database
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}


export default {loginUser,signupUser,logoutUser,getUserDetails,getAllUsers};

