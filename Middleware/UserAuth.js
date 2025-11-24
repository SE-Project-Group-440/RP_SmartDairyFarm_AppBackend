import User from '../Models/UserModel.js'; // Ensure the correct path and extension
import jwt from 'jsonwebtoken';

const requireAuth = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authorization.split(' ')[1];

  try {
    const { _id } = jwt.verify(token, process.env.SECRET);

    // Find the user based on the decoded token
    const user = await User.findById(_id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Attach user details to the request object
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: 'Request is not authorized' });
  }
};

export default requireAuth; // Ensure the correct function name
